"""remove cancelled task status

Revision ID: 002
Revises: 001
Create Date: 2026-06-08
"""

from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM task_comments WHERE task_id IN (SELECT id FROM tasks WHERE status = 'cancelled')"
    )
    op.execute(
        "DELETE FROM task_classifications WHERE task_id IN (SELECT id FROM tasks WHERE status = 'cancelled')"
    )
    op.execute(
        "DELETE FROM routing_decisions WHERE task_id IN (SELECT id FROM tasks WHERE status = 'cancelled')"
    )
    op.execute("DELETE FROM tasks WHERE status = 'cancelled'")
    op.execute("ALTER TYPE task_status RENAME TO task_status_old")
    op.execute("CREATE TYPE task_status AS ENUM ('open', 'assigned', 'in_progress', 'completed')")
    op.execute(
        "ALTER TABLE tasks ALTER COLUMN status TYPE task_status "
        "USING status::text::task_status"
    )
    op.execute("DROP TYPE task_status_old")


def downgrade() -> None:
    op.execute("ALTER TYPE task_status RENAME TO task_status_new")
    op.execute(
        "CREATE TYPE task_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled')"
    )
    op.execute(
        "ALTER TABLE tasks ALTER COLUMN status TYPE task_status "
        "USING status::text::task_status"
    )
    op.execute("DROP TYPE task_status_new")
