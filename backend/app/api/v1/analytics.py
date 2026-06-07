from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.deps import DbSession, require_roles
from app.models.entities import User
from app.models.enums import UserRole
from app.schemas.evaluation import PipelineAnalytics
from app.services.evaluation_service import get_pipeline_analytics

router = APIRouter()
ManagerOrAdmin = Annotated[User, Depends(require_roles(UserRole.manager, UserRole.admin))]


@router.get("/pipeline", response_model=PipelineAnalytics)
def pipeline_analytics(db: DbSession, user: ManagerOrAdmin) -> PipelineAnalytics:
    return get_pipeline_analytics(db, user.organization_id)
