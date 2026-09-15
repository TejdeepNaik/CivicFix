"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { StatusBadge, PriorityBadge, CategoryBadge, RoleBadge } from "../../components/Badge";
import { SkeletonDashboard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import {
  getCitizenDashboardApi,
  getWorkerDashboardApi,
  getDepartmentDashboardApi,
  getAdminDashboardApi,
} from "../../lib/api";
import {
  CitizenDashboardResponse,
  WorkerDashboardResponse,
  DepartmentDashboardResponse,
  AdminDashboardResponse,
  RoleEnum,
} from "../../lib/types";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case RoleEnum.CITIZEN:
      return <CitizenDashboardView />;
    case RoleEnum.WORKER:
      return <WorkerDashboardView />;
    case RoleEnum.DEPARTMENT_ADMIN:
      return <DepartmentDashboardView />;
    case RoleEnum.CITY_ADMIN:
    case RoleEnum.SUPER_ADMIN:
      return <AdminDashboardView />;
    default:
      return <CitizenDashboardView />;
  }
}

// ---------------------------------------------------------------------------
// Citizen Dashboard View
// ---------------------------------------------------------------------------
function CitizenDashboardView() {
  const { user } = useAuth();
  const [data, setData] = useState<CitizenDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCitizenDashboardApi(5)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonDashboard />;
  if (error) return <ErrorMessage text={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 animate-fade-in">
      {/* Top Greeting Header */}
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Resident Portal</span>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Track status and progress of your reported community service requests.
          </p>
        </div>

        <Link href="/complaints/create" className="btn-civic-gold text-xs px-5 py-3 shrink-0 shadow-sm">
          + Submit New Request
        </Link>
      </div>

      {/* Primary Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="civic-card p-5 space-y-1 bg-white border-t-4 border-t-[#0a2540]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Reports Logged</span>
          <div className="text-4xl font-black text-[#0a2540]">{data.total_complaints}</div>
        </div>

        <div className="civic-card p-5 space-y-1 bg-amber-50/50 border-t-4 border-t-amber-600">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">In Progress</span>
          <div className="text-4xl font-black text-amber-800">{data.open_complaints_count}</div>
        </div>

        <div className="civic-card p-5 space-y-1 bg-emerald-50/50 border-t-4 border-t-emerald-600">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Resolved & Verified</span>
          <div className="text-4xl font-black text-emerald-800">{data.resolved_closed_count}</div>
        </div>

        <div className="civic-card p-5 space-y-1 bg-blue-50/50 border-t-4 border-t-blue-600">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Unread Alerts</span>
          <div className="text-4xl font-black text-blue-800">{data.unread_notifications_count}</div>
        </div>
      </div>

      {/* Status Breakdown Bar */}
      <div className="civic-card p-5 space-y-3 bg-white">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status Overview Breakdown</h3>
        {Object.keys(data.status_breakdown).length === 0 ? (
          <p className="text-xs text-slate-500">No complaints reported yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.status_breakdown).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200"
              >
                <StatusBadge status={status} />
                <span className="text-xs font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Recent Reports & Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports List */}
        <div className="civic-card p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">My Recent Requests</h3>
            <Link href="/complaints" className="text-xs font-bold text-blue-700 hover:underline">
              View All →
            </Link>
          </div>

          {data.recent_complaints.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No reports yet"
              description="You haven't submitted any service requests yet."
              actionLabel="Submit Request Now →"
              actionHref="/complaints/create"
            />
          ) : (
            <div className="space-y-3">
              {data.recent_complaints.map((c) => (
                <Link
                  key={c.id}
                  href={`/complaints/${c.id}`}
                  className="block p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all space-y-2 group bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate pr-2">
                      {c.title}
                    </h4>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <CategoryBadge category={c.category} />
                    <span>•</span>
                    <span className="font-mono text-slate-700 font-bold">
                      #{c.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="civic-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Recent Service Stream</h3>
          {data.recent_activity.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activity logged.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-800 capitalize">{act.event_type.replace(/_/g, " ")}</span>
                    <span className="text-slate-500">{new Date(act.created_at).toLocaleDateString()}</span>
                  </div>
                  {act.message && <p className="text-xs text-slate-700 leading-relaxed">{act.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Worker Dashboard View
// ---------------------------------------------------------------------------
function WorkerDashboardView() {
  const { user } = useAuth();
  const [data, setData] = useState<WorkerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkerDashboardApi(5)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonDashboard />;
  if (error) return <ErrorMessage text={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md space-y-1">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Field Operations</span>
        <h1 className="text-2xl sm:text-3xl font-black">
          Worker Task Queue{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">Manage assigned municipal repairs, field notes, and completion logs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="civic-card p-6 space-y-1 bg-white border-t-4 border-t-[#0a2540]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Assigned Tasks</span>
          <div className="text-4xl font-black text-slate-900">{data.assigned_complaints_count}</div>
        </div>
        <div className="civic-card p-6 space-y-1 bg-amber-50/50 border-t-4 border-t-amber-600">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Open Workload</span>
          <div className="text-4xl font-black text-amber-800">{data.open_workload_count}</div>
        </div>
        <div className="civic-card p-6 space-y-1 bg-blue-50/50 border-t-4 border-t-blue-600">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Unread Notifications</span>
          <div className="text-4xl font-black text-blue-800">{data.unread_notifications_count}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="civic-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Priority Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.priority_breakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200">
                <PriorityBadge priority={priority} />
                <span className="text-xs font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="civic-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Status Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.status_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200">
                <StatusBadge status={status} />
                <span className="text-xs font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assigned Tasks List */}
      <div className="civic-card p-6 space-y-4 bg-white">
        <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Assigned Field Tasks Queue</h3>
        {data.recent_assigned_complaints.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No open tasks"
            description="You currently have no open repair tasks assigned."
          />
        ) : (
          <div className="space-y-3">
            {data.recent_assigned_complaints.map((c) => (
              <Link
                key={c.id}
                href={`/complaints/${c.id}`}
                className="block p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-colors bg-slate-50/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{c.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-1">{c.description}</p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Department Admin Dashboard View
// ---------------------------------------------------------------------------
function DepartmentDashboardView() {
  const [data, setData] = useState<DepartmentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDepartmentDashboardApi(5)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonDashboard />;
  if (error) return <ErrorMessage text={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md space-y-2">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl sm:text-3xl font-black">{data.department_name}</h1>
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500 text-slate-950">
            {data.department_code}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">Department Workload & Field Worker Allocation Command Center</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="civic-card p-6 space-y-1 bg-white border-t-4 border-t-[#0a2540]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Department Issues</span>
          <div className="text-4xl font-black text-slate-900">{data.total_complaints}</div>
        </div>
        <div className="civic-card p-6 space-y-1 bg-amber-50/50 border-t-4 border-t-amber-600">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Open Workload</span>
          <div className="text-4xl font-black text-amber-800">{data.open_complaints_count}</div>
        </div>
        <div className="civic-card p-6 space-y-1 bg-emerald-50/50 border-t-4 border-t-emerald-600">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Resolved Issues</span>
          <div className="text-4xl font-black text-emerald-800">{data.resolved_closed_count}</div>
        </div>
      </div>

      {/* Field Worker Allocation Table */}
      <div className="civic-card p-6 space-y-4 bg-white">
        <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Field Worker Allocation Table</h3>
        {data.worker_workload.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No workers assigned to this department.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Worker Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5 text-center">Open Tasks</th>
                  <th className="p-3.5 text-center">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.worker_workload.map((w) => (
                  <tr key={w.worker_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{w.full_name || "N/A"}</td>
                    <td className="p-3.5 text-slate-600">{w.email}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {w.assigned_open_count}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{w.assigned_total_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard View (City Admin / Super Admin)
// ---------------------------------------------------------------------------
function AdminDashboardView() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminDashboardApi(5)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonDashboard />;
  if (error) return <ErrorMessage text={error} />;
  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md space-y-1">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Citywide Administration</span>
        <h1 className="text-2xl sm:text-3xl font-black">Municipal Platform Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-300">High-level city metrics, role distribution, and department throughput.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="civic-card p-5 space-y-1 bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
          <div className="text-3xl font-black text-slate-900">{data.total_users}</div>
        </div>
        <div className="civic-card p-5 space-y-1 bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Departments</span>
          <div className="text-3xl font-black text-slate-900">{data.total_departments}</div>
        </div>
        <div className="civic-card p-5 space-y-1 bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Complaints</span>
          <div className="text-3xl font-black text-slate-900">{data.total_complaints}</div>
        </div>
        <div className="civic-card p-5 space-y-1 bg-amber-50">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Open Workload</span>
          <div className="text-3xl font-black text-amber-800">{data.open_complaints_count}</div>
        </div>
        <div className="civic-card p-5 space-y-1 bg-emerald-50">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Resolved</span>
          <div className="text-3xl font-black text-emerald-800">{data.resolved_closed_count}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="civic-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Users Distribution by Role</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.users_by_role).map(([role, count]) => (
              <div key={role} className="flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <RoleBadge role={role} />
                <span className="text-sm font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="civic-card p-6 space-y-4 bg-white">
          <h3 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-200">Department Complaints Breakdown</h3>
          <div className="space-y-2">
            {data.department_complaint_counts.map((d) => (
              <div key={d.department_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800">{d.name} ({d.code})</span>
                <span className="font-bold text-blue-800">{d.complaint_count} complaints</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
      <strong>Error loading dashboard:</strong> {text}
    </div>
  );
}
