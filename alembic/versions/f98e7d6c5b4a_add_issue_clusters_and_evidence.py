"""add issue clusters and evidence fields

Revision ID: f98e7d6c5b4a
Revises: 1202bc698384
Create Date: 2026-09-17 13:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'f98e7d6c5b4a'
down_revision = '1202bc698384'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create issue_clusters table
    op.create_table(
        'issue_clusters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('representative_complaint_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('complaints.id', ondelete='SET NULL'), nullable=True),
        sa.Column('category', postgresql.ENUM('POTHOLE', 'STREETLIGHT', 'GARBAGE', 'WATER_LEAK', 'TRAFFIC_SIGNAL', 'DRAINAGE', 'NOISE_POLLUTION', 'OTHER', name='complaintcategoryenum', create_type=False), nullable=False),
        sa.Column('status', postgresql.ENUM('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED', name='complaintstatusenum', create_type=False), nullable=False),
        sa.Column('calculated_priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='complaintpriorityenum', create_type=False), nullable=False),
        sa.Column('centroid_latitude', sa.Float(), nullable=False),
        sa.Column('centroid_longitude', sa.Float(), nullable=False),
        sa.Column('report_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_issue_clusters_category', 'issue_clusters', ['category'])
    op.create_index('ix_issue_clusters_status', 'issue_clusters', ['status'])
    op.create_index('ix_issue_clusters_calculated_priority', 'issue_clusters', ['calculated_priority'])
    op.create_index('ix_issue_clusters_representative_complaint_id', 'issue_clusters', ['representative_complaint_id'])

    # 2. Add columns to complaints table
    op.add_column('complaints', sa.Column('cluster_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('issue_clusters.id', ondelete='SET NULL'), nullable=True))
    op.add_column('complaints', sa.Column('evidence_url', sa.String(length=500), nullable=True))
    op.add_column('complaints', sa.Column('image_embedding', Vector(384), nullable=True))
    op.create_index('ix_complaints_cluster_id', 'complaints', ['cluster_id'])


def downgrade() -> None:
    op.drop_index('ix_complaints_cluster_id', table_name='complaints')
    op.drop_column('complaints', 'image_embedding')
    op.drop_column('complaints', 'evidence_url')
    op.drop_column('complaints', 'cluster_id')

    op.drop_index('ix_issue_clusters_representative_complaint_id', table_name='issue_clusters')
    op.drop_index('ix_issue_clusters_calculated_priority', table_name='issue_clusters')
    op.drop_index('ix_issue_clusters_status', table_name='issue_clusters')
    op.drop_index('ix_issue_clusters_category', table_name='issue_clusters')
    op.drop_table('issue_clusters')
