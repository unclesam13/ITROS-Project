from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession, require_roles
from app.core.exceptions import forbidden
from app.models.enums import UserRole
from app.schemas.task import WorkloadResponse, WorkloadUserEntry
from app.services.workload_service import get_department_workload

router = APIRouter()


@router.get("", response_model=WorkloadResponse)
def department_workload(
    db: DbSession,
    user: CurrentUser,
    department_id: UUID | None = Query(default=None),
) -> WorkloadResponse:
    if user.role not in (UserRole.admin, UserRole.manager):
        raise forbidden()
    dept = department_id or user.department_id
    rows = get_department_workload(db, dept, user.organization_id)
    return WorkloadResponse(
        department_id=dept,
        computed_at=datetime.now(timezone.utc),
        users=[WorkloadUserEntry(**r) for r in rows],
    )
