import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _project_or_404(
    db: Session,
    organization_id: int,
    project_id: int,
) -> Project:
    project = get_project(db, organization_id, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


def _database_error(action: str) -> HTTPException:
    logger.exception("Database error while trying to %s a project", action)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unable to {action} project",
    )


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_endpoint(
    data: ProjectCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return create_project(db, current_user, data)
    except SQLAlchemyError:
        raise _database_error("create") from None


@router.get("/", response_model=list[ProjectResponse])
def list_projects_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return list_projects(db, current_user.organization_id)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_endpoint(
    project_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _project_or_404(db, current_user.organization_id, project_id)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project_endpoint(
    project_id: int,
    data: ProjectUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    project = _project_or_404(db, current_user.organization_id, project_id)

    try:
        return update_project(db, project, data)
    except SQLAlchemyError:
        raise _database_error("update") from None


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_endpoint(
    project_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    project = _project_or_404(db, current_user.organization_id, project_id)

    try:
        delete_project(db, project)
    except SQLAlchemyError:
        raise _database_error("delete") from None

    return Response(status_code=status.HTTP_204_NO_CONTENT)
