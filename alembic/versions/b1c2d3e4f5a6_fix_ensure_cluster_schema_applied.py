"""fix_ensure_cluster_schema_applied

The previous migration f98e7d6c5b4a may have been stamped (marked complete)
without actually running due to an earlier migration failure + recovery stamp.
This migration re-applies all required schema changes idempotently using raw SQL
with IF NOT EXISTS / column-exists guards, so it is safe to run even if the
previous migration partially or fully succeeded.

Revision ID: b1c2d3e4f5a6
Revises: f98e7d6c5b4a
Create Date: 2026-09-21 00:00:00.000000

"""
from alembic import op
from sqlalchemy import text

revision = 'b1c2d3e4f5a6'
down_revision = 'f98e7d6c5b4a'
branch_labels = None
depends_on = None


def _col(conn, table, column):
    r = conn.execute(text(
        "SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    return r.fetchone() is not None


def _tbl(conn, table):
    r = conn.execute(text(
        "SELECT 1 FROM information_schema.tables WHERE table_name=:t"
    ), {"t": table})
    return r.fetchone() is not None


def _idx(conn, index):
    r = conn.execute(text(
        "SELECT 1 FROM pg_indexes WHERE indexname=:i"
    ), {"i": index})
    return r.fetchone() is not None


def _pgvec(conn):
    try:
        r = conn.execute(text("SELECT 1 FROM pg_extension WHERE extname='vector'"))
        return r.fetchone() is not None
    except Exception:
        return False


def upgrade():
    conn = op.get_bind()

    # 1. Ensure pgvector extension
    try:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        pass

    # 2. Create issue_clusters table if missing
    if not _tbl(conn, "issue_clusters"):
        conn.execute(text("""
            CREATE TABLE issue_clusters (
                id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                representative_complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
                category                    complaintcategoryenum NOT NULL,
                status                      complaintstatusenum   NOT NULL DEFAULT 'submitted',
                calculated_priority         complaintpriorityenum NOT NULL DEFAULT 'medium',
                centroid_latitude           FLOAT NOT NULL DEFAULT 0.0,
                centroid_longitude          FLOAT NOT NULL DEFAULT 0.0,
                report_count                INTEGER NOT NULL DEFAULT 1,
                created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at                  TIMESTAMPTZ
            )
        """))
        print("[migration b1c2d3e4f5a6] Created issue_clusters table")

    for idx, tbl, col in [
        ("ix_issue_clusters_category",                    "issue_clusters", "category"),
        ("ix_issue_clusters_status",                      "issue_clusters", "status"),
        ("ix_issue_clusters_calculated_priority",         "issue_clusters", "calculated_priority"),
        ("ix_issue_clusters_representative_complaint_id", "issue_clusters", "representative_complaint_id"),
    ]:
        if not _idx(conn, idx):
            conn.execute(text(f"CREATE INDEX {idx} ON {tbl} ({col})"))

    # 3. Add cluster_id to complaints
    if not _col(conn, "complaints", "cluster_id"):
        conn.execute(text(
            "ALTER TABLE complaints ADD COLUMN cluster_id UUID "
            "REFERENCES issue_clusters(id) ON DELETE SET NULL"
        ))
        print("[migration b1c2d3e4f5a6] Added cluster_id to complaints")
    if not _idx(conn, "ix_complaints_cluster_id"):
        conn.execute(text("CREATE INDEX ix_complaints_cluster_id ON complaints (cluster_id)"))

    # 4. Add evidence_url to complaints
    if not _col(conn, "complaints", "evidence_url"):
        conn.execute(text("ALTER TABLE complaints ADD COLUMN evidence_url VARCHAR(500)"))
        print("[migration b1c2d3e4f5a6] Added evidence_url to complaints")

    # 5. Add image_embedding (non-critical, best-effort)
    if not _col(conn, "complaints", "image_embedding"):
        if _pgvec(conn):
            try:
                conn.execute(text("ALTER TABLE complaints ADD COLUMN image_embedding vector(384)"))
                print("[migration b1c2d3e4f5a6] Added image_embedding to complaints")
            except Exception as e:
                print(f"[migration b1c2d3e4f5a6] image_embedding skipped: {e}")

    # 6. Ensure base embedding column exists
    if not _col(conn, "complaints", "embedding"):
        if _pgvec(conn):
            try:
                conn.execute(text("ALTER TABLE complaints ADD COLUMN embedding vector(384)"))
                print("[migration b1c2d3e4f5a6] Added embedding to complaints")
            except Exception as e:
                print(f"[migration b1c2d3e4f5a6] embedding skipped: {e}")


def downgrade():
    conn = op.get_bind()
    # No-op downgrade: schema additions are safe to leave in place
    pass
