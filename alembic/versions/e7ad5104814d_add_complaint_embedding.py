"""add_complaint_embedding

Revision ID: e7ad5104814d
Revises: '94325590dc48'
Create Date: 2026-09-14 02:31:33.412078

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector


# revision identifiers, used by Alembic.
revision: str = 'e7ad5104814d'
down_revision: Union[str, None] = '94325590dc48'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    op.add_column('complaints', sa.Column('embedding', pgvector.sqlalchemy.Vector(384), nullable=True))


def downgrade() -> None:
    op.drop_column('complaints', 'embedding')
