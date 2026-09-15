"""Department Pydantic schemas for request/response serialization."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Human-readable department name")
    code: str = Field(..., min_length=2, max_length=50, description="Unique short code for the department (e.g. PWD, SW)")
    description: Optional[str] = Field(None, description="Optional description of the department's scope")


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
