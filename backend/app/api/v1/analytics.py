from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import CurrentUser, DbSession, require_roles
from app.models.entities import User
from app.models.enums import UserRole
from app.schemas.evaluation import PipelineAnalytics
from app.schemas.task import CompletedOverTimePoint, HeatmapUserEntry
from app.services.evaluation_service import get_completed_over_time, get_pipeline_analytics
from app.services import task_service

router = APIRouter()
ManagerOrAdmin = Annotated[User, Depends(require_roles(UserRole.manager, UserRole.admin))]
AdminOnly = Annotated[User, Depends(require_roles(UserRole.admin))]


@router.get("/pipeline", response_model=PipelineAnalytics)
def pipeline_analytics(db: DbSession, user: ManagerOrAdmin) -> PipelineAnalytics:
    return get_pipeline_analytics(db, user.organization_id)


def _completed_scope_department(user: User):
    if user.role in (UserRole.manager, UserRole.employee):
        return user.department_id
    return None


@router.get("/completed-over-time", response_model=list[CompletedOverTimePoint])
def completed_over_time(
    db: DbSession,
    user: CurrentUser,
    days: int | None = Query(default=None, ge=1, le=90),
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
) -> list[CompletedOverTimePoint]:
    today = date.today()
    dept_id = _completed_scope_department(user)
    if date_from is not None or date_to is not None:
        if date_from is None or date_to is None:
            raise HTTPException(status_code=400, detail="Both 'from' and 'to' dates are required for a custom range.")
        if date_to > today:
            raise HTTPException(status_code=400, detail="'to' date cannot be in the future.")
        if date_from > date_to:
            raise HTTPException(status_code=400, detail="'from' date must be on or before 'to' date.")
        rows = get_completed_over_time(
            db, user.organization_id, date_from=date_from, date_to=date_to, department_id=dept_id
        )
    else:
        rows = get_completed_over_time(db, user.organization_id, days=days or 14, department_id=dept_id)
    return [CompletedOverTimePoint(date=str(r["date"]), count=int(r["count"])) for r in rows]


@router.get("/heatmap", response_model=list[HeatmapUserEntry])
def workload_heatmap(db: DbSession, user: AdminOnly) -> list[HeatmapUserEntry]:
    return task_service.get_heatmap(db, user)
