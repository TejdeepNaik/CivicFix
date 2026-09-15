"""Pydantic schemas for AI analysis and duplicate detection responses."""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from ..models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum


class DuplicateMatch(BaseModel):
    complaint_id: UUID
    title: str
    status: str
    category: str
    similarity_score: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")
    distance_meters: float = Field(..., description="Geographic distance in meters")


class ComplaintAnalysisResponse(BaseModel):
    complaint_id: UUID
    suggested_category: ComplaintCategoryEnum
    suggested_priority: ComplaintPriorityEnum
    summary: str
    is_duplicate_likely: bool
    potential_duplicates: List[DuplicateMatch] = []
    confidence: float = Field(..., description="AI confidence score")
