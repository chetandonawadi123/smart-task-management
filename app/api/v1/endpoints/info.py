
from fastapi import APIRouter

router = APIRouter()


@router.get("/info", tags=["General"])
def application_info():
    return {
        "application": "Smart Task Management API",
        "version": "1.0.0",
        "framework": "FastAPI",
        "description": "Team collaboration and task management"
    }
