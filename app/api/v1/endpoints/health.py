
from fastapi import APIRouter

router = APIRouter()


@router.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to Smart Task Management API",
        "status": "running"
    }


@router.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "smart-task-api"
    }
