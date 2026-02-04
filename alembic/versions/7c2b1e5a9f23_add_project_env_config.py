"""add project env config

Revision ID: 7c2b1e5a9f23
Revises: 4b1f3b9e2c1a
Create Date: 2026-02-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2b1e5a9f23'
down_revision: Union[str, Sequence[str], None] = '4b1f3b9e2c1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ai_projects', sa.Column('env_config', sa.JSON(), nullable=False, server_default=sa.text("'{}'")))
    op.alter_column('ai_projects', 'env_config', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ai_projects', 'env_config')
