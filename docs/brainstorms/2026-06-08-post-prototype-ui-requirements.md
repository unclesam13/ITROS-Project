---
title: Post-Prototype UI & Product Polish
status: implemented
date: 2026-06-08
type: brainstorm-requirements
timeline: submission 2026-06-10; defense ~1 month later
---

# Post-Prototype UI & Product Polish

## Summary

Transform ITROS from a functional prototype into a **professional, deployable-looking product** for diploma submission (10 June 2026) and defense. **Wave 1 + Wave 2 delivered together:** Tailwind UI, dashboard charts, task CRUD, comments, Kanban, search/filters/bulk actions, admin heatmap and user management.

## Problem Frame

Phases 0–6 delivered a working backend (auth, NLP routing, evaluation) but the React UI uses inline styles and minimal pages. The commission’s first impression is the website, not Swagger. The student must submit a 6–10 slide PowerPoint and uploaded project by **10 June**, then defend ~one month later. The gap is **perceived production readiness**, not core algorithm correctness.

## Key Decisions

- **KD1 — Reuse `deadline`, not `due_date`.** The `Task` model already has a nullable `deadline` column (`backend/app/models/entities.py`). UI labels it “Due date”; no new migration.
- **KD2 — Delete = soft cancel.** Align with `docs/10-rest-api-design.md`: set `status=cancelled` rather than hard DELETE. Confirmation modal still required in UI.
- **KD3 — Tailwind + recharts in Wave 1.** Add design system and chart library; defer `@dnd-kit` until Kanban wave.
- **KD4 — Dashboard becomes default landing page** after login (replaces link-only `DashboardPage`).
- **KD5 — Wave 1 over breadth.** Submission deadline (2 days) rules out Kanban, bulk actions, and admin UI pages.

## Actors

| ID | Actor | Wave 1 role |
|----|-------|-------------|
| A1 | Admin | Full task edit/cancel; dashboard; comments |
| A2 | Manager | Department-scoped tasks; dashboard; comments |
| A3 | Employee | Own open tasks cancel; assigned task view; comments |
| A4 | Commission / reviewer | First impression via dashboard + polished UI (read-only demo) |

## Requirements

### Visual design & shell

- R1. Install and configure Tailwind CSS across the frontend with a consistent app shell: top nav, page container, typography, and color tokens.
- R2. Restyle login, dashboard, task list, task detail, task submit, and workload pages to use the shared design system (no raw inline-only layouts).
- R3. UI must be responsive on laptop and tablet widths (defense demo screen).

### Dashboard (Prompt 2 — Wave 1)

- R4. Dashboard is the default route after login (`/`).
- R5. Show four summary stat cards: Total Tasks, Open, In Progress, Completed Today — with color coding and simple icons.
- R6. Donut/pie chart: task count by status (`open`, `assigned`, `in_progress`, `completed`, `cancelled`) using recharts; data from `GET /api/v1/analytics/pipeline`.
- R7. Horizontal bar chart: active task count per employee from `GET /api/v1/workload`.
- R8. Line chart: tasks completed per day for last 14 days; requires new backend endpoint `GET /api/v1/analytics/completed-over-time` returning `{ date, count }[]`.
- R9. Dashboard shows loading and empty states.

### Task CRUD & due dates (Prompt 1 — adjusted)

- R10. `PATCH /api/v1/tasks/{id}` accepts `priority` in addition to existing fields.
- R11. `DELETE /api/v1/tasks/{id}` or equivalent cancel endpoint: admin/manager can cancel any task in their scope; employee can cancel only own tasks in `open` status.
- R12. Task list and detail show due date (`deadline`); render **red** when past due and status is not `completed` or `cancelled`.
- R13. Task detail (or edit drawer) allows editing title, description, priority, and due date.
- R14. Delete/cancel action shows a **confirmation modal** before proceeding.

### Task comments (Prompt 4 — Wave 1)

- R15. `POST /api/v1/tasks/{id}/comments` and `GET /api/v1/tasks/{id}/comments` for authenticated users with task access (FR-023).
- R16. Task detail page shows scrollable comment thread (author name, timestamp, body) and a “Send” input to post comments.

### Submission artifacts (non-code)

- R17. PowerPoint (6–10 slides) covers: problem, architecture, NLP + routing, evaluation metrics (`docs/evaluation-results.md`), dashboard screenshot, Docker deployment, future work (Wave 2).
- R18. Screenshots for submission use the polished Wave 1 UI, not the current raw inline-style pages.

## Key Flows

- F1. **Commission demo open**
  - **Trigger:** Reviewer opens `http://localhost:5173` after `docker compose up`.
  - **Actors:** A4
  - **Steps:** Login as manager → land on dashboard with charts → open task list → view task with classification, routing, comments → submit new task.
  - **Outcome:** Product appears deployable and feature-complete for office task routing.

- F2. **Cancel task**
  - **Trigger:** User clicks delete on task detail or list.
  - **Actors:** A1, A2, A3 (scoped)
  - **Steps:** Confirmation modal → API cancel → task status becomes `cancelled` → removed or greyed in active lists.
  - **Outcome:** Safe deletion without data loss; audit-friendly soft cancel.

## Scope Boundaries

### In scope — Wave 1 (by 10 June)

- R1–R18 above

### Deferred — Wave 2 (pre-defense, ~1 month)

- **Prompt 3 — Kanban board:** list/kanban toggle, drag-and-drop (`@dnd-kit`), status transition rules, quick actions on cards.
- **Prompt 5 — Admin UI:** workload heatmap grid, user management CRUD UI (APIs largely exist).
- **Prompt 6 — Search & bulk:** server-side `?search=` filters, multi-select bulk assign/status/delete.

### Out of scope

- Hard DELETE of task rows from database
- New `due_date` column (use `deadline`)
- Mobile-native app
- Real email intake integration

## Acceptance Examples

- AE1. **Overdue due date**
  - **Covers:** R12
  - **Given:** A task with `deadline` yesterday and status `assigned`
  - **When:** User views task list or detail
  - **Then:** Due date text is styled red

- AE2. **Employee cancel own open task**
  - **Covers:** R11, R14
  - **Given:** Employee created a task in `open` status
  - **When:** Employee confirms cancel in modal
  - **Then:** Task status is `cancelled`; employee cannot cancel another user’s assigned task

- AE3. **Dashboard charts load**
  - **Covers:** R4–R9
  - **Given:** Seeded org with tasks in multiple statuses
  - **When:** Manager logs in
  - **Then:** Dashboard shows stat cards and three charts without errors

## Dependencies & Assumptions

- Docker Compose demo remains the deployment story (`README.md`).
- Existing evaluation harness and backend auth remain unchanged.
- Wave 1 may use **client-side filtering** on task list if server-side search is deferred.
- Defense demo can still show admin APIs via Swagger for features deferred to Wave 2.

## Recommended build order (2-day sprint)

| Day | Focus |
|-----|-------|
| Day 1 AM | Tailwind setup + app shell + restyle login/nav |
| Day 1 PM | Dashboard backend endpoint + dashboard page with recharts |
| Day 2 AM | Task CRUD UI + cancel API + due date display + edit form |
| Day 2 PM | Comments API + detail UI + screenshots + PowerPoint draft |

## Handoff

Next step: run `/ce-plan` on this document for implementation sequencing, or start Wave 1 directly in Agent mode.
