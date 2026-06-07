from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import UserRole
from app.schemas.common import LoginEmail


class DepartmentRead(BaseModel):
    id: UUID
    name: str
    organization_id: UUID

    model_config = {"from_attributes": True}


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class DepartmentUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class UserRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    organization_id: UUID
    department_id: UUID
    is_active: bool
    max_active_tasks: int

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: LoginEmail
    password: str = Field(min_length=6)
    full_name: str
    role: UserRole
    department_id: UUID
    max_active_tasks: int = 10


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    department_id: UUID | None = None
    is_active: bool | None = None
    max_active_tasks: int | None = None
    password: str | None = Field(default=None, min_length=6)
