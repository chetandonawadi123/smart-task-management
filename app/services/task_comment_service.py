from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.task_comment import TaskComment
from app.models.user import User
from app.schemas.task_comment import TaskCommentCreate, TaskCommentUpdate
from app.services.notification_service import create_notification, dispatch_notification_event
from app.services.task_service import (
    MembershipError,
    NotFoundError,
    _commit,
    _require_task,
)


class CommentAccessError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _require_comment(db: Session, user: User, comment_id: int) -> TaskComment:
    comment = db.scalar(select(TaskComment).where(TaskComment.id == comment_id))
    if comment is None:
        raise NotFoundError("Comment not found")

    # Check if user belongs to the project associated with this comment's task
    _require_task(db, user, comment.task_id)
    return comment


def create_comment(
    db: Session,
    user: User,
    task_id: int,
    data: TaskCommentCreate,
) -> TaskComment:
    # _require_task performs the necessary organization/project-membership check
    task = _require_task(db, user, task_id)

    comment = TaskComment(
        task_id=task_id,
        user_id=user.id,
        comment=data.comment.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)

    # Notify task creator and assignee, excluding author
    recipients = set()
    if task.created_by != user.id:
        recipients.add(task.created_by)
    if task.assigned_to and task.assigned_to != user.id:
        recipients.add(task.assigned_to)

    notifs = []
    for r_id in recipients:
        n = create_notification(
            db,
            recipient_id=r_id,
            organization_id=user.organization_id,
            actor_id=user.id,
            task_id=task_id,
            notification_type="new_comment",
            title="New Comment on Task",
            message=f"New comment on task '{task.title}' by {user.name}",
        )
        if n:
            notifs.append(n)

    _commit(db)
    db.refresh(comment)

    for n in notifs:
        dispatch_notification_event(db, n.recipient_id, "notification.created", n)

    return comment


def list_comments(
    db: Session,
    user: User,
    task_id: int,
    *,
    limit: int,
    offset: int,
) -> tuple[list[TaskComment], int]:
    _require_task(db, user, task_id)

    total = db.scalar(
        select(func.count()).select_from(TaskComment).where(TaskComment.task_id == task_id)
    )
    items = list(
        db.scalars(
            select(TaskComment)
            .where(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.desc(), TaskComment.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return items, int(total or 0)


def update_comment(
    db: Session,
    user: User,
    comment_id: int,
    data: TaskCommentUpdate,
) -> TaskComment:
    comment = _require_comment(db, user, comment_id)
    if comment.user_id != user.id:
        raise CommentAccessError("Only the author can update this comment")

    comment.comment = data.comment.strip()
    _commit(db)
    db.refresh(comment)
    return comment


def delete_comment(db: Session, user: User, comment_id: int) -> None:
    comment = _require_comment(db, user, comment_id)
    if comment.user_id != user.id:
        raise CommentAccessError("Only the author can delete this comment")

    db.delete(comment)
    _commit(db)
