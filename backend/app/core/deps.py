from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import forbidden, unauthorized
from app.core.security import decode_token
from app.db.session import get_db
from app.models.entities import User
from app.models.enums import UserRole

security = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User:
    if not credentials:
        raise unauthorized()
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise unauthorized()
    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized()
    user = db.get(User, UUID(user_id))
    if not user or not user.is_active:
        raise unauthorized("User inactive or not found")
    return user


def require_roles(*roles: UserRole):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles and user.role != UserRole.admin:
            raise forbidden()
        return user

    return checker


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]
