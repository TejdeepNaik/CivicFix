import {
  User,
  Complaint,
  ComplaintActivity,
  Notification,
  Department,
  CitizenDashboardResponse,
  WorkerDashboardResponse,
  DepartmentDashboardResponse,
  AdminDashboardResponse,
  PaginatedList,
  ComplaintAnalysisResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "civicfix_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        if (typeof errJson.detail === "string") {
          errorDetail = errJson.detail;
        } else if (Array.isArray(errJson.detail)) {
          errorDetail = errJson.detail.map((e: any) => e.msg || e.detail).join(", ");
        }
      }
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export async function loginApi(payload: Record<string, any>): Promise<{ access_token: string; token_type: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerApi(payload: Record<string, any>): Promise<User> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMeApi(): Promise<User> {
  return request("/auth/me");
}

// ---------------------------------------------------------------------------
// Complaints API
// ---------------------------------------------------------------------------

export async function uploadEvidenceApi(file: File): Promise<{ evidence_url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/complaints/upload-evidence`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = "Failed to upload photo evidence";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return res.json();
}

export async function analyzeImageApi(
  file: File,
  latitude?: number,
  longitude?: number
): Promise<{
  evidence_url: string;
  primary_issue: string | null;
  is_civic_issue: boolean;
  confidence: number;
  severity: string;
  suggested_category: string | null;
  suggested_department: string | null;
  reasoning: string;
  detections: Array<{ label: string; confidence: number; severity: string }>;
  analysis_available: boolean;
}> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const query = new URLSearchParams();
  if (latitude !== undefined && latitude !== null) query.append("latitude", String(latitude));
  if (longitude !== undefined && longitude !== null) query.append("longitude", String(longitude));
  const queryString = query.toString();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/complaints/analyze-image${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = "Failed to analyze photo evidence";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return res.json();
}

export async function checkDuplicatesApi(payload: {
  category: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  evidence_url?: string;
}): Promise<{
  is_duplicate_likely: boolean;
  potential_duplicates: Array<{
    complaint_id: string;
    title: string;
    status: string;
    category: string;
    similarity_score: number;
    distance_meters: number;
    reasoning_signals: string[];
  }>;
}> {
  return request("/complaints/check-duplicates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createComplaintApi(payload: Record<string, any>): Promise<Complaint> {
  return request("/complaints", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getComplaintApi(id: string): Promise<Complaint> {
  return request(`/complaints/${id}`);
}

export async function listComplaintsApi(params: Record<string, any> = {}): Promise<PaginatedList<Complaint>> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, String(val));
    }
  });
  const queryString = query.toString();
  return request(`/complaints${queryString ? `?${queryString}` : ""}`);
}

export async function updateComplaintApi(id: string, payload: Record<string, any>): Promise<Complaint> {
  return request(`/complaints/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function resolveComplaintApi(id: string, payload: { resolution_notes: string; resolution_evidence?: string }): Promise<Complaint> {
  return request(`/complaints/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyComplaintApi(id: string, payload: { is_satisfied: boolean; feedback_notes?: string }): Promise<Complaint> {
  return request(`/complaints/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeComplaintApi(id: string): Promise<ComplaintAnalysisResponse> {
  return request(`/complaints/${id}/analyze`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Departments API
// ---------------------------------------------------------------------------

export async function listDepartmentsApi(): Promise<Department[]> {
  return request("/departments");
}

export async function getDepartmentApi(id: string): Promise<Department> {
  return request(`/departments/${id}`);
}

// ---------------------------------------------------------------------------
// Activity API
// ---------------------------------------------------------------------------

export async function getComplaintActivityApi(complaintId: string): Promise<PaginatedList<ComplaintActivity>> {
  return request(`/complaints/${complaintId}/activity`);
}

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

export async function listNotificationsApi(params: { unread_only?: boolean; page?: number; size?: number } = {}): Promise<PaginatedList<Notification>> {
  const query = new URLSearchParams();
  if (params.unread_only) query.append("unread_only", "true");
  if (params.page) query.append("page", String(params.page));
  if (params.size) query.append("size", String(params.size));
  const queryString = query.toString();
  return request(`/notifications${queryString ? `?${queryString}` : ""}`);
}

export async function markNotificationReadApi(id: string): Promise<Notification> {
  return request(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsReadApi(): Promise<{ marked_read: number }> {
  return request("/notifications/read-all", {
    method: "PATCH",
  });
}

// ---------------------------------------------------------------------------
// Dashboard API
// ---------------------------------------------------------------------------

export async function getCitizenDashboardApi(limit: number = 5): Promise<CitizenDashboardResponse> {
  return request(`/dashboard/citizen?limit=${limit}`);
}

export async function getWorkerDashboardApi(limit: number = 5): Promise<WorkerDashboardResponse> {
  return request(`/dashboard/worker?limit=${limit}`);
}

export async function getDepartmentDashboardApi(limit: number = 5): Promise<DepartmentDashboardResponse> {
  return request(`/dashboard/department?limit=${limit}`);
}

export async function getAdminDashboardApi(limit: number = 5): Promise<AdminDashboardResponse> {
  return request(`/dashboard/admin?limit=${limit}`);
}
