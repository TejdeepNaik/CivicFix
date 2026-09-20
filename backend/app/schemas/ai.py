"""Pydantic schemas for AI analysis, duplicate detection, and persistent issue clustering responses."""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from ..models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum


class DuplicateMatch(BaseModel):
    complaint_id: UUID
    title: str
    status: str
    category: str
    similarity_score: float = Field(..., description="Combined multi-signal similarity score (0.0 to 1.0)")
    text_similarity: Optional[float] = Field(None, description="Text description similarity score (0.0 to 1.0)")
    image_similarity: Optional[float] = Field(None, description="Evidence photo visual similarity score (0.0 to 1.0) if image exists")
    distance_meters: float = Field(..., description="Geographic distance in meters")
    reasoning_signals: List[str] = Field(default_factory=list, description="Human-readable clustering reasoning signals")


class ComplaintAnalysisResponse(BaseModel):
    complaint_id: UUID
    cluster_id: Optional[UUID] = Field(None, description="Associated persistent IssueCluster ID")
    cluster_report_count: int = Field(default=1, description="Total number of citizen reports attached to this issue cluster")
    cluster_priority: ComplaintPriorityEnum = Field(..., description="Calculated cluster priority based on volume, density, and severity")
    suggested_category: ComplaintCategoryEnum
    suggested_priority: ComplaintPriorityEnum
    summary: str
    is_duplicate_likely: bool
    potential_duplicates: List[DuplicateMatch] = []
    confidence: float = Field(..., description="AI confidence score")
