# ITROS

**Intelligent Task Routing and Workload Optimization System for Office Environments**

Diploma engineering prototype: automatically classify, prioritize, and route office tasks using NLP (scikit-learn) and workload-aware optimization.

**Repository:** [github.com/unclesam13/ITROS-Project](https://github.com/unclesam13/ITROS-Project) (ITROS Project)

## Status

| Area | Status |
|------|--------|
| Architecture | Complete — see [`docs/`](docs/) |
| Implementation | Phase 0 scaffold — see [docs/11-development-roadmap.md](docs/11-development-roadmap.md) |
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

## Quick start (after implementation)

```bash
git clone https://github.com/unclesam13/ITROS-Project.git
cd ITROS-Project
cp .env.example .env
docker compose up --build
```

## License

See [LICENSE](LICENSE).
