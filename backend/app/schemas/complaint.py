"""Complaint request and response Pydantic schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from ..models.complaint import (
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum
)


class ComplaintBase(BaseModel):
    title: str = Field(..., max_length=200, description="Title of the complaint")
    description: str = Field(..., description="Detailed description of the civic issue")
    category: ComplaintCategoryEnum = Field(default=ComplaintCategoryEnum.OTHER)
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    address: Optional[str] = Field(None, max_length=500, description="Optional street address / location text")
    evidence_url: Optional[str] = Field(None, max_length=500, description="Optional evidence photo URL/path")


class ComplaintCreate(ComplaintBase):
    title: str = Field(..., min_length=3, max_length=200, description="Title of the complaint")
    description: str = Field(..., min_length=10, description="Detailed description of the civic issue")
    priority: Optional[ComplaintPriorityEnum] = ComplaintPriorityEnum.MEDIUM


class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[ComplaintCategoryEnum] = None
    status: Optional[ComplaintStatusEnum] = None
    priority: Optional[ComplaintPriorityEnum] = None
    assigned_worker_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, max_length=500)
    evidence_url: Optional[str] = Field(None, max_length=500)


class ComplaintResolveRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=5, description="Details on how the issue was resolved")
    resolution_evidence: Optional[str] = Field(None, max_length=500, description="Optional photo URL or evidence text")


class ComplaintVerifyRequest(BaseModel):
    is_satisfied: bool = Field(default=True, description="True to accept resolution and close complaint; False to reject and request rework")
    feedback_notes: Optional[str] = Field(None, max_length=500, description="Optional citizen feedback or rework notes")


class ComplaintResponse(ComplaintBase):
    id: UUID
    citizen_id: UUID
    assigned_worker_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    cluster_id: Optional[UUID] = None
    status: ComplaintStatusEnum
    priority: ComplaintPriorityEnum
    assigned_at: Optional[datetime] = None

    # Resolution fields
    resolution_notes: Optional[str] = None
    resolution_evidence: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[UUID] = None

    # Citizen Verification fields
    is_verified: bool = False
    is_satisfied: Optional[bool] = None
    feedback_notes: Optional[str] = None
    verified_at: Optional[datetime] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ComplaintListResponse(BaseModel):
    items: List[ComplaintResponse]
    total: int
    page: int
    size: int


class ComplaintPublicSnapshotResponse(BaseModel):
    id: UUID
    title: str
    description: str
    category: ComplaintCategoryEnum
    status: ComplaintStatusEnum
    priority: ComplaintPriorityEnum
    latitude: float
    longitude: float
    address: Optional[str] = None
    evidence_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
