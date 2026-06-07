# Evaluation Results (FR-080–082)

**Generated:** 2026-06-07 (reproducible via commands below)  
**Dataset:** `backend/app/ml/data/labeled_tasks.csv` (110 labeled office tasks)  
**Report artifact:** `backend/evaluation/latest_report.json`

## Reproduce

```bash
# Local (from backend/)
python -m app.ml.train
python scripts/run_evaluation.py --batch-size 100 --team-size 4

# Docker
docker compose exec api python scripts/run_evaluation.py
```

**API (admin token required):**

```http
POST /api/v1/evaluation/run
GET  /api/v1/evaluation/report
```

## FR-080 — Task distribution efficiency

| Metric | Baseline (manual + round-robin) | ITROS (greedy workload-aware) |
|--------|----------------------------------|-------------------------------|
| Std dev of active load | 4.30 | 0.00 |
| Gini coefficient | 0.077 | 0.000 |
| Improvement | **100%** reduction in std dev | — |
| Routing success rate | — | 100% (100/100 tasks) |

**Procedure:** Start from skewed manual assignments (`[12, 8, 3, 1]` per 4-person team), route 100 new tasks. Baseline adds tasks round-robin; ITROS uses the greedy scorer from `routing_service.py`.

**Interpretation:** Workload-aware routing substantially reduces load inequality versus naive assignment on the same batch. For thesis discussion, note that a perfectly balanced end state is achievable when capacity is unconstrained and candidates are homogeneous (no skill differentiation in v1).

## FR-081 — Processing time

Simulated pipeline over 100 labeled samples (in-process, CPU):

| Stage | Mean (ms) | p50 (ms) | p95 (ms) |
|-------|-----------|----------|----------|
| Classification | 0.69 | 0.66 | 0.84 |
| Routing | 0.02 | 0.01 | 0.02 |
| **Total pipeline** | **0.70** | **0.67** | **0.86** |

All stages are well under the NFR target of &lt; 3 s per task on prototype hardware.

Live DB aggregates (from tasks submitted during demo) are also included in `latest_report.json` under `db_classification` and `db_routing`.

## FR-082 — Classification accuracy

Held-out test set (20% split, `random_state=42`), n = 22:

| Metric | Category | Priority |
|--------|----------|----------|
| Macro F1 | **0.40** | 0.11 |
| Macro precision | 0.69 | 0.07 |
| Macro recall | 0.39 | 0.25 |
| Accuracy | 0.55 (weighted) | **0.27** |

**Per-category F1 (category model):**

| Category | F1 |
|----------|-----|
| administrative | 0.33 |
| finance | 0.67 |
| technical | 0.62 |
| support | 0.40 |
| general | 0.00 |

**Notes for thesis:**

- Category classification performs reasonably on finance/technical keywords; `general` has too few samples.
- Priority prediction is harder with TF-IDF + small dataset; recommend reporting honestly and proposing more labeled data or class weighting as future work.
- Confusion matrix is stored in `latest_report.json` → `fr_082_classification_accuracy.confusion_matrix_category`.

## Specification traceability

| Requirement | Status |
|-------------|--------|
| FR-080 Distribution efficiency | Documented |
| FR-081 Processing time (p50/p95/mean) | Documented |
| FR-082 Classification accuracy | Documented |
| FR-051 Evaluation export/report | `POST /evaluation/run`, JSON report |
| NFR-090 Reproducible demo | Docker + seed + scripts |
