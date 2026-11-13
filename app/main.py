
from fastapi import FastAPI

from app.api.v1.endpoints import auth, dashboard, health, info, notifications, projects, task_comments, tasks, ws


app = FastAPI(
    title="Smart Task Management API",
    description="Backend API for managing teams, projects and tasks.",
    version="1.0.0"
)


app.include_router(
    health.router,
    tags=["Health"]
)

app.include_router(
    info.router,
    prefix="/api/v1",
    tags=["General"]
)

app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    projects.router,
    prefix="/api/v1/projects",
    tags=["Projects"]
)

app.include_router(
    tasks.project_tasks_router,
    prefix="/api/v1/projects/{project_id}/tasks",
    tags=["Tasks"]
)

app.include_router(
    tasks.task_router,
    prefix="/api/v1/tasks",
    tags=["Tasks"]
)

app.include_router(
    task_comments.router,
    prefix="/api/v1",
    tags=["Task Comments"]
)

app.include_router(
    dashboard.router,
    prefix="/api/v1",
    tags=["Dashboard"]
)

app.include_router(
    notifications.router,
    prefix="/api/v1",
    tags=["Notifications"]
)

app.include_router(
    ws.router,
    prefix="/api/v1",
    tags=["WebSockets"]
)
