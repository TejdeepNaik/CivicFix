"""Notification model for in-app user notifications."""

import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..db.base import Base


class NotificationTypeEnum(str, enum.Enum):
    # Citizen notifications
    COMPLAINT_SUBMITTED = "complaint_submitted"
    DEPARTMENT_ASSIGNED = "department_assigned"
    DEPARTMENT_CHANGED = "department_changed"
    WORKER_ASSIGNED = "worker_assigned"
    STATUS_CHANGED = "status_changed"
    COMPLAINT_RESOLVED = "complaint_resolved"
    RESOLUTION_REQUIRES_VERIFICATION = "resolution_requires_verification"
    COMPLAINT_CLOSED = "complaint_closed"
    COMPLAINT_REOPENED = "complaint_reopened"
    # Worker notifications
    COMPLAINT_ASSIGNED_TO_WORKER = "complaint_assigned_to_worker"
    COMPLAINT_REASSIGNED = "complaint_reassigned"
    COMPLAINT_RETURNED_FOR_REWORK = "complaint_returned_for_rework"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    complaint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    notification_type = Column(
        SQLEnum(NotificationTypeEnum, name="notificationtypeenum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        index=True
    )
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)

    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="notifications")
    complaint = relationship("Complaint", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_recipient_is_read", "recipient_id", "is_read"),
        Index("ix_notifications_recipient_created", "recipient_id", "created_at"),
    )
