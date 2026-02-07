"""add composite index for resource instance version listing

Revision ID: 7c3e9f6d2a11
Revises: e51b25cdbeb5
Create Date: 2026-02-08 03:05:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7c3e9f6d2a11"
down_revision: Union[str, Sequence[str], None] = "e51b25cdbeb5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_resource_instances_resource_created_at",
        "ai_resource_instances",
        ["resource_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_resource_instances_resource_created_at",
        table_name="ai_resource_instances",
    )

