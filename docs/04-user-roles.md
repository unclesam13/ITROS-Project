# 4. User Roles and Access Control

**Source:** [specification-extract.md](specification-extract.md) — administrative teams; users submit and monitor tasks.

## 4.1 Role definitions
| Role | Code | Description |
|------|------|-------------|
| **Administrator** | `admin` | Full system configuration, user lifecycle, skills catalog, all departments |
| **Manager** | `manager` | Task creation, routing, team visibility within managed scope |
| **Employee** | `employee` | Execute assigned work, update own profile skills, limited task visibility |

Optional internal role (not for human login UI):

| Role | Code | Description |
|------|------|-------------|
| **System** | `system` | Service account for batch jobs (refresh snapshots, reclassification) — Could v1 |

## 4.2 Organizational scoping

| Concept | Rule |
|---------|------|
| **Organization** | One row in `organizations`; all users belong to it |
| **Department** | Users have `department_id`; tasks have `department_id` |
| **Manager scope** | v1: manager sees all departments in org; future: `managed_department_ids` |
| **Employee scope** | Sees tasks where `assigned_to_id = self` OR department public queue if enabled (off v1) |

## 4.3 Permission matrix

Legend: ✓ allowed, ✓* own records only, — denied

| Resource / Action | Admin | Manager | Employee |
|-------------------|:-----:|:-------:|:--------:|
| **Auth: login** | ✓ | ✓ | ✓ |
| **Users: list** | ✓ | ✓ (dept filter) | — |
| **Users: create/update/deactivate** | ✓ | — | — |
| **Users: read self** | ✓ | ✓ | ✓ |
| **Users: update self profile** | ✓ | ✓ | ✓* |
| **Departments: CRUD** | ✓ | read | read |
| **Skills catalog: CRUD** | ✓ | read | read |
| **User skills: set for others** | ✓ | — | — |
| **User skills: set for self** | ✓ | ✓ | ✓ |
| **Tasks: create (intake)** | ✓ | ✓ | ✓ |
| **Tasks: list all in org** | ✓ | ✓ | — |
| **Tasks: list assigned** | ✓ | ✓ | ✓* |
| **Tasks: update any** | ✓ | ✓ | — |
| **Tasks: update assigned** | ✓ | ✓ | ✓* |
| **Tasks: delete** | ✓ | ✓ (own created) | — |
| **Comments: add** | ✓ | ✓ | ✓* |
| **Classification: trigger** | ✓ | ✓ | — |
| **Routing: suggest** | ✓ | ✓ | — |
| **Routing: apply** | ✓ | ✓ | — |
| **Analytics: workload** | ✓ | ✓ | — |
| **Audit logs: read** | ✓ | — | — |
| **System config** | ✓ | — | — |

## 4.4 JWT structure

### Access token claims

```json
{
  "sub": "user-uuid",
  "email": "user@office.example",
  "role": "manager",
  "org_id": "org-uuid",
  "department_id": "dept-uuid",
  "type": "access",
  "exp": 1710000000,
  "iat": 1710000000
}
```

### Refresh token

- Opaque random string stored in `refresh_tokens` table (hashed)
- Not embedded in JWT body for revocation support
- Claim `type: "refresh"` if using JWT-style refresh (alternative pattern)

## 4.5 Authorization implementation

| Layer | Mechanism |
|-------|-----------|
| **API** | FastAPI dependency `get_current_user` + `require_roles(["admin"])` |
| **Service** | Additional checks: assignee department, task ownership |
| **Database** | Row-level filters in repositories (never rely on UI alone) |

### Example dependency chain

```
Request → JWT validate → User load → Role check → Scope filter → Handler
```

## 4.6 Default bootstrap users (seed)

| Email | Role | Purpose |
|-------|------|---------|
| admin@itros.local | admin | Demo administration |
| manager@itros.local | manager | Task and routing demo |
| employee@itros.local | employee | Execution demo |

Passwords only in seed documentation / `.env.example` for local dev.

## 4.7 Security events (audit)

| Event | Roles involved |
|-------|----------------|
| `user.login.success` / `failed` | all |
| `user.created` / `deactivated` | admin |
| `task.assigned` | manager, admin |
| `routing.applied` | manager, admin |
| `role.changed` | admin |

## 4.8 Assumptions

| ID | Item |
|----|------|
| A-ROLE-01 | One role per user v1 (admin superset includes manager permissions) |
| A-ROLE-02 | All authenticated staff may submit tasks (spec: users submit tasks) |
| A-ROLE-03 | Three roles sufficient for administrative office prototype |
