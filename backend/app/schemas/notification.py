"""Schemas for user notifications."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from ..models.notification import NotificationTypeEnum


class NotificationResponse(BaseModel):
    id: UUID
    recipient_id: UUID
    complaint_id: Optional[UUID]
    notification_type: NotificationTypeEnum
    title: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int
    size: int
