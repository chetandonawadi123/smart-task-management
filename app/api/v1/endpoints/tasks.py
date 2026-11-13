import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.task import (
    TaskAssigneeUpdate,
    TaskCreate,
    TaskListResponse,
    TaskPriority,
    TaskResponse,
    TaskStatus,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.task_service import (
    AssigneeError,
    MembershipError,
    NotFoundError,
    create_task,
    delete_task,
    get_task,
    list_tasks,
    update_task,
    update_task_assignee,
    update_task_status,
)


logger = logging.getLogger(__name__)

project_tasks_router = APIRouter()
task_router = APIRouter()


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
    except AssigneeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=error.detail,
        ) from None
    except SQLAlchemyError:
        raise _database_error(action) from None


@project_tasks_router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task_endpoint(
    project_id: int,
    data: TaskCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "create task",
        lambda: create_task(db, current_user, project_id, data),
    )


@project_tasks_router.get("/", response_model=TaskListResponse)
def list_tasks_endpoint(
    project_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[
        TaskStatus | None,
        Query(alias="status"),
    ] = None,
    priority_filter: Annotated[
        TaskPriority | None,
        Query(alias="priority"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    def operation():
        items, total = list_tasks(
            db,
            current_user,
            project_id,
            status=status_filter,
            priority=priority_filter,
            limit=limit,
            offset=offset,
        )
        return TaskListResponse(
            items=[
                TaskResponse.model_validate(item, from_attributes=True)
                for item in items
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    return _execute("list tasks", operation)


@task_router.get("/{task_id}", response_model=TaskResponse)
def get_task_endpoint(
    task_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute("retrieve task", lambda: get_task(db, current_user, task_id))


@task_router.put("/{task_id}", response_model=TaskResponse)
def update_task_endpoint(
    task_id: int,
    data: TaskUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "update task",
        lambda: update_task(db, current_user, task_id, data),
    )


@task_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_endpoint(
    task_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _execute("delete task", lambda: delete_task(db, current_user, task_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@task_router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status_endpoint(
    task_id: int,
    data: TaskStatusUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "update task status",
        lambda: update_task_status(db, current_user, task_id, data),
    )


@task_router.patch("/{task_id}/assignee", response_model=TaskResponse)
def update_task_assignee_endpoint(
    task_id: int,
    data: TaskAssigneeUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _execute(
        "assign task",
        lambda: update_task_assignee(db, current_user, task_id, data),
    )
