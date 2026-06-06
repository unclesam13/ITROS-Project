from fastapi import APIRouter

from app.api.v1 import auth, departments, health, tasks, users, workload

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(workload.router, prefix="/workload", tags=["workload"])
