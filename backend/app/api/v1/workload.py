from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.task import WorkloadResponse, WorkloadUserEntry
from app.services.workload_service import get_workload_for_user

router = APIRouter()


@router.get("", response_model=WorkloadResponse)
def department_workload(
    db: DbSession,
    user: CurrentUser,
    department_id: UUID | None = Query(default=None),
) -> WorkloadResponse:
    dept, rows = get_workload_for_user(db, user, department_id)
    return WorkloadResponse(
        department_id=dept,
        computed_at=datetime.now(timezone.utc),
        users=[WorkloadUserEntry(**r) for r in rows],
    )
