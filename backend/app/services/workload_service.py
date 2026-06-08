from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import Task, User, WorkloadSnapshot
from app.models.enums import TaskStatus


ACTIVE_STATUSES = (TaskStatus.assigned, TaskStatus.in_progress)


def compute_user_load(db: Session, user_id: UUID) -> tuple[int, int]:
    row = (
        db.query(
            func.count(Task.id),
            func.coalesce(func.sum(Task.effort_points), 0),
        )
        .filter(Task.assigned_to_id == user_id, Task.status.in_(ACTIVE_STATUSES))
        .one()
    )
    return int(row[0]), int(row[1])


def refresh_user_snapshot(db: Session, user_id: UUID) -> WorkloadSnapshot:
    count, effort = compute_user_load(db, user_id)
    snap = WorkloadSnapshot(user_id=user_id, active_task_count=count, effort_sum=effort, computed_at=datetime.now(timezone.utc))
    db.add(snap)
    db.flush()
    return snap


def refresh_department(db: Session, department_id: UUID) -> None:
    users = db.query(User).filter(User.department_id == department_id, User.is_active.is_(True)).all()
    for user in users:
        refresh_user_snapshot(db, user.id)


def get_department_workload(db: Session, department_id: UUID | None, org_id: UUID) -> list[dict]:
    query = db.query(User).filter(User.organization_id == org_id, User.is_active.is_(True))
    if department_id:
        query = query.filter(User.department_id == department_id)
    users = query.order_by(User.full_name).all()
    result = []
    for user in users:
        count, effort = compute_user_load(db, user.id)
        result.append(
            {
                "user_id": user.id,
                "full_name": user.full_name,
                "active_task_count": count,
                "effort_sum": effort,
                "max_active_tasks": user.max_active_tasks,
            }
        )
    return result


def get_workload_for_user(db: Session, user: User, department_id: UUID | None = None) -> tuple[UUID | None, list[dict]]:
    from app.models.enums import UserRole

    if user.role == UserRole.employee:
        if department_id is not None:
            if department_id != user.department_id:
                from app.core.exceptions import forbidden

                raise forbidden()
            return user.department_id, get_department_workload(db, user.department_id, user.organization_id)
        count, effort = compute_user_load(db, user.id)
        return user.department_id, [
            {
                "user_id": user.id,
                "full_name": user.full_name,
                "active_task_count": count,
                "effort_sum": effort,
                "max_active_tasks": user.max_active_tasks,
            }
        ]
    if user.role == UserRole.admin:
        scope_dept = department_id
    else:
        scope_dept = department_id or user.department_id
    return scope_dept, get_department_workload(db, scope_dept, user.organization_id)
