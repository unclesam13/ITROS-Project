"""Run evaluation harness and print FR-080–082 metrics.

Usage:
  python scripts/run_evaluation.py
  python scripts/run_evaluation.py --batch-size 100 --team-size 4
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.services.evaluation_service import run_evaluation


def main() -> None:
    parser = argparse.ArgumentParser(description="ITROS evaluation harness (FR-080–082)")
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--team-size", type=int, default=4)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        report = run_evaluation(db, batch_size=args.batch_size, team_size=args.team_size)
    finally:
        db.close()

    dist = report.fr_080_distribution_efficiency
    latency = report.fr_081_processing_time
    accuracy = report.fr_082_classification_accuracy

    print("=== ITROS Evaluation Report ===")
    print(f"Generated: {report.generated_at.isoformat()}")
    print()
    print("FR-080 Distribution efficiency")
    print(f"  Baseline std dev: {dist.baseline_std_dev}")
    print(f"  ITROS std dev:    {dist.itros_std_dev}")
    print(f"  Improvement:      {dist.improvement_percent}%")
    print(f"  Gini baseline/ITROS: {dist.baseline_gini} / {dist.itros_gini}")
    print()
    print("FR-081 Processing time (ms)")
    print(f"  Classification mean/p50/p95: {latency.classification.mean}/{latency.classification.p50}/{latency.classification.p95}")
    print(f"  Routing mean/p50/p95:        {latency.routing.mean}/{latency.routing.p50}/{latency.routing.p95}")
    print(f"  Pipeline mean/p50/p95:       {latency.pipeline_total.mean}/{latency.pipeline_total.p50}/{latency.pipeline_total.p95}")
    print()
    print("FR-082 Classification accuracy")
    print(f"  Category macro F1: {accuracy.category_macro_f1}")
    print(f"  Priority accuracy: {accuracy.priority_accuracy}")
    print(f"  Priority macro F1: {accuracy.priority_macro_f1}")
    print()
    print("Report saved to backend/evaluation/latest_report.json")


if __name__ == "__main__":
    main()
