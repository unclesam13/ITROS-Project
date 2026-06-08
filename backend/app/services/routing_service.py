import time
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Department, RoutingDecision, Task, TaskClassification, User
from app.models.enums import RoutingStatus, TaskPriority, TaskStatus, UserRole
from app.services.workload_service import compute_user_load

PRIORITY_WEIGHT = {
    TaskPriority.low: 1.0,
    TaskPriority.medium: 1.1,
    TaskPriority.high: 1.25,
    TaskPriority.critical: 1.5,
}

W1, W2, W3, W4 = 0.2, 0.5, 0.3, 1.0
LOAD_CAPACITY_THRESHOLD = 0.8
ADMIN_ROUTABLE_CATEGORIES = {"administrative", "technical", "support"}

CATEGORY_DEPARTMENT_HINTS: dict[str, list[str]] = {
    "administrative": ["administration", "admin", "office"],
    "technical": ["operations", "technical", "it"],
    "support": ["operations", "support", "it"],
    "finance": ["finance", "operations", "administration"],
    "hr": ["administration", "hr", "human"],
    "general": [],
}

MANAGER_FALLBACK_NOTE = (
    "Assigned to manager due to no available candidates with matching skills/capacity."
)


def score_candidate(user: User, active_count: int, task: Task) -> tuple[float, dict]:
    normalized_load = active_count / max(user.max_active_tasks, 1)
    load_factor = 1 - normalized_load
    priority_weight = PRIORITY_WEIGHT[task.priority]
    overload_penalty = max(0.0, normalized_load - LOAD_CAPACITY_THRESHOLD) * 2
    skill_match = 1.0
    score = W1 * skill_match + W2 * load_factor + W3 * priority_weight - W4 * overload_penalty
    return score, {
        "skill_match": skill_match,
        "normalized_load": round(normalized_load, 3),
        "priority_weight": priority_weight,
        "overload_penalty": overload_penalty,
    }


def _normalized_load(active_count: int, max_tasks: int) -> float:
    return active_count / max(max_tasks, 1)


def _is_under_capacity(active_count: int, max_tasks: int) -> bool:
    return _normalized_load(active_count, max_tasks) < LOAD_CAPACITY_THRESHOLD


def _task_category(db: Session, task: Task) -> str:
    latest = (
        db.query(TaskClassification)
        .filter(TaskClassification.task_id == task.id)
        .order_by(TaskClassification.created_at.desc())
        .first()
    )
    return latest.category if latest else "general"


def _eligible_roles(category: str) -> list[UserRole]:
    roles = [UserRole.employee, UserRole.manager]
    if category in ADMIN_ROUTABLE_CATEGORIES:
        roles.append(UserRole.admin)
    return roles


def _department_ids_for_category(db: Session, task: Task, category: str) -> list[UUID]:
    hints = CATEGORY_DEPARTMENT_HINTS.get(category, [])
    if not hints:
        return [task.department_id]
    depts = db.query(Department).filter(Department.organization_id == task.organization_id).all()
    matched = [d.id for d in depts if any(hint in d.name.lower() for hint in hints)]
    if task.department_id not in matched:
        matched.append(task.department_id)
    return matched or [task.department_id]


def _score_users(
    db: Session,
    users: list[User],
    task: Task,
) -> list[tuple[User, float, dict]]:
    scored: list[tuple[User, float, dict]] = []
    for user in users:
        active_count, _ = compute_user_load(db, user.id)
        if not _is_under_capacity(active_count, user.max_active_tasks):
            continue
        score, breakdown = score_candidate(user, active_count, task)
        scored.append((user, score, breakdown))
    return scored


def _collect_candidates(
    db: Session,
    task: Task,
    category: str,
    department_ids: list[UUID] | None,
) -> list[User]:
    query = db.query(User).filter(
        User.organization_id == task.organization_id,
        User.is_active.is_(True),
        User.role.in_(_eligible_roles(category)),
    )
    if department_ids is not None:
        query = query.filter(User.department_id.in_(department_ids))
    return query.all()


def _find_manager_fallback(db: Session, task: Task) -> User | None:
    manager = (
        db.query(User)
        .filter(
            User.organization_id == task.organization_id,
            User.is_active.is_(True),
            User.role == UserRole.manager,
            User.department_id == task.department_id,
        )
        .order_by(User.full_name)
        .first()
    )
    if manager:
        return manager
    return (
        db.query(User)
        .filter(
            User.organization_id == task.organization_id,
            User.is_active.is_(True),
            User.role == UserRole.manager,
        )
        .order_by(User.full_name)
        .first()
    )


def _apply_assignment(
    db: Session,
    task: Task,
    winner: User,
    best_score: float,
    winner_breakdown: dict,
    scored: list[tuple[User, float, dict]],
    elapsed: int,
    routing_note: str,
    selection_phase: str,
) -> RoutingDecision:
    task.assigned_to_id = winner.id
    task.status = TaskStatus.assigned
    task.auto_routed = True
    task.routing_note = routing_note

    runner_up = []
    for user, score, breakdown in scored[1:4]:
        runner_up.append({"user_id": str(user.id), "score": round(score, 3), **breakdown})

    rationale = {
        "algorithm": "greedy_best_fit_v1",
        "selection_phase": selection_phase,
        "weights": {"w1": W1, "w2": W2, "w3": W3, "w4": W4},
        "candidates_evaluated": len(scored),
        "winner": {"user_id": str(winner.id), "score": round(best_score, 3), **winner_breakdown},
        "runner_up": runner_up,
        "routing_note": routing_note,
    }

    decision = RoutingDecision(
        task_id=task.id,
        recommended_user_id=winner.id,
        applied_user_id=winner.id,
        status=RoutingStatus.applied,
        score=best_score,
        rationale=rationale,
        processing_time_ms=elapsed,
    )
    db.add(decision)
    return decision


def auto_route(db: Session, task: Task) -> RoutingDecision:
    start = time.perf_counter()
    category = _task_category(db, task)
    category_dept_ids = _department_ids_for_category(db, task, category)

    phase1_users = _collect_candidates(db, task, category, category_dept_ids)
    phase1_scored = _score_users(db, phase1_users, task)

    winner_result = None
    selection_phase = "category_department_match"

    if phase1_scored:
        phase1_scored.sort(key=lambda x: (-x[1], x[0].full_name))
        winner, best_score, winner_breakdown = phase1_scored[0]
        load_pct = int(winner_breakdown["normalized_load"] * 100)
        note = (
            f"Matched category '{category}' to department with load under 80%. "
            f"Selected {winner.full_name} (load {load_pct}% of capacity)."
        )
        winner_result = (winner, best_score, winner_breakdown, phase1_scored, note)
    else:
        phase2_users = _collect_candidates(db, task, category, None)
        phase2_scored = _score_users(db, phase2_users, task)
        if phase2_scored:
            selection_phase = "organization_wide_fallback"
            phase2_scored.sort(key=lambda x: (-x[1], x[0].full_name))
            winner, best_score, winner_breakdown = phase2_scored[0]
            load_pct = int(winner_breakdown["normalized_load"] * 100)
            note = (
                f"No category-department match under 80% load; fell back to any eligible user. "
                f"Selected {winner.full_name} (load {load_pct}% of capacity)."
            )
            winner_result = (winner, best_score, winner_breakdown, phase2_scored, note)

    elapsed = int((time.perf_counter() - start) * 1000)

    if winner_result:
        winner, best_score, winner_breakdown, scored, note = winner_result
        return _apply_assignment(
            db, task, winner, best_score, winner_breakdown, scored, elapsed, note, selection_phase
        )

    manager = _find_manager_fallback(db, task)
    if manager:
        task.assigned_to_id = manager.id
        task.status = TaskStatus.assigned
        task.auto_routed = True
        task.routing_note = MANAGER_FALLBACK_NOTE
        decision = RoutingDecision(
            task_id=task.id,
            recommended_user_id=manager.id,
            applied_user_id=manager.id,
            status=RoutingStatus.applied,
            score=None,
            rationale={
                "reason": "no_eligible_candidates",
                "fallback": "manager_assignment",
                "routing_note": MANAGER_FALLBACK_NOTE,
                "manager_id": str(manager.id),
            },
            processing_time_ms=elapsed,
        )
        db.add(decision)
        return decision

    decision = RoutingDecision(
        task_id=task.id,
        recommended_user_id=None,
        applied_user_id=None,
        status=RoutingStatus.failed,
        score=None,
        rationale={"reason": "no_eligible_candidates"},
        processing_time_ms=elapsed,
    )
    db.add(decision)
    return decision


def rationale_summary(rationale: dict | None) -> str | None:
    if not rationale:
        return None
    if rationale.get("routing_note"):
        return str(rationale["routing_note"])
    if rationale.get("reason") == "no_eligible_candidates" and rationale.get("fallback") == "manager_assignment":
        return MANAGER_FALLBACK_NOTE
    if rationale.get("reason"):
        return str(rationale["reason"])
    winner = rationale.get("winner", {})
    load = winner.get("normalized_load")
    if load is not None:
        return f"Selected lowest workload candidate (normalized load {load}) with priority weighting."
    return "Automatic routing applied."
