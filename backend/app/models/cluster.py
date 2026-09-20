"""IssueCluster SQLAlchemy model definition."""

import uuid
import enum
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy.orm import relationship
from ..db.base import Base
from .complaint import ComplaintCategoryEnum, ComplaintPriorityEnum, ComplaintStatusEnum


class IssueCluster(Base):
    """Represents a cluster of complaints referring to the same underlying civic problem."""

    __tablename__ = "issue_clusters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    representative_complaint_id = Column(
        String(36),
        ForeignKey("complaints.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    category = Column(
        SQLEnum(ComplaintCategoryEnum, name="complaintcategoryenum"),
        nullable=False,
        index=True
    )
    status = Column(
        SQLEnum(ComplaintStatusEnum, name="complaintstatusenum"),
        default=ComplaintStatusEnum.SUBMITTED,
        nullable=False,
        index=True
    )
    calculated_priority = Column(
        SQLEnum(ComplaintPriorityEnum, name="complaintpriorityenum"),
        default=ComplaintPriorityEnum.MEDIUM,
        nullable=False,
        index=True
    )

    centroid_latitude = Column(Float, nullable=False)
    centroid_longitude = Column(Float, nullable=False)
    report_count = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    complaints = relationship("Complaint", foreign_keys="Complaint.cluster_id", back_populates="cluster")
    representative_complaint = relationship("Complaint", foreign_keys=[representative_complaint_id])
