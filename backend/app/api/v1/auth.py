from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserProfile
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    return auth_service.login(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: DbSession) -> TokenResponse:
    return auth_service.refresh_access_token(db, data.refresh_token)


@router.post("/logout")
def logout(data: RefreshRequest, db: DbSession) -> dict[str, str]:
    auth_service.logout(db, data.refresh_token)
    return {"message": "logged out"}


@router.get("/me", response_model=UserProfile)
def me(user: CurrentUser) -> UserProfile:
    return UserProfile.model_validate(user)
