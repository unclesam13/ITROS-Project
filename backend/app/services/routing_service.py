import time
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import RoutingDecision, Task, User
from app.models.enums import RoutingStatus, TaskPriority, TaskStatus, UserRole
from app.services.workload_service import compute_user_load

PRIORITY_WEIGHT = {
    TaskPriority.low: 1.0,
    TaskPriority.medium: 1.1,
    TaskPriority.high: 1.25,
    TaskPriority.critical: 1.5,
}

W1, W2, W3, W4 = 0.2, 0.5, 0.3, 1.0


def score_candidate(user: User, active_count: int, task: Task) -> tuple[float, dict]:
    normalized_load = active_count / max(user.max_active_tasks, 1)
    load_factor = 1 - normalized_load
    priority_weight = PRIORITY_WEIGHT[task.priority]
    overload_penalty = max(0.0, normalized_load - 0.8) * 2
    skill_match = 1.0
    score = W1 * skill_match + W2 * load_factor + W3 * priority_weight - W4 * overload_penalty
    return score, {
        "skill_match": skill_match,
        "normalized_load": round(normalized_load, 3),
        "priority_weight": priority_weight,
        "overload_penalty": overload_penalty,
    }


def auto_route(db: Session, task: Task) -> RoutingDecision:
    start = time.perf_counter()
    candidates = (
        db.query(User)
        .filter(
            User.department_id == task.department_id,
            User.is_active.is_(True),
            User.role.in_([UserRole.employee, UserRole.manager]),
        )
        .all()
    )
    scored: list[tuple[User, float, dict]] = []
    for user in candidates:
        active_count, _ = compute_user_load(db, user.id)
        if active_count >= user.max_active_tasks:
            continue
        score, breakdown = score_candidate(user, active_count, task)
        scored.append((user, score, breakdown))

    elapsed = int((time.perf_counter() - start) * 1000)

    if not scored:
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

    scored.sort(key=lambda x: (-x[1], x[0].full_name))
    winner, best_score, winner_breakdown = scored[0]
    runner_up = []
    for user, score, breakdown in scored[1:4]:
        runner_up.append({"user_id": str(user.id), "score": round(score, 3), **breakdown})

    rationale = {
        "algorithm": "greedy_best_fit_v1",
        "weights": {"w1": W1, "w2": W2, "w3": W3, "w4": W4},
        "candidates_evaluated": len(scored),
        "winner": {"user_id": str(winner.id), "score": round(best_score, 3), **winner_breakdown},
        "runner_up": runner_up,
    }

    task.assigned_to_id = winner.id
    task.status = TaskStatus.assigned
    task.auto_routed = True

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


def rationale_summary(rationale: dict | None) -> str | None:
    if not rationale:
        return None
    if rationale.get("reason"):
        return str(rationale["reason"])
    winner = rationale.get("winner", {})
    load = winner.get("normalized_load")
    if load is not None:
        return f"Selected lowest workload candidate (normalized load {load}) with priority weighting."
    return "Automatic routing applied."
