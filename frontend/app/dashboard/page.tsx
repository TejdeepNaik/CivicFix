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
// Citizen View
// ---------------------------------------------------------------------------
function CitizenDashboardView() {
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
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Citizen Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track your reported municipal complaints and resolution status in real time.
          </p>
        </div>

        <Link href="/complaints/create" className="btn-civic-primary text-xs px-5 py-2.5">
          + Report an Issue
        </Link>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Reported" value={data.total_complaints} icon="📋" />
        <MetricCard title="In Progress" value={data.open_complaints_count} icon="⏳" highlight="amber" />
        <MetricCard title="Resolved & Verified" value={data.resolved_closed_count} icon="✅" highlight="emerald" />
        <MetricCard title="Unread Updates" value={data.unread_notifications_count} icon="🔔" highlight="cyan" />
      </div>

      {/* Status Breakdown Pills */}
      <div className="glass-panel p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Breakdown</h3>
        {Object.keys(data.status_breakdown).length === 0 ? (
          <p className="text-xs text-slate-500">No complaints reported yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.status_breakdown).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                <StatusBadge status={status} />
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Complaints & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints List */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">My Recent Complaints</h3>
            <Link href="/complaints" className="text-xs font-semibold text-teal-400 hover:underline">
              View All →
            </Link>
          </div>

          {data.recent_complaints.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No complaints yet"
              description="You haven't reported any civic issues yet. When you do, they'll appear here."
              actionLabel="Report an Issue"
              actionHref="/complaints/create"
            />
          ) : (
            <div className="space-y-3">
              {data.recent_complaints.map((c) => (
                <Link
                  key={c.id}
                  href={`/complaints/${c.id}`}
                  className="block p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-100 truncate pr-2">{c.title}</h4>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <CategoryBadge category={c.category} />
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Recent Audit Activity</h3>
          {data.recent_activity.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No recent activity recorded.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-400 capitalize">{act.event_type.replace(/_/g, " ")}</span>
                    <span className="text-slate-500">{new Date(act.created_at).toLocaleDateString()}</span>
                  </div>
                  {act.message && <p className="text-xs text-slate-300 leading-relaxed">{act.message}</p>}
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
// Worker View
// ---------------------------------------------------------------------------
function WorkerDashboardView() {
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
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-black text-white">Worker Task Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage your assigned field repair tasks and updates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Assigned Complaints" value={data.assigned_complaints_count} icon="👷" />
        <MetricCard title="Open Workload" value={data.open_workload_count} icon="⚡" highlight="amber" />
        <MetricCard title="Unread Alerts" value={data.unread_notifications_count} icon="🔔" highlight="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Priority Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.priority_breakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <PriorityBadge priority={priority} />
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Status Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.status_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <StatusBadge status={status} />
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assigned Tasks List */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-bold text-white text-base">Assigned Field Tasks</h3>
        {data.recent_assigned_complaints.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No assigned tasks"
            description="You currently have no open repair tasks assigned."
          />
        ) : (
          <div className="space-y-3">
            {data.recent_assigned_complaints.map((c) => (
              <Link
                key={c.id}
                href={`/complaints/${c.id}`}
                className="block p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-100">{c.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>
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
// Department Admin View
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
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-black text-white">{data.department_name}</h1>
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
            {data.department_code}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">Department Operations & Field Worker Allocation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total Department Complaints" value={data.total_complaints} icon="🏬" />
        <MetricCard title="Open Workload" value={data.open_complaints_count} icon="⏳" highlight="amber" />
        <MetricCard title="Resolved Tasks" value={data.resolved_closed_count} icon="✅" highlight="emerald" />
      </div>

      {/* Field Worker Workload Allocation */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-bold text-white text-base">Field Worker Allocation Table</h3>
        {data.worker_workload.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No field workers registered in this department.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Worker Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5 text-center">Open Tasks</th>
                  <th className="p-3.5 text-center">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {data.worker_workload.map((w) => (
                  <tr key={w.worker_id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{w.full_name || "N/A"}</td>
                    <td className="p-3.5 text-slate-400">{w.email}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {w.assigned_open_count}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-300">{w.assigned_total_count}</td>
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
// Admin View (City Admin / Super Admin)
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
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div>
        <h1 className="text-2xl font-black text-white">City Operations Platform Overview</h1>
        <p className="text-xs text-slate-400 mt-0.5">High-level municipal metrics and department performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Users" value={data.total_users} icon="👥" />
        <MetricCard title="Departments" value={data.total_departments} icon="🏬" />
        <MetricCard title="Total Complaints" value={data.total_complaints} icon="📋" />
        <MetricCard title="Open Workload" value={data.open_complaints_count} icon="⏳" highlight="amber" />
        <MetricCard title="Resolved / Closed" value={data.resolved_closed_count} icon="✅" highlight="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Users Distribution by Role</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.users_by_role).map(([role, count]) => (
              <div key={role} className="flex items-center space-x-2 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
                <RoleBadge role={role} />
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Department Complaints Breakdown</h3>
          <div className="space-y-2">
            {data.department_complaint_counts.map((d) => (
              <div key={d.department_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-200">{d.name} ({d.code})</span>
                <span className="font-bold text-teal-400">{d.complaint_count} complaints</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function MetricCard({
  title,
  value,
  icon,
  highlight,
}: {
  title: string;
  value: number;
  icon: string;
  highlight?: "amber" | "emerald" | "cyan";
}) {
  let textClass = "text-white";
  if (highlight === "amber") textClass = "text-amber-400";
  if (highlight === "emerald") textClass = "text-emerald-400";
  if (highlight === "cyan") textClass = "text-teal-400";

  return (
    <div className="glass-panel p-5 space-y-2 glass-panel-hover">
      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
        <span>{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-3xl font-black ${textClass}`}>{value}</div>
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
      <strong>Error loading dashboard:</strong> {text}
    </div>
  );
}
