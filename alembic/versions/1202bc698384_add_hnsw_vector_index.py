"""add_hnsw_vector_index

Revision ID: 1202bc698384
Revises: 'e7ad5104814d'
Create Date: 2026-09-14 02:52:19.847683

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1202bc698384'
down_revision: Union[str, None] = 'e7ad5104814d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_embedding_hnsw ON complaints USING hnsw (embedding vector_cosine_ops);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_complaints_embedding_hnsw;")

