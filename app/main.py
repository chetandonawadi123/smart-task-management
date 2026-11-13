
from fastapi import FastAPI

from app.api.v1.endpoints import auth, health, info, projects


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
