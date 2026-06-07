from uuid import UUID

from pydantic import BaseModel

from app.models.enums import UserRole
from app.schemas.common import LoginEmail


class LoginRequest(BaseModel):
    email: LoginEmail
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    organization_id: UUID
    department_id: UUID
    is_active: bool

    model_config = {"from_attributes": True}
