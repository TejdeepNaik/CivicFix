"""Complaints FastAPI API router handling complaint lifecycle operations, evidence uploads, and AI analysis."""

import os
import uuid
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
import logging
import io
from PIL import Image, ImageOps
import pillow_heif
pillow_heif.register_heif_opener()

from fastapi import APIRouter, Depends, HTTPException, Query, Form, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db.database import get_db
from ..core.security import create_access_token
from .deps import get_current_user, get_optional_current_user
from ..models.user import User, RoleEnum
from ..models.complaint import (
    Complaint,
    ComplaintStatusEnum,
    ComplaintPriorityEnum,
    ComplaintCategoryEnum
)
from ..models.cluster import IssueCluster
from ..models.department import Department
from ..schemas.complaint import (
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintResponse,
    ComplaintListResponse,
    ComplaintPublicSnapshotResponse,
    ComplaintResolveRequest,
    ComplaintVerifyRequest
)
from ..schemas.ai import ComplaintAnalysisResponse, DuplicateMatch
from ..services.ai.factory import get_ai_service
from ..services.ai.duplicate_detector import find_duplicate_complaints, assign_or_create_cluster
from ..services.notifications import (
    record_complaint_created,
    record_complaint_resolved,
    record_resolution_verified,
    record_status_changed,
    record_priority_changed,
    record_department_assigned,
    record_worker_assigned,
)
from ..core.config import settings

ai_logger = logging.getLogger("civicfix.ai_diagnostics")

router = APIRouter()

# Resolve the evidence upload directory once at module load time from settings.
# Local dev default: ./uploads/evidence (relative to cwd).
# Production:        /app/uploads/evidence (set UPLOAD_DIR=/app/uploads via Railway env var).
_EVIDENCE_DIR = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "evidence")
os.makedirs(_EVIDENCE_DIR, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence",
    "image/pjpeg", "application/octet-stream"
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def log_safe_diagnostic_metadata(
    request_id: str,
    mime_type: str,
    filename: str,
    file_size: int,
    dimensions: Optional[tuple],
    reached_backend: bool,
    ai_provider_status: str,
    ai_provider_failure_reason: Optional[str] = None
):
    """Log ONLY safe non-sensitive diagnostic metadata. Never logs image data, API keys, or user details."""
    ext = os.path.splitext(filename)[1].lower() if filename else "unknown"
    ai_logger.info(
        "AI_DIAGNOSTIC | request_id=%s | mime_type=%s | ext=%s | file_size_bytes=%d | dimensions=%s | reached_backend=%s | ai_provider_status=%s | failure_reason=%s",
        request_id,
        mime_type,
        ext,
        file_size,
        f"{dimensions[0]}x{dimensions[1]}" if dimensions else "unknown",
        reached_backend,
        ai_provider_status,
        ai_provider_failure_reason or "none"
    )


def process_and_normalize_image(file_bytes: bytes, filename: str, content_type: str) -> tuple[bytes, str, int, int]:
    """
    Normalizes uploaded images (JPEG, PNG, WebP, HEIC/HEIF from mobile devices) using Pillow:
    - Transposes EXIF orientation so mobile camera captures are upright
    - Converts color space to RGB
    - Re-encodes image to standard JPEG bytes
    Returns (jpeg_bytes, "image/jpeg", width, height).
    """
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = ImageOps.exif_transpose(img)
        width, height = img.size

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        out_buffer = io.BytesIO()
        img.save(out_buffer, format="JPEG", quality=90)
        norm_bytes = out_buffer.getvalue()
        return norm_bytes, "image/jpeg", width, height
    except Exception as e:
        ai_logger.warning("Image processing failed for %s: %s", filename, e)
        raise ValueError(f"Could not decode image file: {e}")


@router.post("/upload-evidence", summary="Upload evidence photo")
def upload_evidence(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload evidence photo with server-side file size and MIME type validation."""
    request_id = request.headers.get("x-request-id") or request.headers.get("x-correlation-id") or f"req_{uuid.uuid4().hex[:10]}"
    ext = os.path.splitext(file.filename or "")[1].lower()

    if file.content_type not in ALLOWED_MIME_TYPES and ext not in ALLOWED_EXTENSIONS:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=0,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="REJECTED_MIME",
            ai_provider_failure_reason="Invalid file type"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. JPEG, PNG, WebP, and HEIC/HEIF images are allowed."
        )

    file_bytes = file.file.read()
    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=file_size,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="REJECTED_SIZE",
            ai_provider_failure_reason="File size exceeds 10MB limit"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit."
        )

    try:
        norm_bytes, norm_mime, width, height = process_and_normalize_image(
            file_bytes=file_bytes,
            filename=file.filename or "evidence.jpg",
            content_type=file.content_type or "image/jpeg"
        )
    except ValueError as err:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=file_size,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="CORRUPT_IMAGE",
            ai_provider_failure_reason=str(err)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted image: {err}"
        )

    filename = f"{uuid.uuid4()}.jpg"
    os.makedirs(_EVIDENCE_DIR, exist_ok=True)
    file_path = os.path.join(_EVIDENCE_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(norm_bytes)

    log_safe_diagnostic_metadata(
        request_id=request_id,
        mime_type=file.content_type or "unknown",
        filename=file.filename or "",
        file_size=file_size,
        dimensions=(width, height),
        reached_backend=True,
        ai_provider_status="UPLOAD_SUCCESS",
        ai_provider_failure_reason=None
    )

    evidence_url = f"/static/uploads/evidence/{filename}"
    return {"evidence_url": evidence_url, "request_id": request_id}


class PreSubmissionDuplicateCheckRequest(BaseModel):
    category: ComplaintCategoryEnum
    title: str
    description: str
    latitude: float
    longitude: float
    evidence_url: Optional[str] = None


@router.post("/analyze-image", summary="Upload evidence and perform pre-submission vision AI analysis")
def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    user_context: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Upload evidence photo, perform AI vision analysis for civic issues, and return evidence URL with structured detection."""
    request_id = request.headers.get("x-request-id") or request.headers.get("x-correlation-id") or f"req_{uuid.uuid4().hex[:10]}"
    ext = os.path.splitext(file.filename or "")[1].lower()

    if file.content_type not in ALLOWED_MIME_TYPES and ext not in ALLOWED_EXTENSIONS:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=0,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="REJECTED_MIME",
            ai_provider_failure_reason="Invalid file type"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. JPEG, PNG, WebP, and HEIC/HEIF images are allowed."
        )

    file_bytes = file.file.read()
    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=file_size,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="REJECTED_SIZE",
            ai_provider_failure_reason="File size exceeds 10MB limit"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit."
        )

    dimensions = None
    try:
        norm_bytes, norm_mime, width, height = process_and_normalize_image(
            file_bytes=file_bytes,
            filename=file.filename or "evidence.jpg",
            content_type=file.content_type or "image/jpeg"
        )
        dimensions = (width, height)
    except ValueError as err:
        log_safe_diagnostic_metadata(
            request_id=request_id,
            mime_type=file.content_type or "unknown",
            filename=file.filename or "",
            file_size=file_size,
            dimensions=None,
            reached_backend=True,
            ai_provider_status="CORRUPT_IMAGE",
            ai_provider_failure_reason=str(err)
        )
        # Return graceful AI unavailable response instead of unhandled crash
        ai_service = get_ai_service()
        analysis = ai_service.analyze_image_for_civic_issue(
            image_bytes=file_bytes,
            content_type=file.content_type or "image/jpeg",
            latitude=latitude,
            longitude=longitude,
            user_context=user_context
        )
        analysis["request_id"] = request_id
        analysis["evidence_url"] = None
        analysis["analysis_available"] = False
        analysis["reasoning"] = f"Image preprocessing failed: {err}"
        return analysis

    filename = f"{uuid.uuid4()}.jpg"
    os.makedirs(_EVIDENCE_DIR, exist_ok=True)
    file_path = os.path.join(_EVIDENCE_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(norm_bytes)

    evidence_url = f"/static/uploads/evidence/{filename}"

    # Perform AI vision analysis
    ai_service = get_ai_service()
    analysis = ai_service.analyze_image_for_civic_issue(
        image_bytes=norm_bytes,
        content_type=norm_mime,
        latitude=latitude,
        longitude=longitude,
        user_context=user_context
    )

    analysis["evidence_url"] = evidence_url
    analysis["request_id"] = request_id

    # Safe log AI status
    ai_status = "SUCCESS" if analysis.get("analysis_available") else "UNAVAILABLE"
    failure_reason = None if analysis.get("analysis_available") else analysis.get("reasoning")
    log_safe_diagnostic_metadata(
        request_id=request_id,
        mime_type=file.content_type or "unknown",
        filename=file.filename or "",
        file_size=file_size,
        dimensions=dimensions,
        reached_backend=True,
        ai_provider_status=ai_status,
        ai_provider_failure_reason=failure_reason
    )

    return analysis


@router.post("/check-duplicates", summary="Check for pre-submission duplicate complaints nearby")
def check_pre_submission_duplicates(
    draft: PreSubmissionDuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform pre-submission multi-signal duplicate check using draft location, category, title, description, and photo."""
    temp_complaint = Complaint(
        id=str(uuid.uuid4()),
        citizen_id=current_user.id,
        title=draft.title,
        description=draft.description,
        category=draft.category,
        priority=ComplaintPriorityEnum.MEDIUM,
        status=ComplaintStatusEnum.SUBMITTED,
        latitude=draft.latitude,
        longitude=draft.longitude,
        evidence_url=draft.evidence_url
    )
    dup_results = find_duplicate_complaints(db=db, target_complaint=temp_complaint)
    return dup_results


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, summary="Create a new complaint")
@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Create a new civic complaint. Automatically sets status to SUBMITTED, binds to cluster, and triggers priority evaluation."""
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
        address=complaint_in.address,
        evidence_url=complaint_in.evidence_url
    )
    db.add(new_complaint)
    db.flush()

    # Automatically attach to or create IssueCluster and update priority
    cluster = assign_or_create_cluster(db, new_complaint)

    record_complaint_created(db=db, complaint=new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint


@router.get("/public/snapshots", response_model=List[ComplaintPublicSnapshotResponse], summary="Get public complaint snapshots")
def get_public_snapshots(
    limit: int = Query(10, ge=1, le=10, description="Maximum number of snapshots to return (default 10)"),
    db: Session = Depends(get_db)
) -> List[ComplaintPublicSnapshotResponse]:
    """
    Retrieve latest public-safe complaint snapshots.
    Ordered by creation date descending (newest first).
    No authentication required.
    """
    snapshots = (
        db.query(Complaint)
        .order_by(Complaint.created_at.desc(), Complaint.id.desc())
        .limit(limit)
        .all()
    )
    return snapshots


@router.get("/{complaint_id}", response_model=ComplaintResponse, summary="Get complaint by ID")
def get_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
) -> ComplaintResponse:
    """Retrieve details of a specific complaint."""
    complaint = db.query(Complaint).filter(Complaint.id == str(complaint_id)).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    return complaint



@router.get("", response_model=ComplaintListResponse, summary="List complaints with filters")
def list_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[ComplaintStatusEnum] = Query(None, alias="status"),
    category_filter: Optional[ComplaintCategoryEnum] = Query(None, alias="category"),
    priority_filter: Optional[ComplaintPriorityEnum] = Query(None, alias="priority"),
    search: Optional[str] = Query(None, description="Search in title, description, or address"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
) -> ComplaintListResponse:
    """List complaints with filtering and pagination."""
    query = db.query(Complaint)

    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if category_filter:
        query = query.filter(Complaint.category == category_filter)
    if priority_filter:
        query = query.filter(Complaint.priority == priority_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Complaint.title.ilike(term)) |
            (Complaint.description.ilike(term)) |
            (Complaint.address.ilike(term))
        )

    total = query.count()
    items = query.order_by(Complaint.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return ComplaintListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )


@router.patch("/{complaint_id}", response_model=ComplaintResponse, summary="Update complaint details")
def update_complaint(
    complaint_id: UUID,
    complaint_in: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Update complaint details."""
    complaint = db.query(Complaint).filter(Complaint.id == str(complaint_id)).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    if current_user.role == RoleEnum.CITIZEN:
        if str(complaint.citizen_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only edit your own complaints"
            )
        if (
            complaint_in.status is not None
            or complaint_in.priority is not None
            or complaint_in.assigned_worker_id is not None
            or complaint_in.department_id is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens are not permitted to change status, priority, department, or assigned worker."
            )

    # Validate department if provided
    new_dept_obj = None
    if complaint_in.department_id is not None:
        new_dept_obj = db.query(Department).filter(Department.id == str(complaint_in.department_id)).first()
        if not new_dept_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

    # Validate worker if provided
    new_worker_obj = None
    if complaint_in.assigned_worker_id is not None:
        new_worker_obj = db.query(User).filter(User.id == str(complaint_in.assigned_worker_id)).first()
        if not new_worker_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found"
            )
        if new_worker_obj.role != RoleEnum.WORKER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user must have WORKER role"
            )
        if not new_worker_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Worker is inactive"
            )
        target_dept_id = str(complaint_in.department_id) if complaint_in.department_id is not None else complaint.department_id
        if target_dept_id and new_worker_obj.department_id and str(new_worker_obj.department_id) != str(target_dept_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Worker does not belong to complaint department"
            )

    # Check department change effect on existing assigned worker
    if complaint_in.department_id is not None and str(complaint_in.department_id) != str(complaint.department_id):
        if complaint.assigned_worker_id and complaint_in.assigned_worker_id is None:
            existing_worker = db.query(User).filter(User.id == str(complaint.assigned_worker_id)).first()
            if existing_worker and existing_worker.department_id and str(existing_worker.department_id) != str(complaint_in.department_id):
                complaint.assigned_worker_id = None

    # Preserve old values for change detection
    old_status = complaint.status
    old_priority = complaint.priority
    old_department_id = complaint.department_id
    old_worker_id = complaint.assigned_worker_id

    # Validate status transition if status provided
    allowed_transitions = {
        ComplaintStatusEnum.SUBMITTED: {ComplaintStatusEnum.UNDER_REVIEW, ComplaintStatusEnum.ASSIGNED, ComplaintStatusEnum.REJECTED},
        ComplaintStatusEnum.UNDER_REVIEW: {ComplaintStatusEnum.ASSIGNED, ComplaintStatusEnum.IN_PROGRESS, ComplaintStatusEnum.REJECTED},
        ComplaintStatusEnum.ASSIGNED: {ComplaintStatusEnum.IN_PROGRESS, ComplaintStatusEnum.RESOLVED, ComplaintStatusEnum.REJECTED},
        ComplaintStatusEnum.IN_PROGRESS: {ComplaintStatusEnum.RESOLVED, ComplaintStatusEnum.REJECTED},
        ComplaintStatusEnum.RESOLVED: {ComplaintStatusEnum.CLOSED, ComplaintStatusEnum.IN_PROGRESS},
        ComplaintStatusEnum.REJECTED: set(),
        ComplaintStatusEnum.CLOSED: set(),
    }
    if complaint_in.status is not None and complaint_in.status != old_status:
        if old_status not in allowed_transitions or complaint_in.status not in allowed_transitions[old_status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {old_status} to {complaint_in.status}"
            )

    update_data = complaint_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, UUID):
            value = str(value)
        setattr(complaint, field, value)

    # Auto transition to ASSIGNED when worker assigned if submitted or under review
    if complaint_in.assigned_worker_id is not None and complaint.status in {ComplaintStatusEnum.SUBMITTED, ComplaintStatusEnum.UNDER_REVIEW}:
        complaint.status = ComplaintStatusEnum.ASSIGNED
        complaint.assigned_at = func.now()

    # Handle status change
    if complaint_in.status is not None and old_status != complaint.status:
        record_status_changed(
            db=db,
            complaint=complaint,
            actor_id=current_user.id,
            old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
            new_status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
        )

    # Handle priority change
    if complaint_in.priority is not None and old_priority != complaint.priority:
        record_priority_changed(
            db=db,
            complaint=complaint,
            actor_id=current_user.id,
            old_priority=old_priority.value if hasattr(old_priority, "value") else str(old_priority),
            new_priority=complaint.priority.value if hasattr(complaint.priority, "value") else str(complaint.priority),
        )

    # Handle department assignment/change
    if complaint_in.department_id is not None and old_department_id != complaint.department_id:
        old_dept = db.query(Department).filter(Department.id == str(old_department_id)).first() if old_department_id else None
        record_department_assigned(
            db=db,
            complaint=complaint,
            actor_id=current_user.id,
            old_dept_name=old_dept.name if old_dept else None,
            new_dept_name=new_dept_obj.name if new_dept_obj else None,
        )

    # Handle worker assignment/unassignment
    if complaint_in.assigned_worker_id is not None and old_worker_id != complaint.assigned_worker_id:
        old_worker = db.query(User).filter(User.id == str(old_worker_id)).first() if old_worker_id else None
        record_worker_assigned(
            db=db,
            complaint=complaint,
            actor_id=current_user.id,
            old_worker_name=old_worker.full_name if old_worker else None,
            new_worker_name=new_worker_obj.full_name if new_worker_obj else None,
            new_worker_id=str(new_worker_obj.id) if new_worker_obj else None,
        )
        if complaint.assigned_worker_id:
            complaint.assigned_at = func.now()

    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/resolve", response_model=ComplaintResponse, summary="Mark complaint as resolved")
def resolve_complaint(
    complaint_id: UUID,
    resolve_in: ComplaintResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Mark complaint as RESOLVED with resolution notes and evidence."""
    complaint = db.query(Complaint).filter(Complaint.id == str(complaint_id)).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if current_user.role == RoleEnum.CITIZEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Citizens are not permitted to resolve complaints")

    # Ensure only assigned worker can resolve and status is appropriate
    if complaint.status not in {ComplaintStatusEnum.ASSIGNED, ComplaintStatusEnum.IN_PROGRESS}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot resolve complaint in its current status")
    if current_user.role == RoleEnum.WORKER and str(complaint.assigned_worker_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only assigned worker can resolve")

    old_status = complaint.status
    complaint.status = ComplaintStatusEnum.RESOLVED
    complaint.resolution_notes = resolve_in.resolution_notes
    if resolve_in.resolution_evidence:
        complaint.resolution_evidence = resolve_in.resolution_evidence
    complaint.resolved_at = func.now()
    complaint.resolved_by_id = current_user.id

    # Record status change activity and notification
    record_status_changed(
        db=db,
        complaint=complaint,
        actor_id=current_user.id,
        old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
        new_status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
    )
    record_complaint_resolved(db=db, complaint=complaint, actor_id=current_user.id)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/verify", response_model=ComplaintResponse, summary="Verify complaint resolution")
def verify_complaint(
    complaint_id: UUID,
    verify_in: ComplaintVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintResponse:
    """Verify complaint resolution."""
    complaint = db.query(Complaint).filter(Complaint.id == str(complaint_id)).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    if current_user.role == RoleEnum.CITIZEN and str(complaint.citizen_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    if complaint.status != ComplaintStatusEnum.RESOLVED or complaint.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only RESOLVED complaints can be verified, and already verified or closed complaints cannot be re-verified"
        )

    complaint.is_satisfied = verify_in.is_satisfied
    complaint.feedback_notes = verify_in.feedback_notes
    complaint.verified_at = func.now()

    old_status = complaint.status
    if verify_in.is_satisfied:
        complaint.is_verified = True
        complaint.status = ComplaintStatusEnum.CLOSED
    else:
        complaint.is_verified = False
        complaint.status = ComplaintStatusEnum.IN_PROGRESS

    # Record status change if any
    if old_status != complaint.status:
        record_status_changed(
            db=db,
            complaint=complaint,
            actor_id=current_user.id,
            old_status=old_status.value if hasattr(old_status, "value") else str(old_status),
            new_status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
        )
    record_resolution_verified(db=db, complaint=complaint, actor_id=current_user.id, is_satisfied=verify_in.is_satisfied)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/analyze", response_model=ComplaintAnalysisResponse, summary="Perform AI analysis, multi-signal duplicate detection, and cluster evaluation")
def analyze_complaint(
    complaint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ComplaintAnalysisResponse:
    """Analyze a complaint using AI services, multi-signal (text+image+geo) pgvector similarity, and persistent issue cluster evaluation."""
    complaint = db.query(Complaint).filter(Complaint.id == str(complaint_id)).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    ai_service = get_ai_service()
    ai_suggestions = ai_service.suggest_category_and_priority(complaint.title, complaint.description)
    ai_summary = ai_service.generate_summary(complaint.title, complaint.description)

    # Perform multi-signal duplicate detection and cluster assignment
    dup_results = find_duplicate_complaints(db=db, target_complaint=complaint)

    potential_dups = [
        DuplicateMatch(
            complaint_id=UUID(item["complaint_id"]),
            title=item["title"],
            status=item["status"],
            category=item["category"],
            similarity_score=item["similarity_score"],
            text_similarity=item.get("text_similarity"),
            image_similarity=item.get("image_similarity"),
            distance_meters=item["distance_meters"],
            reasoning_signals=item.get("reasoning_signals", [])
        )
        for item in dup_results["potential_duplicates"]
    ]

    cluster_priority_enum = ComplaintPriorityEnum(dup_results["cluster_priority"]) if dup_results.get("cluster_priority") in [p.value for p in ComplaintPriorityEnum] else ai_suggestions["suggested_priority"]

    return ComplaintAnalysisResponse(
        complaint_id=complaint.id,
        cluster_id=UUID(dup_results["cluster_id"]) if dup_results.get("cluster_id") else complaint.cluster_id,
        cluster_report_count=dup_results.get("cluster_report_count", 1),
        cluster_priority=cluster_priority_enum,
        suggested_category=ai_suggestions["suggested_category"],
        suggested_priority=ai_suggestions["suggested_priority"],
        summary=ai_summary,
        is_duplicate_likely=dup_results["is_duplicate_likely"],
        potential_duplicates=potential_dups,
        confidence=ai_suggestions.get("confidence", 0.85)
    )
