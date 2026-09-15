"""API router aggregation."""

from fastapi import APIRouter

from .health import router as health_router
from .auth import router as auth_router
from .admin import router as admin_router
from .complaints import router as complaints_router
from .departments import router as departments_router
from .activity import router as activity_router
from .notifications import router as notifications_router
from .dashboard import router as dashboard_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(complaints_router, prefix="/complaints", tags=["Complaints"])
api_router.include_router(activity_router, prefix="/complaints", tags=["Activity"])
api_router.include_router(departments_router, prefix="/departments", tags=["Departments"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
