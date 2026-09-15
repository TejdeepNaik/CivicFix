"""add_department_model_and_routing_fields

Revision ID: e5017952f1f3
Revises: 'ec9a04ca11e0'
Create Date: 2026-09-14 03:11:28.820872

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5017952f1f3'
down_revision: Union[str, None] = 'ec9a04ca11e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create departments table
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_code'), 'departments', ['code'], unique=True)
    op.create_index(op.f('ix_departments_name'), 'departments', ['name'], unique=True)

    # Add department_id to users
    op.add_column('users', sa.Column('department_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_users_department_id_departments', 'users', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_users_department_id'), 'users', ['department_id'], unique=False)

    # Add department_id to complaints
    op.add_column('complaints', sa.Column('department_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_complaints_department_id_departments', 'complaints', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_complaints_department_id'), 'complaints', ['department_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_complaints_department_id'), table_name='complaints')
    op.drop_constraint('fk_complaints_department_id_departments', 'complaints', type_='foreignkey')
    op.drop_column('complaints', 'department_id')

    op.drop_index(op.f('ix_users_department_id'), table_name='users')
    op.drop_constraint('fk_users_department_id_departments', 'users', type_='foreignkey')
    op.drop_column('users', 'department_id')

    op.drop_index(op.f('ix_departments_name'), table_name='departments')
    op.drop_index(op.f('ix_departments_code'), table_name='departments')
    op.drop_table('departments')
