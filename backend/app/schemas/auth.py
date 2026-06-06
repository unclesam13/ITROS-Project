from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
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
