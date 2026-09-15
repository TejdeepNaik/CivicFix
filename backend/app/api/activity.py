"""Activity / audit trail API router."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from ..db.database import get_db
from ..models.user import User
from ..models.role import RoleEnum
from ..models.complaint import Complaint
from ..models.activity import ComplaintActivity
from ..schemas.activity import ActivityListResponse, ActivityResponse
from .deps import get_current_user

router = APIRouter()

ADMIN_ROLES = {RoleEnum.DEPARTMENT_ADMIN, RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN}
WORKER_ADMIN_ROLES = {RoleEnum.WORKER, RoleEnum.DEPARTMENT_ADMIN, RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN}


@router.get(
    "/{complaint_id}/activity",
    response_model=ActivityListResponse,
    summary="List activity history for a complaint"
)
def get_complaint_activity(
    complaint_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityListResponse:
    """
    Return paginated, chronologically-ordered activity events for a complaint.

    - **Citizen**: may only view activity for their own complaint.
    - **Worker**: may view activity for any complaint (subject to their scope).
    - **Admins**: may view any complaint's activity.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    # RBAC: citizens can only view their own complaint's activity
    if current_user.role == RoleEnum.CITIZEN and complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only view activity for your own complaints",
        )

    query = (
        db.query(ComplaintActivity)
        .filter(ComplaintActivity.complaint_id == complaint_id)
        .order_by(asc(ComplaintActivity.created_at))
    )
    total = query.count()
    offset = (page - 1) * size
    items = query.offset(offset).limit(size).all()

    return ActivityListResponse(items=items, total=total, page=page, size=size)
