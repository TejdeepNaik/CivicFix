"""add_resolution_and_verification_fields

Revision ID: ec9a04ca11e0
Revises: '1202bc698384'
Create Date: 2026-09-14 03:06:41.003861

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec9a04ca11e0'
down_revision: Union[str, None] = '1202bc698384'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('complaints', sa.Column('resolution_notes', sa.Text(), nullable=True))
    op.add_column('complaints', sa.Column('resolution_evidence', sa.String(length=500), nullable=True))
    op.add_column('complaints', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('complaints', sa.Column('resolved_by_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_complaints_resolved_by_id_users', 'complaints', 'users', ['resolved_by_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_complaints_resolved_by_id'), 'complaints', ['resolved_by_id'], unique=False)

    op.add_column('complaints', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('complaints', sa.Column('is_satisfied', sa.Boolean(), nullable=True))
    op.add_column('complaints', sa.Column('feedback_notes', sa.Text(), nullable=True))
    op.add_column('complaints', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('complaints', 'verified_at')
    op.drop_column('complaints', 'feedback_notes')
    op.drop_column('complaints', 'is_satisfied')
    op.drop_column('complaints', 'is_verified')

    op.drop_index(op.f('ix_complaints_resolved_by_id'), table_name='complaints')
    op.drop_constraint('fk_complaints_resolved_by_id_users', 'complaints', type_='foreignkey')
    op.drop_column('complaints', 'resolved_by_id')
    op.drop_column('complaints', 'resolved_at')
    op.drop_column('complaints', 'resolution_evidence')
    op.drop_column('complaints', 'resolution_notes')
