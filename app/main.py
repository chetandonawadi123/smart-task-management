
from fastapi import FastAPI

# Create FastAPI application
app = FastAPI(
    title="Smart Task Management API",
    description="A backend application for managing teams, projects and tasks.",
    version="1.0.0"
)


# Root endpoint
@app.get("/", tags=["General"])
def root():
    return {
        "message": "Welcome to Smart Task Management API",
        "status": "running"
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "smart-task-api"
    }


# Application information endpoint
@app.get("/api/v1/info", tags=["General"])
def application_info():
    return {
        "application": "Smart Task Management API",
        "version": "1.0.0",
        "framework": "FastAPI",
        "description": "Team collaboration and task management"
    }
