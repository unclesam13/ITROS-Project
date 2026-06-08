# GitHub Repository Workflow

**Repository:** [https://github.com/unclesam13/ITROS-Project](https://github.com/unclesam13/ITROS-Project)  
**Display name:** ITROS Project  
**Owner:** `unclesam13`  
**Default branch:** `main`

Keep all project changes in sync with this repository for version control and thesis traceability.

## When to push

| Event | Action |
|-------|--------|
| Architecture doc updates | Commit to `docs/` on `main` |
| Phase completion (see roadmap) | Push working code + update README |
| Evaluation results | Add `docs/evaluation-results.md` |
| Before diploma demo | Tag release e.g. `v0.1.0-demo` |

## Local Git workflow

```bash
cd ITROS
git remote -v   # should point to ITROS-Project
git add .
git commit -m "feat(backend): describe your change"
git push origin main
```

### First-time clone

```bash
git clone https://github.com/unclesam13/ITROS-Project.git
cd ITROS-Project
cp .env.example .env
```

## Branch strategy (prototype)

| Branch | Purpose |
|--------|---------|
| `main` | Stable demo-ready code and docs |
| `feature/*` | Optional per roadmap phase |

## Commit message convention

```
docs: update API design
feat(backend): add task intake service
feat(ml): train category classifier v1
fix(frontend): task list status filter
chore(docker): add postgres healthcheck
```

## Files not committed

See root `.gitignore`: `.env`, `node_modules/`, `__pycache__/`, ML `.joblib` binaries, etc.

## Sync checklist

- [ ] Committed with a clear message
- [ ] `git push origin main` succeeds
- [ ] README phase status is current
- [ ] No secrets in the diff
