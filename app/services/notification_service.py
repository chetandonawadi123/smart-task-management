from datetime import datetime, timezone
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.services.websocket_manager import manager


class NotFoundError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _get_unread_count_by_user_id(db: Session, user_id: int) -> int:
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return int(count or 0)


def dispatch_notification_event(
    db: Session,
    recipient_id: int,
    event_type: str,
    notification: Notification | None = None,
    notification_id: int | None = None,
):
    unread_count = _get_unread_count_by_user_id(db, recipient_id)

    payload = {
        "event": event_type,
        "unread_count": unread_count,
    }

    if notification:
        payload["notification"] = {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "created_at": notification.created_at.isoformat(),
            "is_read": notification.is_read,
            "task_id": notification.task_id,
        }
    elif notification_id:
        payload["notification"] = {
            "id": notification_id
        }

    manager.send_event_sync(recipient_id, payload)


def create_notification(
    db: Session,
    *,
    recipient_id: int,
    organization_id: int,
    actor_id: int | None = None,
    task_id: int | None = None,
    notification_type: str,
    title: str,
    message: str,
) -> Notification | None:
    # Avoid notifying users about their own actions
    if actor_id is not None and recipient_id == actor_id:
        return None

    notification = Notification(
        recipient_id=recipient_id,
        organization_id=organization_id,
        actor_id=actor_id,
        task_id=task_id,
        notification_type=notification_type,
        title=title,
        message=message,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    return notification


def list_notifications(
    db: Session,
    user: User,
    *,
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Notification], int]:
    filters = [
        Notification.recipient_id == user.id,
        Notification.organization_id == user.organization_id,
    ]
    if unread_only:
        filters.append(Notification.is_read.is_(False))

    total = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(*filters)
    )

    items = list(
        db.scalars(
            select(Notification)
            .where(*filters)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return items, int(total or 0)


def get_unread_count(db: Session, user: User) -> int:
    return _get_unread_count_by_user_id(db, user.id)


def mark_as_read(db: Session, user: User, notification_id: int) -> Notification:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == user.id,
            Notification.organization_id == user.organization_id,
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    dispatch_notification_event(db, user.id, "notification.read", notification)
    return notification


def mark_all_as_read(db: Session, user: User) -> int:
    result = db.execute(
        update(Notification)
        .where(
            Notification.recipient_id == user.id,
            Notification.organization_id == user.organization_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    db.commit()

    dispatch_notification_event(db, user.id, "notification.read_all")
    return result.rowcount


def delete_notification(db: Session, user: User, notification_id: int) -> None:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_id == user.id,
            Notification.organization_id == user.organization_id,
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found")

    db.delete(notification)
    db.commit()

    dispatch_notification_event(db, user.id, "notification.deleted", notification_id=notification_id)
