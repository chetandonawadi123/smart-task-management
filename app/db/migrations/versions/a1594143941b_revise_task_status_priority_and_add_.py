"""revise task status priority and add updated_at

Revision ID: a1594143941b
Revises: b9650619e47a
Create Date: 2026-11-13 20:09:41.866573

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1594143941b'
down_revision: Union[str, Sequence[str], None] = 'b9650619e47a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow the new status and priority values, then record updates."""
    op.drop_constraint("check_task_status", "tasks", type_="check")
    op.drop_constraint("check_task_priority", "tasks", type_="check")

    op.execute("UPDATE tasks SET status = 'done' WHERE status = 'completed'")
    op.execute("UPDATE tasks SET priority = 'critical' WHERE priority = 'urgent'")

    op.add_column(
        "tasks",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL")
    op.alter_column(
        "tasks",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )

    op.create_check_constraint(
        "check_task_status",
        "tasks",
        "status IN ('todo', 'in_progress', 'in_review', 'done')",
    )
    op.create_check_constraint(
        "check_task_priority",
        "tasks",
        "priority IN ('low', 'medium', 'high', 'critical')",
    )


def downgrade() -> None:
    """Restore the previous status and priority values."""
    op.drop_constraint("check_task_status", "tasks", type_="check")
    op.drop_constraint("check_task_priority", "tasks", type_="check")

    op.execute("UPDATE tasks SET status = 'completed' WHERE status = 'done'")
    op.execute("UPDATE tasks SET status = 'in_progress' WHERE status = 'in_review'")
    op.execute("UPDATE tasks SET priority = 'urgent' WHERE priority = 'critical'")

    op.drop_column("tasks", "updated_at")

    op.create_check_constraint(
        "check_task_status",
        "tasks",
        "status IN ('todo', 'in_progress', 'completed')",
    )
    op.create_check_constraint(
        "check_task_priority",
        "tasks",
        "priority IN ('low', 'medium', 'high', 'urgent')",
    )
