"""Dashboard and Aggregation APIs router."""

from typing import List, Dict, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, select

from ..db.database import get_db
from ..models.user import User
from ..models.role import RoleEnum
from ..models.department import Department
from ..models.complaint import (
    Complaint,
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum
)
from ..models.activity import ComplaintActivity
from ..models.notification import Notification
from ..schemas.dashboard import (
    CitizenDashboardResponse,
    WorkerDashboardResponse,
    DepartmentDashboardResponse,
    AdminDashboardResponse,
    WorkerWorkloadItem,
    DepartmentCountItem,
)
from .deps import get_current_user, require_roles

router = APIRouter()

OPEN_STATUSES = {
    ComplaintStatusEnum.SUBMITTED,
    ComplaintStatusEnum.UNDER_REVIEW,
    ComplaintStatusEnum.ASSIGNED,
    ComplaintStatusEnum.IN_PROGRESS,
}

RESOLVED_CLOSED_STATUSES = {
    ComplaintStatusEnum.RESOLVED,
    ComplaintStatusEnum.CLOSED,
}


def _enum_str(val) -> str:
    """Helper to convert Enum or raw value to string."""
    if hasattr(val, "value"):
        return str(val.value)
    return str(val)


@router.get(
    "/citizen",
    response_model=CitizenDashboardResponse,
    summary="Citizen Dashboard metrics and recent items",
)
def get_citizen_dashboard(
    limit: int = Query(5, ge=1, le=20, description="Max recent items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CitizenDashboardResponse:
    """Return dashboard metrics and activity history for the authenticated citizen."""
    base_query = db.query(Complaint).filter(Complaint.citizen_id == current_user.id)
    total_complaints = base_query.count()

    # Open count
    open_count = base_query.filter(Complaint.status.in_(OPEN_STATUSES)).count()
    resolved_closed_count = base_query.filter(Complaint.status.in_(RESOLVED_CLOSED_STATUSES)).count()

    # Status breakdown
    status_rows = (
        db.query(Complaint.status, func.count(Complaint.id))
        .filter(Complaint.citizen_id == current_user.id)
        .group_by(Complaint.status)
        .all()
    )
    status_breakdown = {_enum_str(row[0]): row[1] for row in status_rows}

    # Recent complaints
    recent_complaints = (
        base_query.order_by(desc(Complaint.created_at)).limit(limit).all()
    )

    # Recent activity on citizen's complaints
    recent_activity = (
        db.query(ComplaintActivity)
        .join(Complaint, ComplaintActivity.complaint_id == Complaint.id)
        .filter(Complaint.citizen_id == current_user.id)
        .order_by(desc(ComplaintActivity.created_at))
        .limit(limit)
        .all()
    )

    # Unread notifications count
    unread_notifications_count = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )

    return CitizenDashboardResponse(
        total_complaints=total_complaints,
        open_complaints_count=open_count,
        resolved_closed_count=resolved_closed_count,
        status_breakdown=status_breakdown,
        recent_complaints=recent_complaints,
        recent_activity=recent_activity,
        unread_notifications_count=unread_notifications_count,
    )


@router.get(
    "/worker",
    response_model=WorkerDashboardResponse,
    summary="Worker Dashboard metrics and assigned workload",
)
def get_worker_dashboard(
    limit: int = Query(5, ge=1, le=20, description="Max recent items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.WORKER, RoleEnum.DEPARTMENT_ADMIN, RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN)),
) -> WorkerDashboardResponse:
    """Return dashboard metrics and workload for the authenticated worker."""
    base_query = db.query(Complaint).filter(Complaint.assigned_worker_id == current_user.id)
    assigned_count = base_query.count()

    open_workload_count = base_query.filter(Complaint.status.in_(OPEN_STATUSES)).count()

    # Status breakdown
    status_rows = (
        db.query(Complaint.status, func.count(Complaint.id))
        .filter(Complaint.assigned_worker_id == current_user.id)
        .group_by(Complaint.status)
        .all()
    )
    status_breakdown = {_enum_str(row[0]): row[1] for row in status_rows}

    # Priority breakdown
    priority_rows = (
        db.query(Complaint.priority, func.count(Complaint.id))
        .filter(Complaint.assigned_worker_id == current_user.id)
        .group_by(Complaint.priority)
        .all()
    )
    priority_breakdown = {_enum_str(row[0]): row[1] for row in priority_rows}

    # Recent assigned complaints
    recent_assigned = (
        base_query.order_by(desc(Complaint.assigned_at), desc(Complaint.created_at))
        .limit(limit)
        .all()
    )

    # Recent activity
    recent_activity = (
        db.query(ComplaintActivity)
        .join(Complaint, ComplaintActivity.complaint_id == Complaint.id)
        .filter(Complaint.assigned_worker_id == current_user.id)
        .order_by(desc(ComplaintActivity.created_at))
        .limit(limit)
        .all()
    )

    # Unread notifications count
    unread_notifications_count = (
        db.query(Notification)
        .filter(Notification.recipient_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )

    return WorkerDashboardResponse(
        assigned_complaints_count=assigned_count,
        open_workload_count=open_workload_count,
        status_breakdown=status_breakdown,
        priority_breakdown=priority_breakdown,
        recent_assigned_complaints=recent_assigned,
        recent_activity=recent_activity,
        unread_notifications_count=unread_notifications_count,
    )


@router.get(
    "/department",
    response_model=DepartmentDashboardResponse,
    summary="Department Admin Dashboard metrics and worker workload",
)
def get_department_dashboard(
    limit: int = Query(5, ge=1, le=20, description="Max recent items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.DEPARTMENT_ADMIN)),
) -> DepartmentDashboardResponse:
    """Return dashboard metrics and worker workload summary for a Department Admin."""
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department admin is not assigned to a department",
        )

    dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned department not found",
        )

    base_query = db.query(Complaint).filter(Complaint.department_id == current_user.department_id)
    total_complaints = base_query.count()
    open_count = base_query.filter(Complaint.status.in_(OPEN_STATUSES)).count()
    resolved_closed_count = base_query.filter(Complaint.status.in_(RESOLVED_CLOSED_STATUSES)).count()

    # Breakdown queries
    status_rows = (
        db.query(Complaint.status, func.count(Complaint.id))
        .filter(Complaint.department_id == current_user.department_id)
        .group_by(Complaint.status)
        .all()
    )
    status_breakdown = {_enum_str(row[0]): row[1] for row in status_rows}

    priority_rows = (
        db.query(Complaint.priority, func.count(Complaint.id))
        .filter(Complaint.department_id == current_user.department_id)
        .group_by(Complaint.priority)
        .all()
    )
    priority_breakdown = {_enum_str(row[0]): row[1] for row in priority_rows}

    category_rows = (
        db.query(Complaint.category, func.count(Complaint.id))
        .filter(Complaint.department_id == current_user.department_id)
        .group_by(Complaint.category)
        .all()
    )
    category_breakdown = {_enum_str(row[0]): row[1] for row in category_rows}

    # Lists
    recently_submitted = base_query.order_by(desc(Complaint.created_at)).limit(limit).all()
    recently_resolved = (
        base_query.filter(Complaint.status == ComplaintStatusEnum.RESOLVED)
        .order_by(desc(Complaint.resolved_at), desc(Complaint.created_at))
        .limit(limit)
        .all()
    )

    # Worker workload within department
    workers = (
        db.query(User)
        .filter(User.department_id == current_user.department_id, User.role == RoleEnum.WORKER)
        .all()
    )
    worker_workload: List[WorkerWorkloadItem] = []
    for w in workers:
        w_assigned_total = (
            db.query(Complaint)
            .filter(Complaint.assigned_worker_id == w.id)
            .count()
        )
        w_assigned_open = (
            db.query(Complaint)
            .filter(Complaint.assigned_worker_id == w.id, Complaint.status.in_(OPEN_STATUSES))
            .count()
        )
        worker_workload.append(
            WorkerWorkloadItem(
                worker_id=w.id,
                full_name=w.full_name,
                email=w.email,
                assigned_open_count=w_assigned_open,
                assigned_total_count=w_assigned_total,
            )
        )

    return DepartmentDashboardResponse(
        department_id=dept.id,
        department_name=dept.name,
        department_code=dept.code,
        total_complaints=total_complaints,
        open_complaints_count=open_count,
        resolved_closed_count=resolved_closed_count,
        status_breakdown=status_breakdown,
        priority_breakdown=priority_breakdown,
        category_breakdown=category_breakdown,
        recently_submitted=recently_submitted,
        recently_resolved=recently_resolved,
        worker_workload=worker_workload,
    )


@router.get(
    "/admin",
    response_model=AdminDashboardResponse,
    summary="City/Super Admin Dashboard overview across platform",
)
def get_admin_dashboard(
    limit: int = Query(5, ge=1, le=20, description="Max recent items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN)),
) -> AdminDashboardResponse:
    """Return system-wide platform metrics and high-level summaries for City/Super Admins."""
    total_users = db.query(User).count()
    user_role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_role = {_enum_str(row[0]): row[1] for row in user_role_rows}

    total_departments = db.query(Department).count()

    total_complaints = db.query(Complaint).count()
    open_count = db.query(Complaint).filter(Complaint.status.in_(OPEN_STATUSES)).count()
    resolved_closed_count = db.query(Complaint).filter(Complaint.status.in_(RESOLVED_CLOSED_STATUSES)).count()

    # Breakdowns
    status_rows = db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()
    status_breakdown = {_enum_str(row[0]): row[1] for row in status_rows}

    priority_rows = db.query(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority).all()
    priority_breakdown = {_enum_str(row[0]): row[1] for row in priority_rows}

    category_rows = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    category_breakdown = {_enum_str(row[0]): row[1] for row in category_rows}

    # Department complaint counts
    dept_rows = (
        db.query(Department.id, Department.name, Department.code, func.count(Complaint.id))
        .outerjoin(Complaint, Department.id == Complaint.department_id)
        .group_by(Department.id, Department.name, Department.code)
        .all()
    )
    department_complaint_counts = [
        DepartmentCountItem(
            department_id=row[0],
            name=row[1],
            code=row[2],
            complaint_count=row[3],
        )
        for row in dept_rows
    ]

    # Recent complaints across platform
    recent_complaints = db.query(Complaint).order_by(desc(Complaint.created_at)).limit(limit).all()

    # Worker workload summary platform-wide
    workers = db.query(User).filter(User.role == RoleEnum.WORKER).limit(50).all()
    worker_workload_summary: List[WorkerWorkloadItem] = []
    for w in workers:
        w_assigned_total = (
            db.query(Complaint).filter(Complaint.assigned_worker_id == w.id).count()
        )
        w_assigned_open = (
            db.query(Complaint)
            .filter(Complaint.assigned_worker_id == w.id, Complaint.status.in_(OPEN_STATUSES))
            .count()
        )
        worker_workload_summary.append(
            WorkerWorkloadItem(
                worker_id=w.id,
                full_name=w.full_name,
                email=w.email,
                assigned_open_count=w_assigned_open,
                assigned_total_count=w_assigned_total,
            )
        )

    return AdminDashboardResponse(
        total_users=total_users,
        users_by_role=users_by_role,
        total_departments=total_departments,
        total_complaints=total_complaints,
        open_complaints_count=open_count,
        resolved_closed_count=resolved_closed_count,
        status_breakdown=status_breakdown,
        priority_breakdown=priority_breakdown,
        category_breakdown=category_breakdown,
        department_complaint_counts=department_complaint_counts,
        recent_complaints=recent_complaints,
        worker_workload_summary=worker_workload_summary,
    )
