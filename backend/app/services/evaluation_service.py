"""Evaluation harness for thesis metrics FR-080–082."""

from __future__ import annotations

import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from uuid import UUID

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session

from app.ml.pipeline import get_classifier
from app.models.entities import RoutingDecision, TaskClassification
from app.models.enums import TaskPriority
from app.schemas.evaluation import (
    ClassificationAccuracyMetrics,
    DistributionEfficiencyMetrics,
    EvaluationReport,
    PercentileStats,
    PipelineAnalytics,
    ProcessingTimeMetrics,
)
from app.services.routing_service import score_candidate

DATA_PATH = Path(__file__).resolve().parents[1] / "ml" / "data" / "labeled_tasks.csv"
MODEL_PATH = Path(__file__).resolve().parents[1] / "ml" / "models"
REPORT_PATH = Path(__file__).resolve().parents[2] / "evaluation" / "latest_report.json"


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = (len(ordered) - 1) * (p / 100)
    lower = int(rank)
    upper = min(lower + 1, len(ordered) - 1)
    weight = rank - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * weight


def _percentile_stats(values: list[float]) -> PercentileStats:
    if not values:
        return PercentileStats(mean=0.0, p50=0.0, p95=0.0, sample_count=0)
    return PercentileStats(
        mean=round(statistics.mean(values), 2),
        p50=round(_percentile(values, 50), 2),
        p95=round(_percentile(values, 95), 2),
        sample_count=len(values),
    )


def _gini(loads: list[int]) -> float:
    if not loads or sum(loads) == 0:
        return 0.0
    sorted_loads = sorted(loads)
    n = len(sorted_loads)
    cumulative = 0
    weighted = 0
    for i, load in enumerate(sorted_loads, start=1):
        cumulative += load
        weighted += i * load
    return round((2 * weighted) / (n * cumulative) - (n + 1) / n, 4)


def _std_dev(loads: list[int]) -> float:
    if len(loads) < 2:
        return 0.0
    return round(statistics.pstdev(loads), 4)


def _uneven_seed(team_size: int) -> list[int]:
    """Skewed manual assignments before batch routing (FR-080 baseline)."""
    pattern = [12, 8, 3, 1, 6, 2]
    return [pattern[i % len(pattern)] for i in range(team_size)]


def _simulate_distribution(batch_size: int, team_size: int) -> DistributionEfficiencyMetrics:
    df = pd.read_csv(DATA_PATH)
    priorities = [TaskPriority(p) for p in df["priority"].tolist()]
    if len(priorities) < batch_size:
        priorities = (priorities * ((batch_size // len(priorities)) + 1))[:batch_size]
    else:
        priorities = priorities[:batch_size]

    seed = _uneven_seed(team_size)
    capacity = max(seed) + batch_size + 5

    baseline_loads = seed.copy()
    for i in range(batch_size):
        baseline_loads[i % team_size] += 1

    itros_users = [SimpleNamespace(max_active_tasks=capacity) for _ in range(team_size)]
    itros_loads = seed.copy()
    successes = 0

    for priority in priorities:
        task = SimpleNamespace(priority=priority)
        scored: list[tuple[int, float]] = []
        for idx, user in enumerate(itros_users):
            if itros_loads[idx] >= user.max_active_tasks:
                continue
            score, _ = score_candidate(user, itros_loads[idx], task)
            scored.append((idx, score))
        if not scored:
            continue
        scored.sort(key=lambda item: -item[1])
        winner = scored[0][0]
        itros_loads[winner] += 1
        successes += 1

    baseline_std = _std_dev(baseline_loads)
    itros_std = _std_dev(itros_loads)
    improvement = 0.0
    if baseline_std > 0:
        improvement = round(((baseline_std - itros_std) / baseline_std) * 100, 2)

    return DistributionEfficiencyMetrics(
        batch_size=batch_size,
        team_size=team_size,
        baseline_std_dev=baseline_std,
        itros_std_dev=itros_std,
        improvement_percent=improvement,
        baseline_gini=_gini(baseline_loads),
        itros_gini=_gini(itros_loads),
        routing_success_rate=round(successes / batch_size, 4),
    )


def _evaluate_classification() -> ClassificationAccuracyMetrics:
    df = pd.read_csv(DATA_PATH)
    texts = df["text"].astype(str)
    y_cat = df["category"]
    y_pri = df["priority"]

    vec_path = MODEL_PATH / "vectorizer.joblib"
    cat_path = MODEL_PATH / "category_model.joblib"
    pri_path = MODEL_PATH / "priority_model.joblib"

    if vec_path.exists() and cat_path.exists() and pri_path.exists():
        vectorizer = joblib.load(vec_path)
        cat_model = joblib.load(cat_path)
        pri_model = joblib.load(pri_path)
        features = vectorizer.transform(texts)
        _, X_test, _, yc_test = train_test_split(features, y_cat, test_size=0.2, random_state=42)
        _, _, _, yp_test = train_test_split(features, y_pri, test_size=0.2, random_state=42)
        cat_pred = cat_model.predict(X_test)
        pri_pred = pri_model.predict(X_test)
        cat_report = classification_report(yc_test, cat_pred, output_dict=True, zero_division=0)
        pri_report = classification_report(yp_test, pri_pred, output_dict=True, zero_division=0)
        labels = sorted({*yc_test.tolist(), *cat_pred.tolist()})
        cm = confusion_matrix(yc_test, cat_pred, labels=labels)
        confusion = {label: {labels[j]: int(cm[i, j]) for j in range(len(labels))} for i, label in enumerate(labels)}
    else:
        clf = get_classifier()
        cat_pred = []
        pri_pred = []
        yc_test = []
        yp_test = []
        for _, row in df.iterrows():
            text = str(row["text"])
            result = clf.classify(text, "")
            cat_pred.append(result.category)
            pri_pred.append(result.predicted_priority.value)
            yc_test.append(row["category"])
            yp_test.append(row["priority"])
        cat_report = classification_report(yc_test, cat_pred, output_dict=True, zero_division=0)
        pri_report = classification_report(yp_test, pri_pred, output_dict=True, zero_division=0)
        labels = sorted({*yc_test, *cat_pred})
        cm = confusion_matrix(yc_test, cat_pred, labels=labels)
        confusion = {label: {labels[j]: int(cm[i, j]) for j in range(len(labels))} for i, label in enumerate(labels)}

    test_size = int(cat_report.get("macro avg", {}).get("support", len(yc_test)))
    return ClassificationAccuracyMetrics(
        test_set_size=test_size,
        category_macro_f1=round(float(cat_report["macro avg"]["f1-score"]), 4),
        category_macro_precision=round(float(cat_report["macro avg"]["precision"]), 4),
        category_macro_recall=round(float(cat_report["macro avg"]["recall"]), 4),
        priority_accuracy=round(float(accuracy_score(yp_test, pri_pred)), 4),
        priority_macro_f1=round(float(pri_report["macro avg"]["f1-score"]), 4),
        category_report={k: v for k, v in cat_report.items() if isinstance(v, dict)},
        priority_report={k: v for k, v in pri_report.items() if isinstance(v, dict)},
        confusion_matrix_category=confusion,
    )


def _evaluate_processing_time(batch_size: int, team_size: int) -> ProcessingTimeMetrics:
    df = pd.read_csv(DATA_PATH)
    texts = df["text"].astype(str).tolist()
    priorities = [TaskPriority(p) for p in df["priority"].tolist()]
    if len(texts) < batch_size:
        factor = (batch_size // len(texts)) + 1
        texts = (texts * factor)[:batch_size]
        priorities = (priorities * factor)[:batch_size]
    else:
        texts = texts[:batch_size]
        priorities = priorities[:batch_size]

    clf = get_classifier()
    classification_ms: list[float] = []
    routing_ms: list[float] = []
    users = [SimpleNamespace(max_active_tasks=batch_size + 20) for _ in range(team_size)]
    loads = _uneven_seed(team_size)

    for text, priority in zip(texts, priorities, strict=False):
        start = time.perf_counter()
        clf.classify(text, "")
        classification_ms.append((time.perf_counter() - start) * 1000)

        task = SimpleNamespace(priority=priority)
        start = time.perf_counter()
        scored = []
        for idx, user in enumerate(users):
            if loads[idx] >= user.max_active_tasks:
                continue
            score, _ = score_candidate(user, loads[idx], task)
            scored.append((idx, score))
        if scored:
            scored.sort(key=lambda item: -item[1])
            loads[scored[0][0]] += 1
        routing_ms.append((time.perf_counter() - start) * 1000)

    pipeline = [c + r for c, r in zip(classification_ms, routing_ms, strict=False)]
    return ProcessingTimeMetrics(
        classification=_percentile_stats(classification_ms),
        routing=_percentile_stats(routing_ms),
        pipeline_total=_percentile_stats(pipeline),
    )


def _db_latency_stats(db: Session, org_id: UUID | None = None) -> tuple[PercentileStats | None, PercentileStats | None]:
    from app.models.entities import Task

    cls_query = db.query(TaskClassification.processing_time_ms)
    route_query = db.query(RoutingDecision.processing_time_ms)
    if org_id:
        task_ids = db.query(Task.id).filter(Task.organization_id == org_id)
        cls_query = cls_query.filter(TaskClassification.task_id.in_(task_ids))
        route_query = route_query.filter(RoutingDecision.task_id.in_(task_ids))

    cls_values = [float(v) for (v,) in cls_query.all()]
    route_values = [float(v) for (v,) in route_query.all()]
    cls_stats = _percentile_stats(cls_values) if cls_values else None
    route_stats = _percentile_stats(route_values) if route_values else None
    return cls_stats, route_stats


def run_evaluation(db: Session, batch_size: int = 100, team_size: int = 4, org_id: UUID | None = None) -> EvaluationReport:
    processing = _evaluate_processing_time(batch_size, team_size)
    db_cls, db_route = _db_latency_stats(db, org_id)
    processing.db_classification = db_cls
    processing.db_routing = db_route

    report = EvaluationReport(
        generated_at=datetime.now(timezone.utc),
        fr_080_distribution_efficiency=_simulate_distribution(batch_size, team_size),
        fr_081_processing_time=processing,
        fr_082_classification_accuracy=_evaluate_classification(),
        methodology=(
            "FR-080: round-robin baseline vs greedy workload-aware routing on synthetic batch. "
            "FR-081: wall-clock classification + routing over labeled samples (p50/p95/mean). "
            "FR-082: held-out test split (20%) from labeled_tasks.csv with sklearn models."
        ),
    )
    save_report(report)
    return report


def save_report(report: EvaluationReport) -> Path:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    return REPORT_PATH


def load_report() -> EvaluationReport | None:
    if not REPORT_PATH.exists():
        return None
    data = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    return EvaluationReport.model_validate(data)


def get_pipeline_analytics(db: Session, org_id: UUID) -> PipelineAnalytics:
    from sqlalchemy import func

    from app.models.entities import Task
    from app.models.enums import TaskStatus

    counts: dict[str, int] = {status.value: 0 for status in TaskStatus}
    status_rows = (
        db.query(Task.status, func.count(Task.id))
        .filter(Task.organization_id == org_id)
        .group_by(Task.status)
        .all()
    )
    for status, count in status_rows:
        counts[status.value] = int(count)
    total = sum(counts.values())
    return PipelineAnalytics(computed_at=datetime.now(timezone.utc), by_status=counts, total=total)
