from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.exceptions import forbidden, not_found
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth_service import create_user_password_hash
from app.models.entities import User

router = APIRouter()
AdminUser = Annotated[User, Depends(require_roles(UserRole.admin))]


@router.get("", response_model=list[UserRead])
def list_users(
    db: DbSession,
    user: CurrentUser,
    department_id: UUID | None = Query(default=None),
) -> list[UserRead]:
    if user.role not in (UserRole.admin, UserRole.manager):
        raise forbidden()
    query = db.query(User).filter(User.organization_id == user.organization_id)
    if user.role == UserRole.manager:
        query = query.filter(User.department_id == user.department_id)
    if department_id:
        query = query.filter(User.department_id == department_id)
    return [UserRead.model_validate(u) for u in query.order_by(User.full_name).all()]


@router.post("", response_model=UserRead, status_code=201)
def create_user(data: UserCreate, db: DbSession, admin: AdminUser) -> UserRead:
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        from app.core.exceptions import AppHTTPException

        raise AppHTTPException(status.HTTP_409_CONFLICT, "CONFLICT", "Email already exists")
    new_user = User(
        organization_id=admin.organization_id,
        department_id=data.department_id,
        email=data.email,
        password_hash=create_user_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
        max_active_tasks=data.max_active_tasks,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserRead.model_validate(new_user)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: UUID, db: DbSession, current: CurrentUser) -> UserRead:
    target = db.get(User, user_id)
    if not target:
        raise not_found()
    if current.role not in (UserRole.admin, UserRole.manager) and current.id != user_id:
        raise forbidden()
    return UserRead.model_validate(target)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: UUID, data: UserUpdate, db: DbSession, current: CurrentUser) -> UserRead:
    target = db.get(User, user_id)
    if not target:
        raise not_found()
    is_self = current.id == user_id
    if current.role != UserRole.admin and not is_self:
        raise forbidden()
    if data.role is not None and current.role != UserRole.admin:
        raise forbidden()
    if data.is_active is not None and current.role != UserRole.admin:
        raise forbidden()
    if data.full_name is not None:
        target.full_name = data.full_name
    if data.role is not None:
        target.role = data.role
    if data.department_id is not None and current.role == UserRole.admin:
        target.department_id = data.department_id
    if data.is_active is not None:
        target.is_active = data.is_active
    if data.max_active_tasks is not None and current.role == UserRole.admin:
        target.max_active_tasks = data.max_active_tasks
    if data.password:
        target.password_hash = create_user_password_hash(data.password)
    db.commit()
    db.refresh(target)
    return UserRead.model_validate(target)


@router.delete("/{user_id}", response_model=UserRead)
def deactivate_user(user_id: UUID, db: DbSession, _: AdminUser) -> UserRead:
    target = db.get(User, user_id)
    if not target:
        raise not_found()
    target.is_active = False
    db.commit()
    db.refresh(target)
    return UserRead.model_validate(target)
