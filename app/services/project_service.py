from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


def _commit(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def create_project(db: Session, user: User, data: ProjectCreate) -> Project:
    project = Project(
        organization_id=user.organization_id,
        owner_id=user.id,
        name=data.name,
        description=data.description,
    )

    try:
        db.add(project)
        db.flush()
        db.add(
            ProjectMember(
                project_id=project.id,
                user_id=user.id,
            )
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    db.refresh(project)
    return project


def list_projects(db: Session, organization_id: int) -> list[Project]:
    statement = (
        select(Project)
        .where(Project.organization_id == organization_id)
        .order_by(Project.created_at.desc(), Project.id.desc())
    )
    return list(db.scalars(statement))


def get_project(
    db: Session,
    organization_id: int,
    project_id: int,
) -> Project | None:
    statement = select(Project).where(
        Project.id == project_id,
        Project.organization_id == organization_id,
    )
    return db.scalar(statement)


def update_project(
    db: Session,
    project: Project,
    data: ProjectUpdate,
) -> Project:
    project.name = data.name
    project.description = data.description
    _commit(db)
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    _commit(db)
