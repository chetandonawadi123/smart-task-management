from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    recipient: Mapped["User"] = relationship(foreign_keys=[recipient_id])
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
    task: Mapped["Task | None"] = relationship()
