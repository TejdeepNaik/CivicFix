"""Notification and activity service layer.

Provides reusable operations for:
- Recording complaint activity (audit trail)
- Creating notifications
- Notifying complaint participants on key events
- Marking notifications as read
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from ..models.activity import ComplaintActivity, ActivityEventEnum
from ..models.notification import Notification, NotificationTypeEnum
from ..models.complaint import Complaint


# ---------------------------------------------------------------------------
# Activity helpers
# ---------------------------------------------------------------------------

def create_activity(
    db: Session,
    complaint_id: UUID,
    event_type: ActivityEventEnum,
    actor_id: Optional[UUID] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    message: Optional[str] = None,
) -> ComplaintActivity:
    """Persist a single activity event for a complaint."""
    activity = ComplaintActivity(
        complaint_id=complaint_id,
        actor_id=actor_id,
        event_type=event_type,
        previous_value=previous_value,
        new_value=new_value,
        message=message,
    )
    db.add(activity)
    return activity


# ---------------------------------------------------------------------------
# Notification helpers
# ---------------------------------------------------------------------------

def create_notification(
    db: Session,
    recipient_id: UUID,
    notification_type: NotificationTypeEnum,
    title: str,
    message: str,
    complaint_id: Optional[UUID] = None,
) -> Notification:
    """Persist a single notification for a user."""
    notification = Notification(
        recipient_id=recipient_id,
        complaint_id=complaint_id,
        notification_type=notification_type,
        title=title,
        message=message,
    )
    db.add(notification)
    return notification


def mark_notification_read(db: Session, notification: Notification) -> Notification:
    """Mark a notification as read (idempotent)."""
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
    return notification


# ---------------------------------------------------------------------------
# High-level event-driven helpers
# ---------------------------------------------------------------------------

def record_complaint_created(db: Session, complaint: Complaint) -> None:
    """Record creation event + notify the submitting citizen."""
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=complaint.citizen_id,
        event_type=ActivityEventEnum.COMPLAINT_CREATED,
        new_value=complaint.status.value,
        message=f"Complaint '{complaint.title}' submitted.",
    )
    create_notification(
        db=db,
        recipient_id=complaint.citizen_id,
        complaint_id=complaint.id,
        notification_type=NotificationTypeEnum.COMPLAINT_SUBMITTED,
        title="Complaint Submitted",
        message=f"Your complaint '{complaint.title}' has been received and is under review.",
    )


def record_department_assigned(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
    old_dept_name: Optional[str],
    new_dept_name: str,
) -> None:
    """Record department routing activity and notify citizen."""
    is_change = old_dept_name is not None
    event = ActivityEventEnum.DEPARTMENT_CHANGED if is_change else ActivityEventEnum.DEPARTMENT_ASSIGNED
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=actor_id,
        event_type=event,
        previous_value=old_dept_name,
        new_value=new_dept_name,
        message=f"Complaint routed to department: {new_dept_name}.",
    )
    notif_type = NotificationTypeEnum.DEPARTMENT_CHANGED if is_change else NotificationTypeEnum.DEPARTMENT_ASSIGNED
    create_notification(
        db=db,
        recipient_id=complaint.citizen_id,
        complaint_id=complaint.id,
        notification_type=notif_type,
        title="Department Assigned" if not is_change else "Department Changed",
        message=f"Your complaint has been routed to the '{new_dept_name}' department.",
    )


def record_worker_assigned(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
    old_worker_name: Optional[str],
    new_worker_name: Optional[str],
    new_worker_id: Optional[UUID],
) -> None:
    """Record worker assignment/unassignment and notify affected parties."""
    if new_worker_id is None:
        # Unassignment
        create_activity(
            db=db,
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type=ActivityEventEnum.WORKER_UNASSIGNED,
            previous_value=old_worker_name,
            new_value=None,
            message="Worker unassigned from complaint.",
        )
        return

    is_reassignment = old_worker_name is not None
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=actor_id,
        event_type=ActivityEventEnum.WORKER_ASSIGNED,
        previous_value=old_worker_name,
        new_value=new_worker_name,
        message=f"Complaint assigned to worker: {new_worker_name}.",
    )
    # Notify the citizen
    create_notification(
        db=db,
        recipient_id=complaint.citizen_id,
        complaint_id=complaint.id,
        notification_type=NotificationTypeEnum.WORKER_ASSIGNED,
        title="Worker Assigned",
        message=f"A worker has been assigned to handle your complaint.",
    )
    # Notify the newly assigned worker
    notif_type = (
        NotificationTypeEnum.COMPLAINT_REASSIGNED if is_reassignment
        else NotificationTypeEnum.COMPLAINT_ASSIGNED_TO_WORKER
    )
    create_notification(
        db=db,
        recipient_id=new_worker_id,
        complaint_id=complaint.id,
        notification_type=notif_type,
        title="Complaint Assigned" if not is_reassignment else "Complaint Reassigned",
        message=f"Complaint '{complaint.title}' has been {'re' if is_reassignment else ''}assigned to you.",
    )


def record_status_changed(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
    old_status: str,
    new_status: str,
) -> None:
    """Record status transition activity and notify citizen."""
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=actor_id,
        event_type=ActivityEventEnum.STATUS_CHANGED,
        previous_value=old_status,
        new_value=new_status,
        message=f"Status changed from {old_status} to {new_status}.",
    )
    create_notification(
        db=db,
        recipient_id=complaint.citizen_id,
        complaint_id=complaint.id,
        notification_type=NotificationTypeEnum.STATUS_CHANGED,
        title="Complaint Status Updated",
        message=f"Your complaint status has been updated to '{new_status}'.",
    )


def record_priority_changed(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
    old_priority: str,
    new_priority: str,
) -> None:
    """Record priority change activity (no citizen notification to avoid spam)."""
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=actor_id,
        event_type=ActivityEventEnum.PRIORITY_CHANGED,
        previous_value=old_priority,
        new_value=new_priority,
        message=f"Priority changed from {old_priority} to {new_priority}.",
    )


def record_complaint_resolved(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
) -> None:
    """Record resolution + notify citizen to verify."""
    create_activity(
        db=db,
        complaint_id=complaint.id,
        actor_id=actor_id,
        event_type=ActivityEventEnum.COMPLAINT_RESOLVED,
        new_value="resolved",
        message="Complaint marked as resolved.",
    )
    create_notification(
        db=db,
        recipient_id=complaint.citizen_id,
        complaint_id=complaint.id,
        notification_type=NotificationTypeEnum.RESOLUTION_REQUIRES_VERIFICATION,
        title="Complaint Resolved – Please Verify",
        message=(
            "Your complaint has been resolved. "
            "Please verify whether you are satisfied with the resolution."
        ),
    )


def record_resolution_verified(
    db: Session,
    complaint: Complaint,
    actor_id: UUID,
    is_satisfied: bool,
) -> None:
    """Record citizen verification; handle rework or close path."""
    if is_satisfied:
        create_activity(
            db=db,
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type=ActivityEventEnum.RESOLUTION_VERIFIED,
            new_value="satisfied",
            message="Citizen accepted the resolution.",
        )
        create_activity(
            db=db,
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type=ActivityEventEnum.COMPLAINT_CLOSED,
            new_value="closed",
            message="Complaint closed after citizen verification.",
        )
        create_notification(
            db=db,
            recipient_id=complaint.citizen_id,
            complaint_id=complaint.id,
            notification_type=NotificationTypeEnum.COMPLAINT_CLOSED,
            title="Complaint Closed",
            message="Thank you for verifying. Your complaint has been closed.",
        )
    else:
        create_activity(
            db=db,
            complaint_id=complaint.id,
            actor_id=actor_id,
            event_type=ActivityEventEnum.REWORK_REQUESTED,
            new_value="in_progress",
            message="Citizen rejected the resolution — complaint returned for rework.",
        )
        # Notify the assigned worker if any
        if complaint.assigned_worker_id:
            create_notification(
                db=db,
                recipient_id=complaint.assigned_worker_id,
                complaint_id=complaint.id,
                notification_type=NotificationTypeEnum.COMPLAINT_RETURNED_FOR_REWORK,
                title="Complaint Returned for Rework",
                message=(
                    f"Complaint '{complaint.title}' was rejected by the citizen "
                    "and has been returned for rework."
                ),
            )
        create_notification(
            db=db,
            recipient_id=complaint.citizen_id,
            complaint_id=complaint.id,
            notification_type=NotificationTypeEnum.COMPLAINT_REOPENED,
            title="Complaint Reopened for Rework",
            message="Your complaint has been reopened for further work.",
        )
