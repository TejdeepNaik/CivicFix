"""Schemas for dashboard aggregation endpoints."""

from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel

from .complaint import ComplaintResponse
from .activity import ActivityResponse


class WorkerWorkloadItem(BaseModel):
    worker_id: UUID
    full_name: Optional[str]
    email: str
    assigned_open_count: int
    assigned_total_count: int


class DepartmentCountItem(BaseModel):
    department_id: UUID
    name: str
    code: str
    complaint_count: int


class CitizenDashboardResponse(BaseModel):
    total_complaints: int
    open_complaints_count: int
    resolved_closed_count: int
    status_breakdown: Dict[str, int]
    recent_complaints: List[ComplaintResponse]
    recent_activity: List[ActivityResponse]
    unread_notifications_count: int


class WorkerDashboardResponse(BaseModel):
    assigned_complaints_count: int
    open_workload_count: int
    status_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]
    recent_assigned_complaints: List[ComplaintResponse]
    recent_activity: List[ActivityResponse]
    unread_notifications_count: int


class DepartmentDashboardResponse(BaseModel):
    department_id: UUID
    department_name: str
    department_code: str
    total_complaints: int
    open_complaints_count: int
    resolved_closed_count: int
    status_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]
    recently_submitted: List[ComplaintResponse]
    recently_resolved: List[ComplaintResponse]
    worker_workload: List[WorkerWorkloadItem]


class AdminDashboardResponse(BaseModel):
    total_users: int
    users_by_role: Dict[str, int]
    total_departments: int
    total_complaints: int
    open_complaints_count: int
    resolved_closed_count: int
    status_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]
    department_complaint_counts: List[DepartmentCountItem]
    recent_complaints: List[ComplaintResponse]
    worker_workload_summary: List[WorkerWorkloadItem]
