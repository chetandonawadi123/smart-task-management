from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.task import (
    TaskAssigneeUpdate,
    TaskCreate,
    TaskPriority,
    TaskStatus,
    TaskStatusUpdate,
    TaskUpdate,
)


class NotFoundError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class MembershipError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class AssigneeError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def _is_member(db: Session, project_id: int, user_id: int) -> bool:
    statement = select(ProjectMember.user_id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    )
    return db.scalar(statement) is not None


def _require_project(db: Session, user: User, project_id: int) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == user.organization_id,
        )
    )
    if project is None:
        raise NotFoundError("Project not found")
    if not _is_member(db, project.id, user.id):
        raise MembershipError("You are not a member of this project")
    return project


def _require_task(db: Session, user: User, task_id: int) -> Task:
    task = db.scalar(
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Task.id == task_id,
            Project.organization_id == user.organization_id,
        )
    )
    if task is None:
        raise NotFoundError("Task not found")
    if not _is_member(db, task.project_id, user.id):
        raise MembershipError("You are not a member of this project")
    return task


def _require_assignee(
    db: Session,
    project_id: int,
    organization_id: int,
    assignee_id: int,
) -> None:
    assignee = db.scalar(select(User).where(User.id == assignee_id))
    if assignee is None or assignee.organization_id != organization_id:
        raise NotFoundError("Assignee not found")
    if not assignee.is_active:
        raise AssigneeError("Assignee must be an active user")
    if not _is_member(db, project_id, assignee.id):
        raise AssigneeError("Assignee must be a member of the project")


def _touch(task: Task) -> None:
    task.updated_at = datetime.now(timezone.utc)


def create_task(
    db: Session,
    user: User,
    project_id: int,
    data: TaskCreate,
) -> Task:
    project = _require_project(db, user, project_id)
    if data.assigned_to is not None:
        _require_assignee(db, project.id, user.organization_id, data.assigned_to)

    now = datetime.now(timezone.utc)
    task = Task(
        project_id=project.id,
        created_by=user.id,
        assigned_to=data.assigned_to,
        title=data.title,
        description=data.description,
        status=data.status.value,
        priority=data.priority.value,
        due_date=data.due_date,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    _commit(db)
    db.refresh(task)
    return task


def list_tasks(
    db: Session,
    user: User,
    project_id: int,
    *,
    status: TaskStatus | None,
    priority: TaskPriority | None,
    limit: int,
    offset: int,
) -> tuple[list[Task], int]:
    project = _require_project(db, user, project_id)
    filters = [Task.project_id == project.id]
    if status is not None:
        filters.append(Task.status == status.value)
    if priority is not None:
        filters.append(Task.priority == priority.value)

    total = db.scalar(select(func.count()).select_from(Task).where(*filters))
    items = list(
        db.scalars(
            select(Task)
            .where(*filters)
            .order_by(Task.created_at.desc(), Task.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return items, int(total or 0)


def get_task(db: Session, user: User, task_id: int) -> Task:
    return _require_task(db, user, task_id)


def update_task(
    db: Session,
    user: User,
    task_id: int,
    data: TaskUpdate,
) -> Task:
    task = _require_task(db, user, task_id)
    task.title = data.title
    task.description = data.description
    task.priority = data.priority.value
    task.due_date = data.due_date
    _touch(task)
    _commit(db)
    db.refresh(task)
    return task


def update_task_status(
    db: Session,
    user: User,
    task_id: int,
    data: TaskStatusUpdate,
) -> Task:
    task = _require_task(db, user, task_id)
    task.status = data.status.value
    _touch(task)
    _commit(db)
    db.refresh(task)
    return task


def update_task_assignee(
    db: Session,
    user: User,
    task_id: int,
    data: TaskAssigneeUpdate,
) -> Task:
    task = _require_task(db, user, task_id)
    if data.assigned_to is not None:
        _require_assignee(
            db,
            task.project_id,
            user.organization_id,
            data.assigned_to,
        )
    task.assigned_to = data.assigned_to
    _touch(task)
    _commit(db)
    db.refresh(task)
    return task


def delete_task(db: Session, user: User, task_id: int) -> None:
    task = _require_task(db, user, task_id)
    db.delete(task)
    _commit(db)
