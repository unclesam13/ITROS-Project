"""add routing_note to tasks

Revision ID: 003
Revises: 002
Create Date: 2026-06-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("routing_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "routing_note")
