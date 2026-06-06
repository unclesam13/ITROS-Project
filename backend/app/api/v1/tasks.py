from uuid import UUID

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.models.enums import TaskStatus
from app.schemas.task import TaskAssigneeUpdate, TaskCreate, TaskListResponse, TaskRead, TaskStatusUpdate, TaskUpdate
from app.services import task_service

router = APIRouter()


@router.post("", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.create_task(db, user, data)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: DbSession,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: TaskStatus | None = None,
    assigned_to_id: UUID | None = None,
) -> TaskListResponse:
    items, total = task_service.list_tasks(db, user, page, page_size, status, assigned_to_id)
    return TaskListResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.get_task(db, user, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: UUID, data: TaskUpdate, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.update_task(db, user, task_id, data)


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status(
    task_id: UUID, data: TaskStatusUpdate, db: DbSession, user: CurrentUser
) -> TaskRead:
    return task_service.update_status(db, user, task_id, data)


@router.patch("/{task_id}/assignee", response_model=TaskRead)
def update_assignee(
    task_id: UUID, data: TaskAssigneeUpdate, db: DbSession, user: CurrentUser
) -> TaskRead:
    return task_service.update_assignee(db, user, task_id, data)
