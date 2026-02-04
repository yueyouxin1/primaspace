"""move resources to workspace

Revision ID: 4b1f3b9e2c1a
Revises: b0cd9c56f0b2
Create Date: 2026-02-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b1f3b9e2c1a'
down_revision: Union[str, Sequence[str], None] = 'b0cd9c56f0b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ai_resources', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_workspace_id'), 'ai_resources', ['workspace_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_ai_resources_workspace_id_ai_workspaces'),
        'ai_resources',
        'ai_workspaces',
        ['workspace_id'],
        ['id'],
        ondelete='CASCADE'
    )

    op.execute(
        """
        UPDATE ai_resources AS r
        SET workspace_id = p.workspace_id
        FROM ai_projects AS p
        WHERE r.project_id = p.id
        """
    )

    op.create_table(
        'ai_project_resource_refs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('alias', sa.String(length=255), nullable=True),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['ai_projects.id'], name=op.f('fk_ai_project_resource_refs_project_id_ai_projects'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_id'], ['ai_resources.id'], name=op.f('fk_ai_project_resource_refs_resource_id_ai_resources'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_ai_project_resource_refs')),
        sa.UniqueConstraint('project_id', 'resource_id', name='uq_project_resource')
    )
    op.create_index(op.f('ix_ai_project_resource_refs_project_id'), 'ai_project_resource_refs', ['project_id'], unique=False)
    op.create_index(op.f('ix_ai_project_resource_refs_resource_id'), 'ai_project_resource_refs', ['resource_id'], unique=False)

    op.execute(
        """
        INSERT INTO ai_project_resource_refs (project_id, resource_id, created_at)
        SELECT project_id, id, now()
        FROM ai_resources
        WHERE project_id IS NOT NULL
        """
    )

    op.alter_column('ai_resources', 'workspace_id', nullable=False)
    op.drop_constraint('fk_ai_resources_project_id_ai_projects', 'ai_resources', type_='foreignkey')
    op.drop_index('ix_project_id', table_name='ai_resources')
    op.drop_column('ai_resources', 'project_id')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('ai_resources', sa.Column('project_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_project_id'), 'ai_resources', ['project_id'], unique=False)
    op.create_foreign_key(
        op.f('fk_ai_resources_project_id_ai_projects'),
        'ai_resources',
        'ai_projects',
        ['project_id'],
        ['id'],
        ondelete='CASCADE'
    )

    op.execute(
        """
        UPDATE ai_resources AS r
        SET project_id = sub.project_id
        FROM (
            SELECT resource_id, MIN(project_id) AS project_id
            FROM ai_project_resource_refs
            GROUP BY resource_id
        ) AS sub
        WHERE r.id = sub.resource_id
        """
    )

    op.alter_column('ai_resources', 'project_id', nullable=False)
    op.drop_index(op.f('ix_workspace_id'), table_name='ai_resources')
    op.drop_constraint('fk_ai_resources_workspace_id_ai_workspaces', 'ai_resources', type_='foreignkey')
    op.drop_column('ai_resources', 'workspace_id')

    op.drop_index(op.f('ix_ai_project_resource_refs_resource_id'), table_name='ai_project_resource_refs')
    op.drop_index(op.f('ix_ai_project_resource_refs_project_id'), table_name='ai_project_resource_refs')
    op.drop_table('ai_project_resource_refs')
