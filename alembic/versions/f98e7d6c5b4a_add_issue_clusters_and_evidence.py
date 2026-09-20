"""add issue clusters and evidence fields (safe rewrite)

Original revision that may have failed in production due to pgvector dependency.
This version is rewritten to be safe and idempotent using raw SQL.

Revision ID: f98e7d6c5b4a
Revises: 1202bc698384
Create Date: 2026-09-17 13:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'f98e7d6c5b4a'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :tbl AND column_name = :col"
    ), {"tbl": table, "col": column})
    return result.fetchone() is not None


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_name = :tbl"
    ), {"tbl": table})
    return result.fetchone() is not None


def _index_exists(conn, index: str) -> bool:
    result = conn.execute(text(
        "SELECT 1 FROM pg_indexes WHERE indexname = :idx"
    ), {"idx": index})
    return result.fetchone() is not None


def _pgvector_available(conn) -> bool:
    try:
        result = conn.execute(text(
            "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
        ))
        return result.fetchone() is not None
    except Exception:
        return False


def upgrade() -> None:
    conn = op.get_bind()

    # Ensure pgvector extension (best-effort)
    try:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        pass

    # 1. Create issue_clusters table if not already present
    if not _table_exists(conn, "issue_clusters"):
        conn.execute(text("""
            CREATE TABLE issue_clusters (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                representative_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
                category        complaintcategoryenum NOT NULL,
                status          complaintstatusenum NOT NULL DEFAULT 'submitted',
                calculated_priority complaintpriorityenum NOT NULL DEFAULT 'medium',
                centroid_latitude  FLOAT NOT NULL DEFAULT 0.0,
                centroid_longitude FLOAT NOT NULL DEFAULT 0.0,
                report_count    INTEGER NOT NULL DEFAULT 1,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at      TIMESTAMPTZ
            )
        """))

    for idx_name, tbl, col in [
        ("ix_issue_clusters_category",           "issue_clusters", "category"),
        ("ix_issue_clusters_status",             "issue_clusters", "status"),
        ("ix_issue_clusters_calculated_priority","issue_clusters", "calculated_priority"),
        ("ix_issue_clusters_representative_complaint_id", "issue_clusters", "representative_complaint_id"),
    ]:
        if not _index_exists(conn, idx_name):
            conn.execute(text(f"CREATE INDEX {idx_name} ON {tbl} ({col})"))

    # 2. Add cluster_id to complaints if missing
    if not _column_exists(conn, "complaints", "cluster_id"):
        conn.execute(text(
            "ALTER TABLE complaints ADD COLUMN cluster_id UUID "
            "REFERENCES issue_clusters(id) ON DELETE SET NULL"
        ))
    if not _index_exists(conn, "ix_complaints_cluster_id"):
        conn.execute(text(
            "CREATE INDEX ix_complaints_cluster_id ON complaints (cluster_id)"
        ))

    # 3. Add evidence_url if missing
    if not _column_exists(conn, "complaints", "evidence_url"):
        conn.execute(text(
            "ALTER TABLE complaints ADD COLUMN evidence_url VARCHAR(500)"
        ))

    # 4. Add image_embedding if missing (optional, pgvector required)
    if not _column_exists(conn, "complaints", "image_embedding"):
        if _pgvector_available(conn):
            try:
                conn.execute(text(
                    "ALTER TABLE complaints ADD COLUMN image_embedding vector(384)"
                ))
            except Exception:
                pass


def downgrade() -> None:
    conn = op.get_bind()

    if _index_exists(conn, "ix_complaints_cluster_id"):
        conn.execute(text("DROP INDEX ix_complaints_cluster_id"))
    if _column_exists(conn, "complaints", "image_embedding"):
        conn.execute(text("ALTER TABLE complaints DROP COLUMN image_embedding"))
    if _column_exists(conn, "complaints", "evidence_url"):
        conn.execute(text("ALTER TABLE complaints DROP COLUMN evidence_url"))
    if _column_exists(conn, "complaints", "cluster_id"):
        conn.execute(text("ALTER TABLE complaints DROP COLUMN cluster_id"))
    if _table_exists(conn, "issue_clusters"):
        conn.execute(text("DROP TABLE issue_clusters"))
