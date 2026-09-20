"""Health check API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import get_db
from ..schemas.health import HealthStatus
from ..core.config import settings

router = APIRouter()


@router.get("", response_model=HealthStatus, summary="Check application and database status")
@router.get("/", response_model=HealthStatus, include_in_schema=False)
def check_health(db: Session = Depends(get_db)) -> HealthStatus:
    """Verify application health and PostgreSQL database connection."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"degraded: {str(e)}"

    return HealthStatus(
        status="ok",
        database=db_status,
        project=settings.PROJECT_NAME,
        version=settings.VERSION
    )
