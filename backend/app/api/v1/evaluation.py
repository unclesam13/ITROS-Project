from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.deps import DbSession, require_roles
from app.core.exceptions import not_found
from app.models.entities import User
from app.models.enums import UserRole
from app.schemas.evaluation import EvaluationReport, EvaluationRunRequest
from app.services.evaluation_service import load_report, run_evaluation

router = APIRouter()
Admin = Annotated[User, Depends(require_roles(UserRole.admin))]


@router.post("/run", response_model=EvaluationReport, status_code=status.HTTP_201_CREATED)
def run_evaluation_batch(
    db: DbSession,
    user: Admin,
    body: EvaluationRunRequest | None = None,
) -> EvaluationReport:
    req = body or EvaluationRunRequest()
    return run_evaluation(db, batch_size=req.batch_size, team_size=req.team_size, org_id=user.organization_id)


@router.get("/report", response_model=EvaluationReport)
def get_evaluation_report(_user: Admin) -> EvaluationReport:
    report = load_report()
    if not report:
        raise not_found("No evaluation report yet. POST /evaluation/run first.")
    return report
