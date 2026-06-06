# 2. Functional Requirements

**Source:** [specification-extract.md](specification-extract.md)

Stable IDs for thesis traceability. MoSCoW: Must = prototype demo + evaluation.

## 2.1 Specification → requirements map

| Specification element | Requirement IDs |
|----------------------|-----------------|
| Automatic classification | FR-030, FR-031 |
| Automatic prioritization | FR-030, FR-034 |
| Automatic routing | FR-040, FR-042, FR-045 |
| Task intake (email/form/internal) | FR-015, FR-020 |
| Workload monitoring | FR-035, FR-050 |
| Simple UI submit + status | FR-020, FR-025, FR-070 |
| Prototype evaluation | FR-080, FR-081, FR-082 |
| Modular architecture | NFR-054 (see doc 03) |

## 2.2 User stories

| ID | As a… | I want to… | So that… | Priority |
|----|--------|------------|----------|----------|
| US-01 | Staff user | submit a task with description | work enters the system | Must |
| US-02 | Staff user | see task status | I know progress | Must |
| US-03 | System | classify and prioritize new tasks | triage is automatic | Must |
| US-04 | System | route tasks to suitable employees | workload stays balanced | Must |
| US-05 | Manager | override assignment | exceptions are handled | Must |
| US-06 | Manager | view team workload | I monitor distribution | Must |
| US-07 | Admin | manage users and departments | the org model is correct | Must |
| US-08 | Employee | update assigned task status | work is tracked | Must |
| US-09 | Evaluator | measure accuracy and efficiency | thesis criteria are met | Must |

## 2.3 Task intake (Module M1)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-015 | System shall record intake channel: `manual`, `form`, `email`, `internal` | Must | Field stored on task; filterable in API |
| FR-016 | System shall accept unstructured title and description | Must | Min length validation; stored as text |
| FR-017 | System shall timestamp intake and link submitter | Must | `created_by_id`, `created_at` set |

## 2.4 Task management

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-020 | Authenticated users shall submit tasks via UI/API | Must | Aligns with spec “users submit tasks” |
| FR-021 | System shall support status workflow for monitoring | Must | open → assigned → in_progress → completed (+ cancelled) |
| FR-022 | Users shall list and filter own or team tasks per role | Must | Employee: assigned; Manager: department |
| FR-023 | Users shall add optional comments | Should | Chronological thread |
| FR-024 | Manager/admin may manually assign or reassign | Must | Overrides automatic routing |
| FR-025 | Assignee shall update status on assigned tasks | Must | Status transitions validated |

## 2.5 NLP classification (Module M2)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-030 | System shall automatically classify task text on intake | Must | category + confidence persisted |
| FR-031 | System shall infer priority from text (NLP) | Must | Maps to priority enum; stored in classification |
| FR-032 | Models shall use scikit-learn per specification | Must | See doc 08; TF-IDF or embedding + sklearn classifier |
| FR-033 | System shall log classification latency for evaluation | Must | `processing_time_ms` on classification row |
| FR-034 | Manager may re-run classification | Should | New history row |

## 2.6 Workload monitoring (Module M3)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-035 | System shall compute active workload per employee | Must | Count tasks in assigned/in_progress; optional effort sum |
| FR-036 | Workload shall refresh on assignment and status change | Must | Snapshot updated within same request or sync job |
| FR-037 | System shall expose workload metrics to routing | Must | Optimizer reads current snapshot |

## 2.7 Intelligent routing (Module M4)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-040 | System shall automatically route task after classification | Must | Default on intake; assignee set without manual step |
| FR-041 | Routing shall consider workload and task priority | Must | Documented scoring in doc 09 |
| FR-042 | System shall persist routing decision with rationale | Must | JSON explainability for UI and thesis |
| FR-043 | System shall exclude unavailable or overloaded users | Must | Configurable max active tasks |
| FR-044 | Manager/admin may override assignee | Must | Manual PATCH documented in API |
| FR-045 | System shall log routing processing time | Must | `processing_time_ms` on routing_decision |

## 2.8 Authentication and administration

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-001 | JWT authentication for API and UI | Must | Login returns access token |
| FR-002 | Role-based access control | Must | admin, manager, employee |
| FR-003 | Admin manages users and departments | Must | CRUD per doc 04 |
| FR-004 | Health endpoint for deployment | Must | `/health` |

## 2.9 Analytics and evaluation (specification criteria)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-050 | Manager shall view workload distribution view | Must | Per-user bars or table |
| FR-051 | System shall provide evaluation export/report | Must | Supports thesis chapter |
| FR-080 | **Distribution efficiency** metric | Must | e.g. std dev of workload before/after routing batch |
| FR-081 | **Processing time** metric | Must | p50/p95 for classify + route pipeline |
| FR-082 | **Classification accuracy** metric | Must | Precision/recall/F1 on held-out labeled set |

## 2.10 Simple UI (specification)

| ID | Requirement | Priority | Acceptance criteria |
|----|-------------|----------|---------------------|
| FR-070 | UI shall provide task submission form | Must | Title, description, channel |
| FR-071 | UI shall provide task status list/detail | Must | Status badge, assignee, priority |
| FR-072 | UI shall show classification and routing summary | Should | Human-readable, not raw JSON only |

## 2.11 Business rules

| Rule | Description |
|------|-------------|
| BR-01 | Pipeline order: intake → classify → workload read → route → assign |
| BR-02 | Completed/cancelled tasks excluded from active workload |
| BR-03 | Priority enum: low, medium, high, critical (NLP maps to enum) |
| BR-04 | Routing candidates: active users in task department (or whole org if configured) |
| BR-05 | If no eligible assignee, task stays `open` with routing failure reason logged |

## 2.12 MoSCoW summary

**Must:** All FR-015–045, 001–004, 050, 070–071, 080–082

**Should:** FR-023, 034, 072

**Won't v1:** Live email ingestion, Jira sync

## 2.13 Out of scope

- Commercial multi-tenant product features
- Full project-management parity with Asana/Jira
- Non-English NLP (future)

## 2.14 Assumptions

| ID | Item |
|----|------|
| A-FR-01 | Categories: administrative, support, technical, finance, general |
| A-FR-02 | Skills catalog optional for v1 routing; workload + priority are primary signals per spec emphasis |
