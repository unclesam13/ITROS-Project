from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import DbSession, require_roles
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


@router.get("/completed-over-time", response_model=list[CompletedOverTimePoint])
def completed_over_time(
    db: DbSession,
    user: ManagerOrAdmin,
    days: int = Query(default=14, ge=1, le=90),
) -> list[CompletedOverTimePoint]:
    rows = get_completed_over_time(db, user.organization_id, days)
    return [CompletedOverTimePoint(date=str(r["date"]), count=int(r["count"])) for r in rows]


@router.get("/heatmap", response_model=list[HeatmapUserEntry])
def workload_heatmap(db: DbSession, user: AdminOnly) -> list[HeatmapUserEntry]:
    return task_service.get_heatmap(db, user)
