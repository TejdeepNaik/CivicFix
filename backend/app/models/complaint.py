"""Complaint SQLAlchemy model definition."""

import uuid
import enum
from sqlalchemy import Column, String, Float, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from ..db.base import Base


class ComplaintStatusEnum(str, enum.Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    CLOSED = "closed"


class ComplaintPriorityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplaintCategoryEnum(str, enum.Enum):
    POTHOLE = "pothole"
    STREETLIGHT = "streetlight"
    GARBAGE = "garbage"
    WATER_LEAK = "water_leak"
    TRAFFIC_SIGNAL = "traffic_signal"
    DRAINAGE = "drainage"
    NOISE_POLLUTION = "noise_pollution"
    OTHER = "other"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_worker_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(
        SQLEnum(ComplaintCategoryEnum, name="complaintcategoryenum"),
        default=ComplaintCategoryEnum.OTHER,
        nullable=False,
        index=True
    )
    status = Column(
        SQLEnum(ComplaintStatusEnum, name="complaintstatusenum"),
        default=ComplaintStatusEnum.SUBMITTED,
        nullable=False,
        index=True
    )
    priority = Column(
        SQLEnum(ComplaintPriorityEnum, name="complaintpriorityenum"),
        default=ComplaintPriorityEnum.MEDIUM,
        nullable=False,
        index=True
    )

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)

    # 384-dimensional vector embedding for pgvector AI similarity search
    embedding = Column(Vector(384), nullable=True)

    assigned_at = Column(DateTime(timezone=True), nullable=True)

    # Resolution fields
    resolution_notes = Column(Text, nullable=True)
    resolution_evidence = Column(String(500), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Citizen Verification fields
    is_verified = Column(Boolean, default=False, nullable=False)
    is_satisfied = Column(Boolean, nullable=True)
    feedback_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="complaints")
    assigned_worker = relationship("User", foreign_keys=[assigned_worker_id], back_populates="assigned_complaints")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    department = relationship("Department", back_populates="complaints")
    activities = relationship(
        "ComplaintActivity",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintActivity.created_at"
    )
    notifications = relationship(
        "Notification",
        back_populates="complaint",
        cascade="all, delete-orphan"
    )
