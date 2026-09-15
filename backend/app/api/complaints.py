"""Complaint management API router endpoints."""

from datetime import datetime, timezone
from typing import Optional, Set, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..db.database import get_db
from ..models.user import User
from ..models.role import RoleEnum
from ..models.complaint import (
    Complaint,
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum
)
from ..models.department import Department
from ..schemas.complaint import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintResolveRequest,
    ComplaintVerifyRequest,
    ComplaintResponse,
    ComplaintListResponse
)
from ..schemas.ai import ComplaintAnalysisResponse, DuplicateMatch
from ..services.ai.factory import get_ai_service
from ..services.ai.duplicate_detector import find_duplicate_complaints
from ..services import notifications as notif_svc
from .deps import get_current_user

router = APIRouter()

ADMIN_WORKER_ROLES: Set[RoleEnum] = {
    RoleEnum.WORKER,
    RoleEnum.DEPARTMENT_ADMIN,
    RoleEnum.CITY_ADMIN,
    RoleEnum.SUPER_ADMIN
}

# State machine defining permitted complaint status transitions
VALID_STATUS_TRANSITIONS: Dict[ComplaintStatusEnum, Set[ComplaintStatusEnum]] = {
    ComplaintStatusEnum.SUBMITTED: {
        ComplaintStatusEnum.SUBMITTED,
        ComplaintStatusEnum.UNDER_REVIEW,
        ComplaintStatusEnum.ASSIGNED,
        ComplaintStatusEnum.REJECTED
    },
    ComplaintStatusEnum.UNDER_REVIEW: {
        ComplaintStatusEnum.UNDER_REVIEW,
        ComplaintStatusEnum.ASSIGNED,
        ComplaintStatusEnum.IN_PROGRESS,
        ComplaintStatusEnum.REJECTED
    },
    ComplaintStatusEnum.ASSIGNED: {
        ComplaintStatusEnum.ASSIGNED,
        ComplaintStatusEnum.IN_PROGRESS,
        ComplaintStatusEnum.RESOLVED,
        ComplaintStatusEnum.REJECTED
    },
    ComplaintStatusEnum.IN_PROGRESS: {
        ComplaintStatusEnum.IN_PROGRESS,
        ComplaintStatusEnum.RESOLVED,
        ComplaintStatusEnum.REJECTED
    },
    ComplaintStatusEnum.RESOLVED: {
        ComplaintStatusEnum.RESOLVED,
        ComplaintStatusEnum.IN_PROGRESS,  # Rework path
        ComplaintStatusEnum.CLOSED
    },
    ComplaintStatusEnum.REJECTED: {
        ComplaintStatusEnum.REJECTED,
        ComplaintStatusEnum.CLOSED
    },
    ComplaintStatusEnum.CLOSED: {
        ComplaintStatusEnum.CLOSED
    }
}


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, summary="Create a new complaint")
@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Create a new civic complaint. Automatically sets status to SUBMITTED and binds to current citizen."""
    priority_val = complaint_in.priority or ComplaintPriorityEnum.MEDIUM

    new_complaint = Complaint(
        citizen_id=current_user.id,
        title=complaint_in.title,
        description=complaint_in.description,
        category=complaint_in.category,
        priority=priority_val,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        address=complaint_in.address
    )
    db.add(new_complaint)
    db.flush()  # Populate new_complaint.id before activity creation
    notif_svc.record_complaint_created(db=db, complaint=new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint


@router.get("/{complaint_id}", response_model=ComplaintResponse, summary="Get complaint by ID")
def get_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Retrieve details of a specific complaint. Ordinary citizens can only view their own complaints."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Permission check: Citizen can only view their own complaint
    if current_user.role == RoleEnum.CITIZEN and complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only view your own complaints"
        )

    return complaint


@router.get("", response_model=ComplaintListResponse, summary="List and filter complaints")
@router.get("/", response_model=ComplaintListResponse, include_in_schema=False)
def list_complaints(
    status_filter: Optional[ComplaintStatusEnum] = Query(None, alias="status"),
    priority_filter: Optional[ComplaintPriorityEnum] = Query(None, alias="priority"),
    category_filter: Optional[ComplaintCategoryEnum] = Query(None, alias="category"),
    citizen_id_filter: Optional[UUID] = Query(None, alias="citizen_id"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintListResponse:
    """List complaints with filtering and pagination. Citizens are automatically scoped to their own complaints."""
    query = db.query(Complaint)

    # Scoping for ordinary citizens vs authority/admin users
    if current_user.role == RoleEnum.CITIZEN:
        query = query.filter(Complaint.citizen_id == current_user.id)
    elif citizen_id_filter is not None:
        query = query.filter(Complaint.citizen_id == citizen_id_filter)

    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if priority_filter:
        query = query.filter(Complaint.priority == priority_filter)
    if category_filter:
        query = query.filter(Complaint.category == category_filter)

    total = query.count()
    offset = (page - 1) * size
    items = query.order_by(desc(Complaint.created_at)).offset(offset).limit(size).all()

    return ComplaintListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )


@router.patch("/{complaint_id}", response_model=ComplaintResponse, summary="Update complaint details or status")
def update_complaint(
    complaint_id: UUID,
    complaint_in: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Update complaint. Citizens can edit fields while status is SUBMITTED; Authorities can update status/priority/worker."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    is_admin_or_worker = current_user.role in ADMIN_WORKER_ROLES
    is_owner = complaint.citizen_id == current_user.id

    if not is_owner and not is_admin_or_worker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot modify this complaint"
        )

    # Citizen edit restrictions
    if current_user.role == RoleEnum.CITIZEN and is_owner:
        if complaint.status != ComplaintStatusEnum.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Citizens can only edit complaints while in SUBMITTED status. Current status is {complaint.status.value}."
            )
        # Prevent citizens from modifying administrative fields
        if complaint_in.status is not None or complaint_in.priority is not None or complaint_in.assigned_worker_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens are not permitted to change status, priority, or assigned worker."
            )

    update_data = complaint_in.model_dump(exclude_unset=True)

    # 1. Validate status transition rules
    if "status" in update_data and update_data["status"] is not None:
        target_status = update_data["status"]
        if target_status != complaint.status:
            allowed_next_statuses = VALID_STATUS_TRANSITIONS.get(complaint.status, set())
            if target_status not in allowed_next_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from {complaint.status.value} to {target_status.value}"
                )

    # 2. Handle department routing (admin-only field)
    if "department_id" in update_data:
        if not is_admin_or_worker:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens cannot change the department routing of a complaint"
            )
        new_dept_id = update_data["department_id"]
        if new_dept_id is not None:
            dept = db.query(Department).filter(Department.id == new_dept_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Department not found"
                )
            # If department changes while a worker from a different department is assigned,
            # clear the worker assignment to prevent cross-department inconsistency.
            if (
                complaint.assigned_worker_id is not None
                and "assigned_worker_id" not in update_data
            ):
                existing_worker = db.query(User).filter(
                    User.id == complaint.assigned_worker_id
                ).first()
                if existing_worker and existing_worker.department_id != new_dept_id:
                    complaint.assigned_worker_id = None
                    complaint.assigned_at = None
            # Capture dept names for activity before changing
            old_dept = None
            if complaint.department_id is not None:
                old_dept_obj = db.query(Department).filter(
                    Department.id == complaint.department_id
                ).first()
                old_dept = old_dept_obj.name if old_dept_obj else None
            new_dept_name = dept.name
        complaint.department_id = new_dept_id
        del update_data["department_id"]
        if new_dept_id is not None:
            notif_svc.record_department_assigned(
                db=db,
                complaint=complaint,
                actor_id=current_user.id,
                old_dept_name=old_dept,
                new_dept_name=new_dept_name,
            )

    # 3. Handle worker assignment logic if assigned_worker_id is specified
    if "assigned_worker_id" in update_data:
        worker_id = update_data["assigned_worker_id"]
        old_worker_name: Optional[str] = None
        if complaint.assigned_worker_id is not None:
            old_w = db.query(User).filter(User.id == complaint.assigned_worker_id).first()
            old_worker_name = old_w.full_name or old_w.email if old_w else None
        if worker_id is None:
            notif_svc.record_worker_assigned(
                db=db, complaint=complaint, actor_id=current_user.id,
                old_worker_name=old_worker_name, new_worker_name=None, new_worker_id=None
            )
            complaint.assigned_worker_id = None
            complaint.assigned_at = None
        else:
            worker_user = db.query(User).filter(User.id == worker_id).first()
            if not worker_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned worker user does not exist"
                )
            if worker_user.role != RoleEnum.WORKER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Assigned user must have WORKER role, got {worker_user.role.value}"
                )
            if not worker_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot assign an inactive worker"
                )
            # Enforce worker-department membership when the complaint has a department
            effective_dept_id = complaint.department_id
            if effective_dept_id is not None:
                if worker_user.department_id != effective_dept_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Worker does not belong to the complaint's department"
                    )
            new_worker_name = worker_user.full_name or worker_user.email
            notif_svc.record_worker_assigned(
                db=db, complaint=complaint, actor_id=current_user.id,
                old_worker_name=old_worker_name, new_worker_name=new_worker_name,
                new_worker_id=worker_id
            )
            complaint.assigned_worker_id = worker_id
            complaint.assigned_at = datetime.now(timezone.utc)
            # If status was SUBMITTED, automatically transition to ASSIGNED unless status was explicitly set
            if complaint.status == ComplaintStatusEnum.SUBMITTED and "status" not in update_data:
                complaint.status = ComplaintStatusEnum.ASSIGNED

    # 4. Apply remaining field updates with activity tracking
    old_status = complaint.status
    old_priority = complaint.priority
    for field, value in update_data.items():
        if field not in ("assigned_worker_id", "department_id"):  # Handled above
            setattr(complaint, field, value)

    # Record status change activity (if status actually changed)
    if "status" in update_data and update_data["status"] is not None:
        new_status = update_data["status"]
        if new_status != old_status:
            notif_svc.record_status_changed(
                db=db, complaint=complaint, actor_id=current_user.id,
                old_status=old_status.value, new_status=new_status.value
            )

    # Record priority change activity (if priority actually changed)
    if "priority" in update_data and update_data["priority"] is not None:
        new_priority = update_data["priority"]
        if new_priority != old_priority:
            notif_svc.record_priority_changed(
                db=db, complaint=complaint, actor_id=current_user.id,
                old_priority=old_priority.value, new_priority=new_priority.value
            )

    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/resolve", response_model=ComplaintResponse, summary="Mark complaint as resolved with evidence")
def resolve_complaint(
    complaint_id: UUID,
    resolve_in: ComplaintResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Mark a complaint as RESOLVED with resolution notes and optional evidence. Restricted to assigned worker or Admin."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Permission check: Assigned worker or Admin role required
    is_admin = current_user.role in {RoleEnum.DEPARTMENT_ADMIN, RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN}
    is_assigned_worker = complaint.assigned_worker_id == current_user.id

    if not is_assigned_worker and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only the assigned worker or an admin can resolve this complaint"
        )

    # Status check: Must be ASSIGNED or IN_PROGRESS (or RESOLVED if updating resolution details)
    if complaint.status not in {ComplaintStatusEnum.ASSIGNED, ComplaintStatusEnum.IN_PROGRESS, ComplaintStatusEnum.RESOLVED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resolve complaint in status {complaint.status.value}. Must be ASSIGNED or IN_PROGRESS."
        )

    complaint.status = ComplaintStatusEnum.RESOLVED
    complaint.resolution_notes = resolve_in.resolution_notes
    complaint.resolution_evidence = resolve_in.resolution_evidence
    complaint.resolved_at = datetime.now(timezone.utc)
    complaint.resolved_by_id = current_user.id

    notif_svc.record_complaint_resolved(db=db, complaint=complaint, actor_id=current_user.id)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/verify", response_model=ComplaintResponse, summary="Citizen verification of complaint resolution")
def verify_complaint(
    complaint_id: UUID,
    verify_in: ComplaintVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Citizen verification of resolution. Accepting transitions to CLOSED; rejecting reopens to IN_PROGRESS for rework."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Permission check: Only citizen owner can verify
    if complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only the citizen who reported this complaint can verify its resolution"
        )

    # Status check: Must be RESOLVED
    if complaint.status != ComplaintStatusEnum.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Complaint must be in RESOLVED status to verify. Current status is {complaint.status.value}."
        )

    # Prevent duplicate verification if already verified and CLOSED
    if complaint.is_verified and complaint.status == ComplaintStatusEnum.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint resolution has already been verified and closed"
        )

    complaint.verified_at = datetime.now(timezone.utc)
    complaint.feedback_notes = verify_in.feedback_notes

    if verify_in.is_satisfied:
        complaint.is_verified = True
        complaint.is_satisfied = True
        complaint.status = ComplaintStatusEnum.CLOSED
    else:
        # Citizen rejected resolution -> reopen for rework
        complaint.is_verified = False
        complaint.is_satisfied = False
        complaint.status = ComplaintStatusEnum.IN_PROGRESS

    notif_svc.record_resolution_verified(
        db=db, complaint=complaint, actor_id=current_user.id, is_satisfied=verify_in.is_satisfied
    )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/analyze", response_model=ComplaintAnalysisResponse, summary="Perform AI analysis and duplicate detection")
def analyze_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintAnalysisResponse:
    """Analyze a complaint using AI services: category/priority suggestions, AI summary, and pgvector duplicate detection."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # Permission check: Citizens can only analyze their own complaint
    if current_user.role == RoleEnum.CITIZEN and complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only analyze your own complaints"
        )

    ai_service = get_ai_service()

    # Get AI suggestions
    ai_suggestions = ai_service.suggest_category_and_priority(complaint.title, complaint.description)
    ai_summary = ai_service.generate_summary(complaint.title, complaint.description)

    # Perform duplicate detection
    dup_results = find_duplicate_complaints(db=db, target_complaint=complaint)

    potential_dups = [
        DuplicateMatch(
            complaint_id=UUID(item["complaint_id"]),
            title=item["title"],
            status=item["status"],
            category=item["category"],
            similarity_score=item["similarity_score"],
            distance_meters=item["distance_meters"]
        )
        for item in dup_results["potential_duplicates"]
    ]

    return ComplaintAnalysisResponse(
        complaint_id=complaint.id,
        suggested_category=ai_suggestions["suggested_category"],
        suggested_priority=ai_suggestions["suggested_priority"],
        summary=ai_summary,
        is_duplicate_likely=dup_results["is_duplicate_likely"],
        potential_duplicates=potential_dups,
        confidence=ai_suggestions.get("confidence", 0.85)
    )
