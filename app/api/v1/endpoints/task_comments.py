import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.task_comment import (
    TaskCommentCreate,
    TaskCommentListResponse,
    TaskCommentResponse,
    TaskCommentUpdate,
)
from app.services.task_comment_service import (
    CommentAccessError,
    create_comment,
    delete_comment,
    list_comments,
    update_comment,
)
from app.services.task_service import MembershipError, NotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()


def _database_error(action: str) -> HTTPException:
    logger.exception("Database error while trying to %s", action)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unable to {action}",
    )


def _execute(action: str, operation):
    try:
        return operation()
    except NotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error.detail,
        ) from None
    except MembershipError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error.detail,
        ) from None
    except CommentAccessError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error.detail,
        ) from None
    except SQLAlchemyError:
        raise _database_error(action) from None


@router.post(
    "/tasks/{task_id}/comments",
    response_model=TaskCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment_endpoint(
    task_id: int,
    data: TaskCommentCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "create comment",
        lambda: create_comment(db, current_user, task_id, data),
    )


@router.get(
    "/tasks/{task_id}/comments",
    response_model=TaskCommentListResponse,
)
def list_comments_endpoint(
    task_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    def operation():
        items, total = list_comments(
            db,
            current_user,
            task_id,
            limit=limit,
            offset=offset,
        )
        return TaskCommentListResponse(
            items=[
                TaskCommentResponse.model_validate(item, from_attributes=True)
                for item in items
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    return _execute("list comments", operation)


@router.put(
    "/comments/{comment_id}",
    response_model=TaskCommentResponse,
)
def update_comment_endpoint(
    comment_id: int,
    data: TaskCommentUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "update comment",
        lambda: update_comment(db, current_user, comment_id, data),
    )


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment_endpoint(
    comment_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _execute("delete comment", lambda: delete_comment(db, current_user, comment_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
