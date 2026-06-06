# ITROS Architecture Documentation

**ITROS** — *Intelligent Task Routing and Workload Optimization System for Office Environments*

Official specification text: [specification-extract.md](specification-extract.md)

This folder contains architecture for the diploma **prototype**: modular frontend, backend, ML module, and database, aligned with the specification and implemented with the team technology choices (FastAPI, PostgreSQL, React + TypeScript, scikit-learn, Docker).

## Document index

| # | Document | Description |
|---|----------|-------------|
| — | [specification-extract.md](specification-extract.md) | Official PDF text extract (traceability source) |
| 1 | [01-system-overview.md](01-system-overview.md) | Vision, modules, competitor context, workflows |
| 2 | [02-functional-requirements.md](02-functional-requirements.md) | FR-IDs mapped to specification |
| 3 | [03-non-functional-requirements.md](03-non-functional-requirements.md) | Performance, security, **evaluation metrics** |
| 4 | [04-user-roles.md](04-user-roles.md) | RBAC, permissions, JWT claims |
| 5 | [05-database-schema.md](05-database-schema.md) | ERD, tables, indexes, migrations |
| 6 | [06-backend-architecture.md](06-backend-architecture.md) | FastAPI layering, four core modules |
| 7 | [07-frontend-architecture.md](07-frontend-architecture.md) | Simple UI: submit + monitor status |
| 8 | [08-nlp-classification-module.md](08-nlp-classification-module.md) | scikit-learn–centric NLP pipeline |
| 9 | [09-workload-optimization-algorithm.md](09-workload-optimization-algorithm.md) | Workload-aware routing |
| 10 | [10-rest-api-design.md](10-rest-api-design.md) | REST resources, auth, errors |
| 11 | [11-development-roadmap.md](11-development-roadmap.md) | Phased prototype delivery |
| 12 | [12-technology-stack.md](12-technology-stack.md) | Stack vs specification justification |
| — | [github-workflow.md](github-workflow.md) | Sync with [ITROS Project repo](https://github.com/unclesam13/ITROS-Project) |

## GitHub repository

**Remote:** [https://github.com/unclesam13/ITROS-Project](https://github.com/unclesam13/ITROS-Project)

Keep local changes and this documentation aligned with the remote. See [github-workflow.md](github-workflow.md) for branch strategy, commit conventions, and MCP/git push options.

## Specification traceability

| PDF section | Primary doc |
|-------------|-------------|
| Purpose / problem | 01-system-overview.md |
| Brief description / modules | 01, 02, 06 |
| Competitor analysis | 01-system-overview.md §1.11 |
| Evaluation criteria | 03-non-functional-requirements.md §3.12 |
| Technology list | 12-technology-stack.md |
| Modular architecture | 06, 07, 08, 09 |

## Glossary

| Term | Definition |
|------|------------|
| **Task intake** | Entry of task descriptions (UI form simulating email/form/internal sources) |
| **Classification** | NLP-derived category and priority from text |
| **Workload monitoring** | Tracking active load per employee for routing |
| **Intelligent routing** | Automatic assignment to suitable employee |
| **Prototype** | End-to-end demonstrator, not commercial SaaS |

## Four specification modules → implementation

| Spec module | Implementation |
|-------------|----------------|
| Task intake | `TaskIntakeService`, UI submit form, `intake_channel` field |
| Text-based classification | `ml/classification` (scikit-learn + preprocessing) |
| Workload monitoring | `WorkloadService`, `workload_snapshots` |
| Intelligent task routing | `RoutingService`, optimizer in §09 |

## Approval gate

No application code until architecture is reviewed and approved. Implementation: [11-development-roadmap.md](11-development-roadmap.md).
