"""Department management API endpoints (Admin/Super-admin only)."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..db.database import get_db
from ..models.department import Department
from ..models.role import RoleEnum
from ..schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from .deps import require_roles, get_current_user
from ..models.user import User

router = APIRouter()

# Only CITY_ADMIN and SUPER_ADMIN can create/modify departments.
# DEPARTMENT_ADMIN can read.
DEPARTMENT_MANAGE_ROLES = (RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN)
DEPARTMENT_READ_ROLES = (
    RoleEnum.CITY_ADMIN,
    RoleEnum.SUPER_ADMIN,
    RoleEnum.DEPARTMENT_ADMIN,
    RoleEnum.WORKER,
)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new department"
)
@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(*DEPARTMENT_MANAGE_ROLES))
) -> DepartmentResponse:
    """Create a new department. Restricted to CITY_ADMIN and SUPER_ADMIN."""
    dept = Department(
        name=dept_in.name,
        code=dept_in.code.upper(),
        description=dept_in.description
    )
    db.add(dept)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with that name or code already exists"
        )
    db.refresh(dept)
    return dept


@router.get(
    "",
    response_model=list[DepartmentResponse],
    summary="List all departments"
)
@router.get("/", response_model=list[DepartmentResponse], include_in_schema=False)
def list_departments(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(*DEPARTMENT_READ_ROLES))
) -> list[DepartmentResponse]:
    """List all departments. Accessible to admin/worker roles."""
    return db.query(Department).order_by(Department.name).all()


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Get department by ID"
)
def get_department(
    department_id: UUID,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(*DEPARTMENT_READ_ROLES))
) -> DepartmentResponse:
    """Get a department by UUID. Accessible to admin/worker roles."""
    dept = db.query(Department).filter(Department.id == str(department_id)).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return dept


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Update department details"
)
def update_department(
    department_id: UUID,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_roles(*DEPARTMENT_MANAGE_ROLES))
) -> DepartmentResponse:
    """Update department name, code, or description. Restricted to CITY_ADMIN and SUPER_ADMIN."""
    dept = db.query(Department).filter(Department.id == str(department_id)).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    update_data = dept_in.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] is not None:
        update_data["code"] = update_data["code"].upper()
    for field, value in update_data.items():
        setattr(dept, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A department with that name or code already exists"
        )
    db.refresh(dept)
    return dept
