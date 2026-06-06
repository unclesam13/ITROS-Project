# 10. REST API Design

**Base URL:** `/api/v1`  
**Format:** JSON  
**Auth:** Bearer JWT (except login, health)

## 10.1 Conventions

| Convention | Value |
|------------|-------|
| Versioning | URL prefix `/api/v1` |
| IDs | UUID strings |
| Timestamps | ISO 8601 UTC |
| Pagination | `?page=1&page_size=20` |
| Sorting | `?sort=-created_at` |
| Errors | `{ "detail", "code", "field_errors" }` |

## 10.2 Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Email + password → tokens | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/logout` | Revoke refresh | Refresh |
| GET | `/auth/me` | Current user profile | Bearer |

### Login request/response

```json
// POST /auth/login
{ "email": "user@office.example", "password": "..." }

// 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "..."
}
```

## 10.3 Health

| GET | `/health` | `{ "status": "ok", "db": "ok" }` |

## 10.4 Task intake and monitoring (Module M1)

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| POST | `/tasks` | Submit task → runs full pipeline | all authenticated |
| GET | `/tasks` | List tasks (filtered) | all (scoped) |
| GET | `/tasks/{id}` | Task detail + latest classification/routing | all (scoped) |
| PATCH | `/tasks/{id}` | Update title, description, deadline | creator, manager, admin |
| PATCH | `/tasks/{id}/status` | Status transition | assignee, manager, admin |
| PATCH | `/tasks/{id}/assignee` | Manual override | manager, admin |
| DELETE | `/tasks/{id}` | Soft cancel | manager, admin |
| POST | `/tasks/{id}/comments` | Add comment | scoped |
| POST | `/tasks/{id}/classify` | Re-run NLP | manager, admin |

### POST /tasks (intake)

```json
{
  "title": "Process vendor invoice",
  "description": "Review and approve invoice #4421 from ACME by Friday",
  "intake_channel": "email",
  "department_id": "uuid",
  "deadline": "2026-06-10T17:00:00Z",
  "effort_points": 2
}
```

```json
// 201 Created
{
  "id": "uuid",
  "status": "assigned",
  "priority": "high",
  "assigned_to": { "id": "uuid", "full_name": "Jane Doe" },
  "classification": {
    "category": "finance",
    "confidence": 0.91,
    "processing_time_ms": 45
  },
  "routing": {
    "score": 0.87,
    "processing_time_ms": 12,
    "rationale_summary": "Lowest workload in department; priority boost applied"
  }
}
```

### GET /tasks query params

| Param | Type |
|-------|------|
| `status` | task_status |
| `assigned_to_id` | uuid |
| `department_id` | uuid |
| `intake_channel` | enum |
| `priority` | enum |
| `created_by_id` | uuid |

## 10.5 Users and organization

| Method | Path | Roles |
|--------|------|-------|
| GET | `/users` | admin, manager |
| POST | `/users` | admin |
| GET | `/users/{id}` | admin, manager, self |
| PATCH | `/users/{id}` | admin, self (limited) |
| DELETE | `/users/{id}` | admin (deactivate) |
| GET | `/departments` | authenticated |
| POST/PATCH/DELETE | `/departments` | admin |
| GET/POST | `/skills` | admin write, all read |
| PUT | `/users/{id}/skills` | admin, self |

## 10.6 Workload and routing

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/workload` | Department workload snapshots | manager, admin |
| GET | `/workload/users/{id}` | Single user snapshot | manager, admin |
| POST | `/routing/suggest` | Suggest without apply (debug/demo) | manager, admin |
| GET | `/routing/decisions` | History filter by task_id | manager, admin |

### GET /workload

```json
{
  "department_id": "uuid",
  "computed_at": "2026-06-05T12:00:00Z",
  "users": [
    { "user_id": "uuid", "full_name": "Jane", "active_task_count": 3, "effort_sum": 5, "max_active_tasks": 10 }
  ]
}
```

## 10.7 Analytics and evaluation

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/analytics/pipeline` | Task counts by status | manager, admin |
| POST | `/evaluation/run` | Run batch metrics FR-080–082 | admin |
| GET | `/evaluation/report` | Latest evaluation JSON | admin |

## 10.8 Error codes

| HTTP | code | When |
|------|------|------|
| 400 | `BAD_REQUEST` | Malformed body |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | RBAC denial |
| 404 | `NOT_FOUND` | Resource missing |
| 409 | `ROUTING_FAILED` | No eligible assignee |
| 422 | `VALIDATION_ERROR` | Pydantic field errors |
| 503 | `ML_DEGRADED` | Fallback used (optional warning header) |

## 10.9 OpenAPI

- Auto-generated at `/api/v1/openapi.json`
- Frontend types generated via `openapi-typescript` in implementation phase

## 10.10 API ID index (traceability)

| ID | Endpoint |
|----|----------|
| API-001 | POST /auth/login |
| API-010 | POST /tasks |
| API-011 | GET /tasks |
| API-020 | GET /workload |
| API-030 | POST /evaluation/run |

## 10.11 Assumptions

| ID | Item |
|----|------|
| A-API-01 | No GraphQL; REST only per stack |
