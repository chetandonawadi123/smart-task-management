import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.dashboard import (
    DashboardOverview,
    ProjectAnalytics,
    RecentActivity,
    RecentActivityItem,
    TaskAnalytics,
    TeamAnalytics,
)
from app.services.dashboard_service import (
    get_dashboard_overview,
    get_project_analytics,
    get_recent_activity,
    get_task_analytics,
    get_team_analytics,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _database_error(action: str) -> HTTPException:
    logger.exception("Database error while trying to %s", action)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unable to {action}",
    )


@router.get("/overview", response_model=DashboardOverview)
def dashboard_overview(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return get_dashboard_overview(db, current_user.organization_id)
    except SQLAlchemyError:
        raise _database_error("retrieve dashboard overview")


@router.get("/task-analytics", response_model=TaskAnalytics)
def task_analytics(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return get_task_analytics(db, current_user.organization_id)
    except SQLAlchemyError:
        raise _database_error("retrieve task analytics")


@router.get("/project-analytics", response_model=ProjectAnalytics)
def project_analytics(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return get_project_analytics(db, current_user.organization_id)
    except SQLAlchemyError:
        raise _database_error("retrieve project analytics")


@router.get("/team-analytics", response_model=TeamAnalytics)
def team_analytics(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return get_team_analytics(db, current_user.organization_id)
    except SQLAlchemyError:
        raise _database_error("retrieve team analytics")


@router.get("/recent-activity", response_model=RecentActivity)
def recent_activity(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    try:
        items, total = get_recent_activity(
            db, current_user.organization_id, limit=limit, offset=offset
        )
        return RecentActivity(
            items=[RecentActivityItem.model_validate(item, from_attributes=True) for item in items],
            total=total,
            limit=limit,
            offset=offset,
        )
    except SQLAlchemyError:
        raise _database_error("retrieve recent activity")
