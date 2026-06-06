#!/bin/sh
set -e
cd /app
alembic upgrade head
python scripts/seed.py
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
