# 3. Non-Functional Requirements

**Source:** [specification-extract.md](specification-extract.md) — including evaluation criteria.

## 3.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | End-to-end intake pipeline p95 (classify + route) | < 3 s on demo hardware |
| NFR-002 | CRUD API p95 | < 500 ms |
| NFR-003 | Workload snapshot read | < 200 ms |
| NFR-004 | Concurrent demo users | ≥ 15 |

Record all timings for **FR-081** evaluation.

## 3.2 Security

| ID | Requirement |
|----|-------------|
| NFR-030 | JWT access tokens; bcrypt passwords |
| NFR-031 | RBAC on all endpoints (doc 04) |
| NFR-032 | CORS allowlist; no secrets in Git |
| NFR-033 | Input validation via Pydantic |

## 3.3 Reliability

| ID | Requirement |
|----|-------------|
| NFR-020 | API starts if ML artifacts missing; pipeline degrades with logged errors |
| NFR-021 | Docker healthchecks for `api` and `db` |
| NFR-022 | PostgreSQL durable storage (spec allows SQLite; **project uses PostgreSQL**) |

## 3.4 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-050 | Modular separation: intake, ML, routing, persistence |
| NFR-051 | Alembic migrations; OpenAPI from FastAPI |
| NFR-052 | Backend tests ≥ 70% on services; frontend smoke tests on submit/status |

## 3.5 Observability

| ID | Requirement |
|----|-------------|
| NFR-060 | Structured logs: request_id, path, duration_ms, task_id |
| NFR-061 | Per-stage timing: classification_ms, routing_ms |

## 3.6 Usability (specification: simple UI)

| ID | Requirement |
|----|-------------|
| NFR-070 | Minimal navigation: Submit, My Tasks, Team Workload (manager), Admin |
| NFR-071 | Responsive desktop layout |
| NFR-072 | Clear status labels and assignee display |

## 3.7 Prototype and academic constraints

| ID | Requirement |
|----|-------------|
| NFR-090 | Reproducible demo: `docker compose up` + seed data |
| NFR-091 | scikit-learn models interpretable (coefficients, confusion matrix) |
| NFR-092 | Documented comparison vs manual assignment baseline |

## 3.8 Evaluation metrics (from specification)

The prototype **must** be evaluable on three specification dimensions:

### 3.8.1 Task distribution efficiency (FR-080)

| Metric | Definition | Measurement |
|--------|------------|-------------|
| **Workload balance index** | Lower is better | Standard deviation of active tasks per employee after routing N tasks |
| **Gini coefficient** | Optional | Inequality of load across team |
| **Improvement %** | vs baseline | Compare manual round-robin assignment on same synthetic batch |

### 3.8.2 Processing time (FR-081)

| Stage | Logged field |
|-------|----------------|
| Classification | `task_classifications.processing_time_ms` |
| Routing | `routing_decisions.processing_time_ms` |
| Total pipeline | Sum reported in evaluation export |

Report **p50, p95, mean** over ≥ 100 sample tasks in evaluation script.

### 3.8.3 System accuracy (FR-082)

| Component | Metric |
|-----------|--------|
| **Classification** | Macro precision, recall, F1 per category on held-out test set (≥ 200 labeled samples recommended) |
| **Routing** | Top-1 accuracy: recommended assignee matches expert label (if available) OR proxy: workload improvement + constraint satisfaction rate |

Document dataset construction in thesis; store evaluation results in `docs/evaluation-results.md` during implementation.

## 3.9 Assumptions

| ID | Item |
|----|------|
| A-NFR-01 | Evaluation runs on seeded synthetic office tasks acceptable for diploma |
| A-NFR-02 | GPU not required; CPU inference sufficient |
