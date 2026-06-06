from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.exceptions import not_found
from app.models.entities import Department, User
from app.models.enums import UserRole
from app.schemas.user import DepartmentCreate, DepartmentRead, DepartmentUpdate

router = APIRouter()
AdminUser = Annotated[User, Depends(require_roles(UserRole.admin))]


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: DbSession, user: CurrentUser) -> list[DepartmentRead]:
    rows = (
        db.query(Department)
        .filter(Department.organization_id == user.organization_id)
        .order_by(Department.name)
        .all()
    )
    return [DepartmentRead.model_validate(d) for d in rows]


@router.post("", response_model=DepartmentRead, status_code=201)
def create_department(data: DepartmentCreate, db: DbSession, admin: AdminUser) -> DepartmentRead:
    dept = Department(organization_id=admin.organization_id, name=data.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentRead.model_validate(dept)


@router.patch("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: UUID,
    data: DepartmentUpdate,
    db: DbSession,
    _: AdminUser,
) -> DepartmentRead:
    dept = db.get(Department, department_id)
    if not dept:
        raise not_found()
    dept.name = data.name
    db.commit()
    db.refresh(dept)
    return DepartmentRead.model_validate(dept)


@router.delete("/{department_id}", status_code=204)
def delete_department(department_id: UUID, db: DbSession, _: AdminUser) -> None:
    dept = db.get(Department, department_id)
    if not dept:
        raise not_found()
    db.delete(dept)
    db.commit()
