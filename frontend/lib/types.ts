/**
 * TypeScript type definitions matching CivicFix FastAPI backend schemas.
 */

export enum RoleEnum {
  CITIZEN = "citizen",
  WORKER = "worker",
  DEPARTMENT_ADMIN = "department_admin",
  CITY_ADMIN = "city_admin",
  SUPER_ADMIN = "super_admin",
}

export enum ComplaintStatusEnum {
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  REJECTED = "rejected",
  CLOSED = "closed",
}

export enum ComplaintPriorityEnum {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ComplaintCategoryEnum {
  POTHOLE = "pothole",
  STREETLIGHT = "streetlight",
  GARBAGE = "garbage",
  WATER_LEAK = "water_leak",
  TRAFFIC_SIGNAL = "traffic_signal",
  DRAINAGE = "drainage",
  NOISE_POLLUTION = "noise_pollution",
  OTHER = "other",
}

export enum ActivityEventEnum {
  COMPLAINT_CREATED = "complaint_created",
  DEPARTMENT_ASSIGNED = "department_assigned",
  DEPARTMENT_CHANGED = "department_changed",
  WORKER_ASSIGNED = "worker_assigned",
  WORKER_UNASSIGNED = "worker_unassigned",
  STATUS_CHANGED = "status_changed",
  PRIORITY_CHANGED = "priority_changed",
  COMPLAINT_RESOLVED = "complaint_resolved",
  RESOLUTION_VERIFIED = "resolution_verified",
  COMPLAINT_CLOSED = "complaint_closed",
  COMPLAINT_REOPENED = "complaint_reopened",
  REWORK_REQUESTED = "rework_requested",
}

export enum NotificationTypeEnum {
  COMPLAINT_SUBMITTED = "complaint_submitted",
  DEPARTMENT_ASSIGNED = "department_assigned",
  DEPARTMENT_CHANGED = "department_changed",
  WORKER_ASSIGNED = "worker_assigned",
  STATUS_CHANGED = "status_changed",
  COMPLAINT_RESOLVED = "complaint_resolved",
  RESOLUTION_REQUIRES_VERIFICATION = "resolution_requires_verification",
  COMPLAINT_CLOSED = "complaint_closed",
  COMPLAINT_REOPENED = "complaint_reopened",
  COMPLAINT_ASSIGNED_TO_WORKER = "complaint_assigned_to_worker",
  COMPLAINT_REASSIGNED = "complaint_reassigned",
  COMPLAINT_RETURNED_FOR_REWORK = "complaint_returned_for_rework",
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: RoleEnum;
  is_active: boolean;
  is_verified: boolean;
  department_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Complaint {
  id: string;
  citizen_id: string;
  assigned_worker_id?: string | null;
  department_id?: string | null;
  title: string;
  description: string;
  category: ComplaintCategoryEnum;
  status: ComplaintStatusEnum;
  priority: ComplaintPriorityEnum;
  latitude: number;
  longitude: number;
  address?: string | null;
  assigned_at?: string | null;
  resolution_notes?: string | null;
  resolution_evidence?: string | null;
  resolved_at?: string | null;
  resolved_by_id?: string | null;
  is_verified?: boolean;
  is_satisfied?: boolean | null;
  feedback_notes?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ComplaintActivity {
  id: string;
  complaint_id: string;
  actor_id?: string | null;
  event_type: ActivityEventEnum;
  previous_value?: string | null;
  new_value?: string | null;
  message?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  complaint_id?: string | null;
  notification_type: NotificationTypeEnum;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  created_at?: string;
}

export interface WorkerWorkloadItem {
  worker_id: string;
  full_name?: string | null;
  email: string;
  assigned_open_count: number;
  assigned_total_count: number;
}

export interface DepartmentCountItem {
  department_id: string;
  name: string;
  code: string;
  complaint_count: number;
}

export interface CitizenDashboardResponse {
  total_complaints: number;
  open_complaints_count: number;
  resolved_closed_count: number;
  status_breakdown: Record<string, number>;
  recent_complaints: Complaint[];
  recent_activity: ComplaintActivity[];
  unread_notifications_count: number;
}

export interface WorkerDashboardResponse {
  assigned_complaints_count: number;
  open_workload_count: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  recent_assigned_complaints: Complaint[];
  recent_activity: ComplaintActivity[];
  unread_notifications_count: number;
}

export interface DepartmentDashboardResponse {
  department_id: string;
  department_name: string;
  department_code: string;
  total_complaints: number;
  open_complaints_count: number;
  resolved_closed_count: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  recently_submitted: Complaint[];
  recently_resolved: Complaint[];
  worker_workload: WorkerWorkloadItem[];
}

export interface AdminDashboardResponse {
  total_users: number;
  users_by_role: Record<string, number>;
  total_departments: number;
  total_complaints: number;
  open_complaints_count: number;
  resolved_closed_count: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  department_complaint_counts: DepartmentCountItem[];
  recent_complaints: Complaint[];
  worker_workload_summary: WorkerWorkloadItem[];
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
