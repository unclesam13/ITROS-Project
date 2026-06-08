from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.models.enums import TaskPriority, TaskStatus
from app.schemas.task import (
    BulkTaskRequest,
    BulkTaskResult,
    CommentCreate,
    CommentRead,
    TaskAssigneeUpdate,
    TaskCreate,
    TaskListResponse,
    TaskRead,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services import comment_service, task_service

router = APIRouter()


@router.post("", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.create_task(db, user, data)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: DbSession,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: TaskStatus | None = None,
    assigned_to_id: UUID | None = Query(default=None, alias="assignee_id"),
    search: str | None = None,
    priority: TaskPriority | None = None,
    category: str | None = None,
    created_from: datetime | None = Query(default=None, alias="from"),
    created_to: datetime | None = Query(default=None, alias="to"),
) -> TaskListResponse:
    items, total = task_service.list_tasks(
        db,
        user,
        page,
        page_size,
        status,
        assigned_to_id,
        search,
        priority,
        category,
        created_from,
        created_to,
    )
    return TaskListResponse(items=items, page=page, page_size=page_size, total=total)


@router.post("/bulk", response_model=BulkTaskResult)
def bulk_task_actions(data: BulkTaskRequest, db: DbSession, user: CurrentUser) -> BulkTaskResult:
    return task_service.bulk_tasks(db, user, data)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.get_task(db, user, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: UUID, data: TaskUpdate, db: DbSession, user: CurrentUser) -> TaskRead:
    return task_service.update_task(db, user, task_id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: UUID, db: DbSession, user: CurrentUser) -> None:
    task_service.delete_task(db, user, task_id)


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


@router.get("/{task_id}/comments", response_model=list[CommentRead])
def list_comments(task_id: UUID, db: DbSession, user: CurrentUser) -> list[CommentRead]:
    return comment_service.list_comments(db, user, task_id)


@router.post("/{task_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: UUID, data: CommentCreate, db: DbSession, user: CurrentUser
) -> CommentRead:
    return comment_service.add_comment(db, user, task_id, data)
