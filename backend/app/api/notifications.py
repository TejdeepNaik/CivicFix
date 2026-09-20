"""Notification API router."""

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..db.database import get_db
from ..models.user import User
from ..models.notification import Notification
from ..schemas.notification import NotificationListResponse, NotificationResponse
from ..services.notifications import mark_notification_read
from .deps import get_current_user

router = APIRouter()


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications for the current user",
)
@router.get("/", response_model=NotificationListResponse, include_in_schema=False)
def list_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationListResponse:
    """Return paginated list of notifications for the authenticated user."""
    query = db.query(Notification).filter(Notification.recipient_id == str(current_user.id))
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    query = query.order_by(desc(Notification.created_at))

    total = query.count()
    offset = (page - 1) * size
    items = query.offset(offset).limit(size).all()

    return NotificationListResponse(items=items, total=total, page=page, size=size)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
def mark_notification_read_endpoint(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """
    Mark the specified notification as read.

    - Returns **404** if the notification does not exist.
    - Returns **403** if the notification belongs to a different user.
    - Idempotent: marking an already-read notification has no effect.
    """
    notification = db.query(Notification).filter(Notification.id == str(notification_id)).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if str(notification.recipient_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This notification belongs to another user",
        )

    mark_notification_read(db=db, notification=notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.patch(
    "/read-all",
    summary="Mark all notifications as read for the current user",
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mark every unread notification for the current user as read."""
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Notification)
        .filter(Notification.recipient_id == str(current_user.id), Notification.is_read == False)  # noqa: E712
        .update({"is_read": True, "read_at": now}, synchronize_session="fetch")
    )
    db.commit()
    return {"marked_read": updated}
