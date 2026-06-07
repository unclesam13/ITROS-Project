from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import forbidden, not_found
from app.models.entities import Task, TaskComment, User
from app.schemas.task import CommentCreate, CommentRead
from app.services.task_service import _can_view_task


def list_comments(db: Session, user: User, task_id: UUID) -> list[CommentRead]:
    task = db.get(Task, task_id)
    if not task:
        raise not_found("Task not found")
    if not _can_view_task(user, task):
        raise forbidden()
    rows = (
        db.query(TaskComment, User.full_name)
        .join(User, User.id == TaskComment.user_id)
        .filter(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .all()
    )
    return [
        CommentRead(
            id=comment.id,
            body=comment.body,
            user_id=comment.user_id,
            author_name=full_name,
            created_at=comment.created_at,
        )
        for comment, full_name in rows
    ]


def add_comment(db: Session, user: User, task_id: UUID, data: CommentCreate) -> CommentRead:
    task = db.get(Task, task_id)
    if not task:
        raise not_found("Task not found")
    if not _can_view_task(user, task):
        raise forbidden()
    comment = TaskComment(task_id=task_id, user_id=user.id, body=data.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentRead(
        id=comment.id,
        body=comment.body,
        user_id=comment.user_id,
        author_name=user.full_name,
        created_at=comment.created_at,
    )
