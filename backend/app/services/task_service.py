from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden, not_found
from app.ml.pipeline import get_classifier
from app.models.entities import Task, TaskClassification, User
from app.models.enums import RoutingStatus, TaskStatus, UserRole
from app.schemas.task import TaskAssigneeUpdate, TaskCreate, TaskRead, TaskStatusUpdate, TaskUpdate, UserBrief
from app.services.routing_service import auto_route, rationale_summary
from app.services.workload_service import refresh_department


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
    task.priority = clf.predicted_priority
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
    auto_route(db, task)
    refresh_department(db, department_id)

    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def list_tasks(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 20,
    status: TaskStatus | None = None,
    assigned_to_id: UUID | None = None,
) -> tuple[list[TaskRead], int]:
    query = db.query(Task).filter(Task.organization_id == user.organization_id)
    if user.role == UserRole.employee:
        query = query.filter((Task.assigned_to_id == user.id) | (Task.created_by_id == user.id))
    elif user.role == UserRole.manager:
        query = query.filter(Task.department_id == user.department_id)
    if status:
        query = query.filter(Task.status == status)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
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
    if user.role == UserRole.employee:
        raise forbidden()
    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.deadline is not None:
        task.deadline = data.deadline
    if data.effort_points is not None:
        task.effort_points = data.effort_points
    db.commit()
    db.refresh(task)
    return _task_to_read(db, task)


def update_status(db: Session, user: User, task_id: UUID, data: TaskStatusUpdate) -> TaskRead:
    task = db.get(Task, task_id)
    if not task:
        raise not_found()
    if user.role == UserRole.employee and task.assigned_to_id != user.id:
        raise forbidden()
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
