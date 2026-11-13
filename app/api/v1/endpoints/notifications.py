from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Annotated
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.notification import NotificationListResponse, UnreadCountResponse
from app.services.notification_service import (
    NotFoundError,
    delete_notification,
    get_unread_count,
    list_notifications,
    mark_all_as_read,
    mark_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    unread_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = list_notifications(
        db, current_user, unread_only=unread_only, limit=limit, offset=offset
    )
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return {"unread_count": get_unread_count(db, current_user)}

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        mark_as_read(db, current_user, notification_id)
        return {"status": "success"}
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)

@router.patch("/read-all")
def mark_all_notifications_read(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    count = mark_all_as_read(db, current_user)
    return {"updated_count": count}

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification_endpoint(
    notification_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        delete_notification(db, current_user, notification_id)
        return None
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.detail)
