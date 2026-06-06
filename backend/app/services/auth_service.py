from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import unauthorized
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.entities import RefreshToken, User
from app.schemas.auth import LoginRequest, TokenResponse


def login(db: Session, data: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise unauthorized()
    return _issue_tokens(db, user)


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    token_hash = hash_token(refresh_token)
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
        .first()
    )
    if not record or record.expires_at < datetime.now(timezone.utc):
        raise unauthorized("Invalid refresh token")
    user = db.get(User, record.user_id)
    if not user or not user.is_active:
        raise unauthorized()
    record.revoked_at = datetime.now(timezone.utc)
    return _issue_tokens(db, user)


def logout(db: Session, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    access = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "org_id": str(user.organization_id),
            "department_id": str(user.department_id),
        }
    )
    refresh = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days),
        )
    )
    db.commit()
    return TokenResponse(
        access_token=access,
        expires_in=settings.jwt_expire_minutes * 60,
        refresh_token=refresh,
    )


def create_user_password_hash(password: str) -> str:
    return hash_password(password)
