"""add_activity_and_notification_tables

Revision ID: a1b2c3d4e5f6
Revises: e5017952f1f3
Create Date: 2026-09-15 02:48:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e5017952f1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum values
ACTIVITY_EVENT_ENUM_VALUES = [
    'complaint_created', 'department_assigned', 'department_changed',
    'worker_assigned', 'worker_unassigned', 'status_changed', 'priority_changed',
    'complaint_resolved', 'resolution_verified', 'complaint_closed',
    'complaint_reopened', 'rework_requested',
]

NOTIFICATION_TYPE_ENUM_VALUES = [
    'complaint_submitted', 'department_assigned', 'department_changed',
    'worker_assigned', 'status_changed', 'complaint_resolved',
    'resolution_requires_verification', 'complaint_closed', 'complaint_reopened',
    'complaint_assigned_to_worker', 'complaint_reassigned', 'complaint_returned_for_rework',
]


def upgrade() -> None:
    conn = op.get_bind()

    # Create enums via raw SQL with IF NOT EXISTS (safe even if already partially created)
    conn.execute(sa.text(
        "CREATE TYPE activityeventenum AS ENUM ("
        + ", ".join(f"'{v}'" for v in ACTIVITY_EVENT_ENUM_VALUES)
        + ")"
    ))
    conn.execute(sa.text(
        "CREATE TYPE notificationtypeenum AS ENUM ("
        + ", ".join(f"'{v}'" for v in NOTIFICATION_TYPE_ENUM_VALUES)
        + ")"
    ))

    # Create complaint_activities table
    op.create_table(
        'complaint_activities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('complaint_id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=True),
        sa.Column(
            'event_type',
            postgresql.ENUM(*ACTIVITY_EVENT_ENUM_VALUES, name='activityeventenum', create_type=False),
            nullable=False
        ),
        sa.Column('previous_value', sa.String(length=500), nullable=True),
        sa.Column('new_value', sa.String(length=500), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_complaint_activities_complaint_id', 'complaint_activities', ['complaint_id'])
    op.create_index('ix_complaint_activities_actor_id', 'complaint_activities', ['actor_id'])
    op.create_index('ix_complaint_activities_event_type', 'complaint_activities', ['event_type'])
    op.create_index('ix_complaint_activities_created_at', 'complaint_activities', ['created_at'])

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('complaint_id', sa.UUID(), nullable=True),
        sa.Column(
            'notification_type',
            postgresql.ENUM(*NOTIFICATION_TYPE_ENUM_VALUES, name='notificationtypeenum', create_type=False),
            nullable=False
        ),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['complaint_id'], ['complaints.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])
    op.create_index('ix_notifications_complaint_id', 'notifications', ['complaint_id'])
    op.create_index('ix_notifications_notification_type', 'notifications', ['notification_type'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_recipient_is_read', 'notifications', ['recipient_id', 'is_read'])
    op.create_index('ix_notifications_recipient_created', 'notifications', ['recipient_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_recipient_created', table_name='notifications')
    op.drop_index('ix_notifications_recipient_is_read', table_name='notifications')
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_notification_type', table_name='notifications')
    op.drop_index('ix_notifications_complaint_id', table_name='notifications')
    op.drop_index('ix_notifications_recipient_id', table_name='notifications')
    op.drop_table('notifications')

    op.drop_index('ix_complaint_activities_created_at', table_name='complaint_activities')
    op.drop_index('ix_complaint_activities_event_type', table_name='complaint_activities')
    op.drop_index('ix_complaint_activities_actor_id', table_name='complaint_activities')
    op.drop_index('ix_complaint_activities_complaint_id', table_name='complaint_activities')
    op.drop_table('complaint_activities')

    conn = op.get_bind()
    conn.execute(sa.text('DROP TYPE IF EXISTS notificationtypeenum'))
    conn.execute(sa.text('DROP TYPE IF EXISTS activityeventenum'))
