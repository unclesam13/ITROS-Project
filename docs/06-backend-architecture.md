# 6. Backend Architecture

**Source:** [specification-extract.md](specification-extract.md) - backend manages business logic, routing, integration; modular with ML module.

**Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, PostgreSQL, JWT.

## 6.1 Layered structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, middleware, routers
│   ├── core/
│   │   ├── config.py           # pydantic-settings
│   │   ├── security.py         # JWT, password hashing
│   │   ├── deps.py             # get_db, get_current_user
│   │   └── exceptions.py       # HTTP mapping
│   ├── api/v1/
│   │   ├── auth.py
│   │   ├── tasks.py            # intake + status
│   │   ├── users.py
│   │   ├── departments.py
│   │   ├── routing.py
│   │   ├── analytics.py
│   │   └── health.py
│   ├── models/                 # SQLAlchemy ORM
│   ├── schemas/                # Pydantic v2 request/response
│   ├── services/
│   │   ├── task_intake.py      # M1
│   │   ├── classification.py   # M2 orchestration
│   │   ├── workload.py         # M3
│   │   ├── routing.py          # M4
│   │   ├── user.py
│   │   └── evaluation.py       # FR-080–082 metrics export
│   ├── ml/
│   │   ├── pipeline.py
│   │   ├── train.py            # offline training script
│   │   └── models/             # serialized sklearn artifacts
│   └── db/
│       ├── session.py
│       └── migrations/         # Alembic
├── tests/
├── pyproject.toml
└── Dockerfile
```

## 6.2 Specification modules → services

| Module | Service | Entry points |
|--------|---------|--------------|
| M1 Task intake | `TaskIntakeService` | `POST /tasks` |
| M2 Classification | `ClassificationService` → `ml.pipeline` | Called inside intake pipeline |
| M3 Workload | `WorkloadService` | `refresh_snapshot()`, read in routing |
| M4 Routing | `RoutingService` | `route_task()` auto on intake |

### Intake pipeline (single transaction boundary)

```python
# Conceptual flow - not implementation code
def process_intake(task_in):
    task = create_task(task_in)
    classification = classify(task.title, task.description)
    apply_classification(task, classification)
    workload_service.refresh_for_department(task.department_id)
    decision = routing_service.auto_route(task)
    apply_assignment(task, decision)
    return task
```

On routing failure: task remains `open`, `routing_decisions.status = failed`.

## 6.3 API layer rules

- Routers: validation, auth, call service, map to schema
- No business logic in routers
- Dependency injection for `Session` and `CurrentUser`

## 6.4 Persistence

- SQLAlchemy 2.0 declarative models
- Sync session acceptable for diploma (simpler); async optional later
- Repository-style queries in services or thin `repositories/` if complexity grows

## 6.5 Machine learning integration

- `ClassificationService` loads sklearn artifacts at startup (lazy load)
- Model path from `ML_MODEL_PATH` env
- Missing model: rule-based fallback (keyword priority/category) + warning log

## 6.6 Background processing

- **v1:** Synchronous pipeline in request (NFR-001 < 3s target)
- **Optional:** FastAPI `BackgroundTasks` for audit-only work
- Celery not required for prototype

## 6.7 Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRE_MINUTES` | Auth |
| `ML_MODEL_PATH` | sklearn joblib path |
| `ROUTING_MAX_ACTIVE_TASKS` | Default overload threshold |
| `CORS_ORIGINS` | Frontend URL |

## 6.8 Error handling

| Exception | HTTP | Code |
|-----------|------|------|
| ValidationError | 422 | `VALIDATION_ERROR` |
| Unauthorized | 401 | `UNAUTHORIZED` |
| Forbidden | 403 | `FORBIDDEN` |
| NotFound | 404 | `NOT_FOUND` |
| RoutingFailed | 409 | `ROUTING_FAILED` |
| MLUnavailable | 503 | `ML_DEGRADED` (intake may still succeed with fallback) |

## 6.9 Evaluation service

`EvaluationService` generates CSV/JSON for thesis:

- Workload std dev before/after batch routing
- Latency percentiles from classification/routing rows
- Confusion matrix inputs from test set run

## 6.10 Security middleware

- CORS
- Request ID middleware
- Timing middleware → logs for NFR-061

## 6.11 Assumptions

| ID | Item |
|----|------|
| A-BE-01 | Monolithic API container; ML in-process (no separate inference server v1) |
