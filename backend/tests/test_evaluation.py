"""Unit tests for evaluation metrics (no database required)."""

from app.services.evaluation_service import (
    _evaluate_classification,
    _gini,
    _percentile_stats,
    _simulate_distribution,
    _std_dev,
)


def test_std_dev_balanced_vs_uneven() -> None:
    assert _std_dev([5, 5, 5, 5]) == 0.0
    assert _std_dev([0, 0, 0, 10]) > _std_dev([2, 2, 3, 3])


def test_gini_perfect_balance() -> None:
    assert _gini([2, 2, 2, 2]) < _gini([0, 0, 0, 8])


def test_percentile_stats() -> None:
    stats = _percentile_stats([1.0, 2.0, 3.0, 4.0, 100.0])
    assert stats.sample_count == 5
    assert stats.p50 == 3.0
    assert stats.p95 > stats.p50


def test_distribution_improves_over_round_robin() -> None:
    result = _simulate_distribution(batch_size=100, team_size=4)
    assert result.itros_std_dev <= result.baseline_std_dev
    assert result.improvement_percent >= 0.0
    assert result.routing_success_rate == 1.0
    assert result.baseline_std_dev > 0.0


def test_classification_metrics_available() -> None:
    metrics = _evaluate_classification()
    assert metrics.test_set_size > 0
    assert 0.0 <= metrics.category_macro_f1 <= 1.0
    assert 0.0 <= metrics.priority_accuracy <= 1.0
    assert metrics.confusion_matrix_category
