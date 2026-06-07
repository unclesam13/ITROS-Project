# ITROS

**Intelligent Task Routing and Workload Optimization System for Office Environments**

Diploma engineering prototype: automatically classify, prioritize, and route office tasks using NLP (scikit-learn) and workload-aware optimization.

**Repository:** [github.com/unclesam13/ITROS-Project](https://github.com/unclesam13/ITROS-Project) (ITROS Project)

## Status

| Area | Status |
|------|--------|
| Architecture | Complete — see [`docs/`](docs/) |
| Implementation | Phases 1–6 complete — see [docs/11-development-roadmap.md](docs/11-development-roadmap.md) |
| GitHub | [docs/github-workflow.md](docs/github-workflow.md) |

## Documentation

Start here: **[docs/README.md](docs/README.md)**

| Topic | Document |
|-------|----------|
| System overview | [docs/01-system-overview.md](docs/01-system-overview.md) |
| Requirements | [docs/02-functional-requirements.md](docs/02-functional-requirements.md) |
| Roadmap | [docs/11-development-roadmap.md](docs/11-development-roadmap.md) |
| Git workflow | [docs/github-workflow.md](docs/github-workflow.md) |

## Technology stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, JWT
- **ML/NLP:** scikit-learn (primary), spaCy, sentence-transformers
- **Frontend:** React, TypeScript, Vite
- **Deploy:** Docker, Docker Compose

Details: [docs/12-technology-stack.md](docs/12-technology-stack.md)

## Quick start

```bash
git clone https://github.com/unclesam13/ITROS-Project.git
cd ITROS-Project
copy .env.example .env   # Windows
docker compose up --build
```

- API: http://localhost:8000/docs  
- UI: http://localhost:5173  
- Demo login: `manager@itros.local` / `itros123` (also `admin@itros.local`, `employee@itros.local`)

## Demo walkthrough

1. Login as manager → **Submit task** with an urgent IT/support description.
2. Open task detail → verify classification, routing summary, and assignee.
3. **Team workload** → view load distribution.
4. Login as admin → run evaluation via API or script (see below).

Video script: [docs/demo-video-script.md](docs/demo-video-script.md)

## Evaluation (Phase 6)

Thesis metrics FR-080–082 are documented in [docs/evaluation-results.md](docs/evaluation-results.md).

```bash
# Generate report (local)
cd backend
python -m app.ml.train
python scripts/run_evaluation.py

# Or inside Docker
docker compose exec api python scripts/run_evaluation.py
```

**API** (admin JWT):

- `POST /api/v1/evaluation/run` — run batch evaluation
- `GET /api/v1/evaluation/report` — latest JSON report
- `GET /api/v1/analytics/pipeline` — task counts by status

## Tests

```bash
cd backend && python -m pytest tests/ -v
```

## License

See [LICENSE](LICENSE).
