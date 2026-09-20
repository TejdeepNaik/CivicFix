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
// Citizen Dashboard View — Structured CivicLens Government Portal Style
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

  const recentComplaints = data.recent_complaints || [];
  const statusBreakdown = data.status_breakdown || {};
  const recentActivity = data.recent_activity || [];
  const totalComplaints = data.total_complaints ?? 0;
  const openComplaintsCount = data.open_complaints_count ?? 0;
  const resolvedClosedCount = data.resolved_closed_count ?? 0;

  const pendingVerificationCount = recentComplaints.filter(
    (c) => c?.status === "resolved"
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">
      
      {/* Welcome Header */}
      <div className="gov-card p-5 sm:p-6 bg-[#0f2942] text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">
              Citizen Service Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Welcome back{user?.full_name ? `, ${user.full_name}` : ""}.
            </h1>
            <p className="text-xs text-slate-300">
              Track reported community issues, view department dispatches, and verify field resolutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/complaints/create" className="btn-gov-blue text-xs px-3.5 py-2 shadow-xs">
              + Report an Issue
            </Link>
            <Link href="/complaints" className="btn-gov-secondary text-xs px-3.5 py-2">
              Explore Issues Directory
            </Link>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="pt-3 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <Link href="/complaints/create" className="p-2.5 rounded bg-slate-800/80 border border-slate-700 hover:border-sky-500 transition-colors flex items-center justify-between">
            <span className="font-bold text-white">1. Report an Issue</span>
            <span className="text-sky-400">→</span>
          </Link>
          <Link href="#my-issues" className="p-2.5 rounded bg-slate-800/80 border border-slate-700 hover:border-sky-500 transition-colors flex items-center justify-between">
            <span className="font-bold text-white">2. My Reports ({totalComplaints})</span>
            <span className="text-sky-400">→</span>
          </Link>
          <Link href="/complaints" className="p-2.5 rounded bg-slate-800/80 border border-slate-700 hover:border-sky-500 transition-colors flex items-center justify-between">
            <span className="font-bold text-white">3. City Map View</span>
            <span className="text-sky-400">→</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gov-card p-4 space-y-1 bg-white border-t-2 border-t-[#0f2942]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Logged</span>
          <div className="text-2xl font-bold text-slate-900">{totalComplaints}</div>
        </div>

        <div className="gov-card p-4 space-y-1 bg-amber-50/70 border-t-2 border-t-amber-600">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Active Open Workload</span>
          <div className="text-2xl font-bold text-amber-900">{openComplaintsCount}</div>
        </div>

        <div className="gov-card p-4 space-y-1 bg-emerald-50/70 border-t-2 border-t-emerald-600">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Resolved & Closed</span>
          <div className="text-2xl font-bold text-emerald-900">{resolvedClosedCount}</div>
        </div>

        <div className="gov-card p-4 space-y-1 bg-sky-50/70 border-t-2 border-t-sky-600">
          <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">Pending Verification</span>
          <div className="text-2xl font-bold text-sky-900">{pendingVerificationCount}</div>
        </div>
      </div>

      {/* Status Breakdown Summary */}
      <div className="gov-card p-4 space-y-2 bg-white">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status Breakdown Summary</h3>
        {Object.keys(statusBreakdown).length === 0 ? (
          <p className="text-xs text-slate-500">No complaints reported yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
              >
                <StatusBadge status={status} />
                <span className="text-xs font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Issues & Audit Section */}
      <div id="my-issues" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Reports List */}
        <div className="lg:col-span-7 gov-card p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">My Recent Issues</h3>
            <Link href="/complaints" className="text-xs font-bold text-sky-700 hover:underline">
              View All Reports →
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No issues reported yet"
              description="You haven't submitted any civic issues. Use the report button below to start your first submission."
              actionLabel="Report an Issue Now"
              actionHref="/complaints/create"
            />
          ) : (
            <div className="space-y-2">
              {recentComplaints.map((c) => (
                <Link
                  key={c.id}
                  href={`/complaints/${c.id}`}
                  className="block p-3 rounded border border-slate-200 hover:border-sky-500 transition-all space-y-1 bg-slate-50/50 group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors truncate pr-2">
                      {c.title}
                    </h4>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <CategoryBadge category={c.category} />
                    <span>•</span>
                    <span className="font-mono text-slate-600 font-bold">
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

        {/* Recent Audit Stream */}
        <div className="lg:col-span-5 gov-card p-5 space-y-3 bg-white">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-200">Recent Activity Trail</h3>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No recent activity logged.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((act) => (
                <div key={act.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-800 capitalize">{act.event_type.replace(/_/g, " ")}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(act.created_at).toLocaleDateString()}</span>
                  </div>
                  {act.message && <p className="text-[11px] text-slate-700 leading-snug">{act.message}</p>}
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
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="gov-card p-5 bg-[#0f2942] text-white space-y-1">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
          Field Operations Work Queue
        </span>
        <h1 className="text-xl font-black">Worker Dashboard{user?.full_name ? `, ${user.full_name}` : ""}</h1>
        <p className="text-xs text-slate-300">Actionable list of assigned field repair tasks and evidence submission queue.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gov-card p-4 space-y-1 bg-white border-t-2 border-t-[#0f2942]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Tasks</span>
          <div className="text-2xl font-bold text-slate-900">{data.assigned_complaints_count}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-amber-50/70 border-t-2 border-t-amber-600">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Open Workload</span>
          <div className="text-2xl font-bold text-amber-900">{data.open_workload_count}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-sky-50/70 border-t-2 border-t-sky-600">
          <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">Unread Field Alerts</span>
          <div className="text-2xl font-bold text-sky-900">{data.unread_notifications_count}</div>
        </div>
      </div>

      <div className="gov-card p-5 space-y-3 bg-white">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-200">Assigned Field Complaints</h3>
        {data.recent_assigned_complaints.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No open tasks"
            description="You currently have no open repair tasks assigned."
          />
        ) : (
          <div className="space-y-2">
            {data.recent_assigned_complaints.map((c) => (
              <Link
                key={c.id}
                href={`/complaints/${c.id}`}
                className="block p-3 rounded border border-slate-200 hover:border-sky-500 transition-colors bg-slate-50/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-slate-900">{c.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{c.description}</p>
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
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="gov-card p-5 bg-[#0f2942] text-white space-y-1">
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">
          Department Operations Management
        </span>
        <h1 className="text-xl font-black">{data.department_name} ({data.department_code})</h1>
        <p className="text-xs text-[#cbd5e1]">Workload allocation, complaint routing, and field crew monitoring.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gov-card p-4 space-y-1 bg-white border-t-2 border-t-[#0f2942]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Department Issues</span>
          <div className="text-2xl font-bold text-slate-900">{data.total_complaints}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-amber-50/70 border-t-2 border-t-amber-600">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Open Workload</span>
          <div className="text-2xl font-bold text-amber-900">{data.open_complaints_count}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-emerald-50/70 border-t-2 border-t-emerald-600">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Resolved Issues</span>
          <div className="text-2xl font-bold text-emerald-900">{data.resolved_closed_count}</div>
        </div>
      </div>

      <div className="gov-card p-5 space-y-3 bg-white">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider pb-2 border-b border-slate-200">Field Worker Workload Summary</h3>
        {data.worker_workload.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No workers assigned to this department.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Worker Name</th>
                  <th className="p-2.5">Email</th>
                  <th className="p-2.5 text-center">Open Tasks</th>
                  <th className="p-2.5 text-center">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.worker_workload.map((w) => (
                  <tr key={w.worker_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold text-slate-900">{w.full_name || "N/A"}</td>
                    <td className="p-2.5 text-slate-600">{w.email}</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {w.assigned_open_count}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-800">{w.assigned_total_count}</td>
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
// Admin Dashboard View
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
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">
      <div className="gov-card p-5 bg-[#0f2942] text-white space-y-1">
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">Citywide Administration</span>
        <h1 className="text-xl font-black">Municipal Infrastructure Console</h1>
        <p className="text-xs text-slate-300">Cross-department metrics, system users, and resolution throughput.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="gov-card p-4 space-y-1 bg-white border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Users</span>
          <div className="text-2xl font-bold text-slate-900">{data.total_users}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-white border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Departments</span>
          <div className="text-2xl font-bold text-slate-900">{data.total_departments}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-white border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Complaints</span>
          <div className="text-2xl font-bold text-slate-900">{data.total_complaints}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-amber-50/80 border border-amber-200">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Open Workload</span>
          <div className="text-2xl font-bold text-amber-900">{data.open_complaints_count}</div>
        </div>
        <div className="gov-card p-4 space-y-1 bg-emerald-50/80 border border-emerald-200">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Resolved</span>
          <div className="text-2xl font-bold text-emerald-900">{data.resolved_closed_count}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
      <strong>Error loading dashboard:</strong> {text}
    </div>
  );
}
