from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PercentileStats(BaseModel):
    mean: float
    p50: float
    p95: float
    sample_count: int


class DistributionEfficiencyMetrics(BaseModel):
    batch_size: int
    team_size: int
    baseline_std_dev: float
    itros_std_dev: float
    improvement_percent: float
    baseline_gini: float
    itros_gini: float
    routing_success_rate: float


class ClassificationAccuracyMetrics(BaseModel):
    test_set_size: int
    category_macro_f1: float
    category_macro_precision: float
    category_macro_recall: float
    priority_accuracy: float
    priority_macro_f1: float
    category_report: dict[str, Any]
    priority_report: dict[str, Any]
    confusion_matrix_category: dict[str, dict[str, int]]


class ProcessingTimeMetrics(BaseModel):
    classification: PercentileStats
    routing: PercentileStats
    pipeline_total: PercentileStats
    db_classification: PercentileStats | None = None
    db_routing: PercentileStats | None = None


class EvaluationReport(BaseModel):
    generated_at: datetime
    fr_080_distribution_efficiency: DistributionEfficiencyMetrics
    fr_081_processing_time: ProcessingTimeMetrics
    fr_082_classification_accuracy: ClassificationAccuracyMetrics
    methodology: str


class EvaluationRunRequest(BaseModel):
    batch_size: int = Field(default=100, ge=10, le=500)
    team_size: int = Field(default=4, ge=2, le=20)


class PipelineAnalytics(BaseModel):
    computed_at: datetime
    by_status: dict[str, int]
    total: int
    open: int = 0
    in_progress: int = 0
    completed_today: int = 0
