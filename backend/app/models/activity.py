"""Complaint Activity / audit-trail model."""

import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, ForeignKey, func
# Use String for UUID fields for SQLite compatibility
from sqlalchemy.orm import relationship

from ..db.base import Base


class ActivityEventEnum(str, enum.Enum):
    COMPLAINT_CREATED = "complaint_created"
    DEPARTMENT_ASSIGNED = "department_assigned"
    DEPARTMENT_CHANGED = "department_changed"
    WORKER_ASSIGNED = "worker_assigned"
    WORKER_UNASSIGNED = "worker_unassigned"
    STATUS_CHANGED = "status_changed"
    PRIORITY_CHANGED = "priority_changed"
    COMPLAINT_RESOLVED = "complaint_resolved"
    RESOLUTION_VERIFIED = "resolution_verified"
    COMPLAINT_CLOSED = "complaint_closed"
    COMPLAINT_REOPENED = "complaint_reopened"
    REWORK_REQUESTED = "rework_requested"


class ComplaintActivity(Base):
    __tablename__ = "complaint_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(
        String(36),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    actor_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    event_type = Column(
        SQLEnum(ActivityEventEnum, name="activityeventenum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        index=True
    )
    previous_value = Column(String(500), nullable=True)
    new_value = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Relationships
    complaint = relationship("Complaint", back_populates="activities")
    actor = relationship("User", foreign_keys=[actor_id])
