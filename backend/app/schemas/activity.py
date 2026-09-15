"""Schemas for complaint activity / audit trail."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from ..models.activity import ActivityEventEnum


class ActivityResponse(BaseModel):
    id: UUID
    complaint_id: UUID
    actor_id: Optional[UUID]
    event_type: ActivityEventEnum
    previous_value: Optional[str]
    new_value: Optional[str]
    message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    items: List[ActivityResponse]
    total: int
    page: int
    size: int
