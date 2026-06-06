# Official Specification Extract

Source: diploma project specification PDF (text provided by author). This file is the traceability anchor for architecture documents.

## Project name

**Intelligent Task Routing and Workload Optimization System for Office Environments** (ITROS)

## Purpose

Design and implement an intelligent system that **automatically classifies, prioritizes, and routes** tasks in office environments based on:

- Task content (NLP)
- Employee workload

Solves: unbalanced task distribution, manual assignment, delays from poor prioritization.

Target context: office environments and administrative teams; tasks from **emails, forms, and internal systems**.

## Brief description

- Processes incoming task descriptions
- Classifies using NLP
- Assigns to most suitable employee based on **workload and priority**
- Modules: **task intake**, **text-based classification**, **workload monitoring**, **intelligent task routing**
- **Simple UI**: submit tasks and monitor status
- **Prototype** demonstrating AI + optimization for office workflow
- **Evaluation**: task distribution efficiency, processing time, system accuracy

## Competitor analysis (summary)

Traditional tools (Trello, Asana, Jira, Microsoft Planner): manual assignment, no intelligent routing from content + workload. ITROS differentiator: automated NLP classification and workload-aware routing.

## Technologies (official list)

- Python (core + NLP)
- FastAPI
- PostgreSQL
- Scikit-learn (ML and NLP models)
- HTML, CSS, JavaScript (UI)
- Git

## Architecture (official)

Modular: frontend, backend, machine learning module, database.

- Frontend: task submission and visualization
- Backend: business logic, routing, integration
- Python for ML/NLP; scikit-learn for interpretable academic models
- Relational DB for tasks, users, workload metrics
- FastAPI/Flask for lightweight scalable backend

## Implementation note (team stack)

The implementation retains the author-selected stack (FastAPI, PostgreSQL, React + TypeScript, Docker, JWT) while honoring scikit-learn as the **primary** ML/NLP library per specification. spaCy and sentence-transformers are used as supporting preprocessing/embedding layers feeding scikit-learn classifiers.
