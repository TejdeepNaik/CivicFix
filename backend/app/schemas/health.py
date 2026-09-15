"""Health check schema definitions."""

from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str
    database: str
    project: str
    version: str
