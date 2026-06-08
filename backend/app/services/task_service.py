from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import AppHTTPException, forbidden, not_found
from app.ml.pipeline import get_classifier
from app.models.entities import RoutingDecision, Task, TaskClassification, TaskComment, User
from app.models.enums import RoutingStatus, TaskPriority, TaskStatus, UserRole
from app.schemas.task import (
    BulkTaskRequest,
    BulkTaskResult,
    HeatmapUserEntry,
    TaskAssigneeUpdate,
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
    TaskUpdate,
    UserBrief,
)
from app.services.routing_service import auto_route, rationale_summary
from app.services.workload_service import compute_user_load, refresh_department

ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.open: {TaskStatus.assigned, TaskStatus.in_progress},
    TaskStatus.assigned: {TaskStatus.in_progress, TaskStatus.completed, TaskStatus.open},
    TaskStatus.in_progress: {TaskStatus.completed, TaskStatus.assigned},
    TaskStatus.completed: {TaskStatus.in_progress},
}


def _can_view_task(user: User, task: Task) -> bool:
    if user.role in (UserRole.admin, UserRole.manager):
        return True
    return task.assigned_to_id == user.id or task.created_by_id == user.id


def _task_to_read(db: Session, task: Task) -> TaskRead:
    assigned = db.get(User, task.assigned_to_id) if task.assigned_to_id else None
    latest_cls = (
        db.query(TaskClassification)
        .filter(TaskClassification.task_id == task.id)
        .order_by(TaskClassification.created_at.desc())
        .first()
    )
    from app.models.entities import RoutingDecision

    latest_route = (
        db.query(RoutingDecision)
        .filter(RoutingDecision.task_id == task.id)
        .order_by(RoutingDecision.created_at.desc())
        .first()
    )
    data = TaskRead.model_validate(task)
    if assigned:
        data.assigned_to = UserBrief(id=assigned.id, full_name=assigned.full_name)
    if latest_cls:
        from app.schemas.task import ClassificationRead

        data.classification = ClassificationRead.model_validate(latest_cls)
    if latest_route:
        from app.schemas.task import RoutingRead

        data.routing = RoutingRead(
            status=latest_route.status,
            score=latest_route.score,
            processing_time_ms=latest_route.processing_time_ms,
            rationale_summary=rationale_summary(latest_route.rationale),
            applied_user_id=latest_route.applied_user_id,
        )
    return data


def create_task(db: Session, user: User, data: TaskCreate) -> TaskRead:
    department_id = data.department_id or user.department_id
    task = Task(
        organization_id=user.organization_id,
        department_id=department_id,
        created_by_id=user.id,
        title=data.title,
        description=data.description,
        intake_channel=data.intake_channel,
        effort_points=data.effort_points,
        deadline=data.deadline,
        status=TaskStatus.open,
    )
    db.add(task)
    db.flush()

    clf = get_classifier().classify(task.title, task.description)
    if data.priority is not None:
        task.priority = data.priority
        task.priority_manual = True
    else:
        task.priority = clf.predicted_priority
        task.priority_manual = False
    db.add(
        TaskClassification(
            task_id=task.id,
            category=clf.category,
            predicted_priority=clf.predicted_priority,
            confidence=clf.confidence,
            model_version=clf.model_version,
            processing_time_ms=clf.processing_time_ms,
        )
    )

    refresh_department(db, department_id)
    if data.assignee_id:
        if user.role not in (UserRole.admin, UserRole.manager):
            raise forbidden()
        assignee = db.get(User, data.assignee_id)
        if not assignee or not assignee.is_active or assignee.organization_id != user.organization_id:
            raise not_found("Assignee not found")
        if user.role == UserRole.manager and assignee.department_id != user.department_id:
            raise forbidden()
        task.assigned_to_id = assignee.id
        task.status = TaskStatus.assigned
        task.auto_routed = False
        db.add(
            RoutingDecision(
                task_id=task.id,
                recommended_user_id=assignee.id,
                applied_user_id=assignee.id,
                status=RoutingStatus.overridden,
                score=None,
                rationale={"reason": "manual_assign_on_create"},
                processing_time_ms=0,
            )
        )
    else:
        auto_route(db, task)
    refresh_department(db, department_id)

    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def _validate_transition(current: TaskStatus, new: TaskStatus) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if new not in allowed:
        raise AppHTTPException(400, "BAD_REQUEST", f"Invalid status transition: {current.value} -> {new.value}")


def _scoped_task_query(db: Session, user: User):
    query = db.query(Task).filter(Task.organization_id == user.organization_id)
    if user.role == UserRole.employee:
        query = query.filter((Task.assigned_to_id == user.id) | (Task.created_by_id == user.id))
    elif user.role == UserRole.manager:
        query = query.filter(Task.department_id == user.department_id)
    return query


def list_tasks(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 20,
    status: TaskStatus | None = None,
    assigned_to_id: UUID | None = None,
    search: str | None = None,
    priority: TaskPriority | None = None,
    category: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
) -> tuple[list[TaskRead], int]:
    query = _scoped_task_query(db, user)
    if status:
        query = query.filter(Task.status == status)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    if priority:
        query = query.filter(Task.priority == priority)
    if category:
        query = query.filter(Task.classifications.any(TaskClassification.category == category))
    if created_from:
        query = query.filter(Task.created_at >= created_from)
    if created_to:
        query = query.filter(Task.created_at <= created_to)
    total = query.count()
    tasks = (
        query.order_by(Task.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_task_to_read(db, t) for t in tasks], total


def get_task(db: Session, user: User, task_id: UUID) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise not_found("Task not found")
    if not _can_view_task(user, task):
        raise forbidden()
    return _task_to_read(db, task)


def update_task(db: Session, user: User, task_id: UUID, data: TaskUpdate) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise not_found()
    is_privileged = user.role in (UserRole.admin, UserRole.manager)
    is_creator = task.created_by_id == user.id
    is_assignee = task.assigned_to_id == user.id
    if data.status is not None:
        if not is_privileged and not is_assignee:
            raise forbidden()
    elif not is_privileged and not is_creator:
        raise forbidden()
    if (data.title is not None or data.description is not None or data.effort_points is not None) and not is_privileged:
        raise forbidden()
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.deadline is not None:
        task.deadline = data.deadline
    if data.effort_points is not None:
        task.effort_points = data.effort_points
    if data.priority is not None:
        task.priority = data.priority
    if data.status is not None:
        if user.role == UserRole.employee and task.assigned_to_id != user.id:
            raise forbidden()
        _validate_transition(task.status, data.status)
        task.status = data.status
        if data.status == TaskStatus.completed:
            task.completed_at = datetime.now(timezone.utc)
        refresh_department(db, task.department_id)
    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def update_status(db: Session, user: User, task_id: UUID, data: TaskStatusUpdate) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise not_found()
    if user.role == UserRole.employee and task.assigned_to_id != user.id:
        raise forbidden()
    _validate_transition(task.status, data.status)
    task.status = data.status
    if data.status == TaskStatus.completed:
        task.completed_at = datetime.now(timezone.utc)
    refresh_department(db, task.department_id)
    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def update_assignee(db: Session, user: User, task_id: UUID, data: TaskAssigneeUpdate) -> TaskRead:
    if user.role not in (UserRole.admin, UserRole.manager):
        raise forbidden()
    task = db.get(Task, task_id)
    if not task:
        raise not_found()
    assignee = db.get(User, data.assignee_id)
    if not assignee or not assignee.is_active:
        raise not_found("Assignee not found")
    task.assigned_to_id = assignee.id
    task.status = TaskStatus.assigned
    task.auto_routed = False
    from app.models.entities import RoutingDecision

    db.add(
        RoutingDecision(
            task_id=task.id,
            recommended_user_id=assignee.id,
            applied_user_id=assignee.id,
            status=RoutingStatus.overridden,
            score=None,
            rationale={"reason": "manual_override"},
            processing_time_ms=0,
        )
    )
    refresh_department(db, task.department_id)
    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def _can_delete_task(user: User, task: Task) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.manager:
        if task.department_id != user.department_id:
            raise forbidden()
        return
    if user.role == UserRole.employee:
        if task.created_by_id != user.id or task.status != TaskStatus.open:
            raise forbidden("You can only delete tasks you created yourself.")
        return
    raise forbidden()


def delete_task(db: Session, user: User, task_id: UUID) -> None:
    task = db.get(Task, task_id)
    if not task:
        raise not_found()
    _can_delete_task(user, task)
    department_id = task.department_id
    db.query(TaskComment).filter(TaskComment.task_id == task.id).delete()
    db.query(TaskClassification).filter(TaskClassification.task_id == task.id).delete()
    db.query(RoutingDecision).filter(RoutingDecision.task_id == task.id).delete()
    db.delete(task)
    refresh_department(db, department_id)
    db.commit()


def bulk_tasks(db: Session, user: User, data: BulkTaskRequest) -> BulkTaskResult:
    if user.role not in (UserRole.admin, UserRole.manager):
        raise forbidden()
    succeeded: list[UUID] = []
    failed: list[UUID] = []
    for task_id in data.task_ids:
        try:
            if data.action == "delete":
                delete_task(db, user, task_id)
            elif data.action == "status" and data.status:
                update_status(db, user, task_id, TaskStatusUpdate(status=data.status))
            elif data.action == "assign" and data.assignee_id:
                update_assignee(db, user, task_id, TaskAssigneeUpdate(assignee_id=data.assignee_id))
            else:
                failed.append(task_id)
                continue
            succeeded.append(task_id)
        except AppHTTPException:
            failed.append(task_id)
    return BulkTaskResult(succeeded=succeeded, failed=failed)


def get_heatmap(db: Session, user: User) -> list[HeatmapUserEntry]:
    if user.role != UserRole.admin:
        raise forbidden()
    from app.models.entities import Department

    users = (
        db.query(User)
        .filter(User.organization_id == user.organization_id)
        .all()
    )
    dept_map = {
        d.id: d.name
        for d in db.query(Department).filter(Department.organization_id == user.organization_id).all()
    }
    result = []
    for u in users:
        count, effort = compute_user_load(db, u.id)
        load_pct = round((count / max(u.max_active_tasks, 1)) * 100, 1)
        result.append(
            HeatmapUserEntry(
                user_id=u.id,
                full_name=u.full_name,
                department_id=u.department_id,
                department_name=dept_map.get(u.department_id, "-"),
                role=u.role,
                is_active=u.is_active,
                active_task_count=count,
                effort_sum=effort,
                max_active_tasks=u.max_active_tasks,
                load_percent=load_pct,
            )
        )
    result.sort(key=lambda entry: entry.load_percent, reverse=True)
    return result
