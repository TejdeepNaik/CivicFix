"""Admin & RBAC test endpoints."""

from fastapi import APIRouter, Depends
from ..models.user import User
from ..models.role import RoleEnum
from .deps import require_roles

router = APIRouter()


@router.get("/dashboard", summary="Admin dashboard protected route")
def admin_dashboard(
    current_user: User = Depends(require_roles(RoleEnum.CITY_ADMIN, RoleEnum.SUPER_ADMIN, RoleEnum.DEPARTMENT_ADMIN))
) -> dict:
    """RBAC protected endpoint restricted to admin roles."""
    role_str = current_user.role.value if isinstance(current_user.role, RoleEnum) else str(current_user.role)
    return {
        "message": "Welcome to Admin Dashboard",
        "user_id": str(current_user.id),
        "role": role_str
    }
