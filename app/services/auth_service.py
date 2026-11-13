
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.user import User
from app.schemas.user import UserRegister
from app.core.security import (
    hash_password,
    verify_password
)


def register_user(db: Session, data: UserRegister) -> User:

    existing_user = db.scalar(
        select(User).where(User.email == data.email)
    )

    if existing_user:
        raise ValueError("Email is already registered")

    existing_organization = db.scalar(
        select(Organization).where(
            Organization.name == data.organization_name
        )
    )

    if existing_organization:
        raise ValueError("Organization name is already registered")

    organization = Organization(
        name=data.organization_name
    )

    db.add(organization)
    db.flush()

    user = User(
        organization_id=organization.id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role="admin"
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception:
        db.rollback()
        raise


def authenticate_user(
    db: Session,
    email: str,
    password: str
) -> User | None:

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
