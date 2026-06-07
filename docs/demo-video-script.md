# ITROS Demo Video Script (~5 minutes)

Use this script for a diploma committee or supervisor walkthrough.

## Setup (before recording)

1. `docker compose up --build`
2. Open http://localhost:5173 and http://localhost:8000/docs
3. Optional: `docker compose exec api python scripts/run_evaluation.py`

## 1. Introduction (0:00–0:45)

> "This is ITROS — Intelligent Task Routing and Workload Optimization for office environments. The system accepts tasks, classifies them with NLP, and automatically assigns them to the team member with the best workload balance."

Show dashboard after login as **manager@itros.local**.

## 2. Task intake and automatic pipeline (0:45–2:00)

1. Go to **Submit task**.
2. Enter example:
   - Title: `URGENT server outage in datacenter`
   - Description: `Production API is down, customers cannot login. Need immediate fix.`
3. Submit and open task detail.

> "On submit, the pipeline runs: NLP assigns category and priority, then the routing engine picks an assignee using workload and priority weights."

Point out:

- Classification category/priority
- Routing rationale summary
- Assignee name

## 3. Workload view (2:00–2:45)

1. Open **Team workload**.
2. Show per-employee active task counts.

> "Managers see distribution across the team — this supports the distribution-efficiency evaluation in the thesis."

## 4. API and architecture (2:45–3:30)

1. Open Swagger at `/docs`.
2. Briefly show `POST /tasks`, `GET /workload`, `POST /evaluation/run`.

> "The backend is FastAPI with PostgreSQL; ML uses scikit-learn TF-IDF models trained from labeled office tasks."

## 5. Evaluation metrics (3:30–4:30)

Run or show pre-generated `docs/evaluation-results.md`:

- **FR-080:** workload std dev improvement vs baseline
- **FR-081:** classification + routing latency (sub-second)
- **FR-082:** category F1 on held-out test set

> "All three specification evaluation dimensions are reproducible with the evaluation script."

## 6. Closing (4:30–5:00)

> "ITROS demonstrates end-to-end intelligent routing in a Dockerized prototype suitable for office task management research. Manual override and admin APIs are available for managers."

Show logout and mention demo accounts in README.
