"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { StatusBadge, PriorityBadge, CategoryBadge } from "../../components/Badge";
import { listComplaintsApi } from "../../lib/api";
import {
  Complaint,
  ComplaintStatusEnum,
  ComplaintPriorityEnum,
  ComplaintCategoryEnum,
} from "../../lib/types";

export default function ComplaintsListPage() {
  return (
    <ProtectedRoute>
      <ComplaintsListContent />
    </ProtectedRoute>
  );
}

function ComplaintsListContent() {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const fetchComplaints = () => {
    setLoading(true);
    listComplaintsApi({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      page,
      size: 15,
    })
      .then((res) => {
        setComplaints(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter, categoryFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Complaints Directory</h1>
          <p className="text-xs text-slate-400">
            {user?.role === "citizen"
              ? "View and track your submitted civic complaints"
              : "Browse and filter complaints across municipal departments"}
          </p>
        </div>

        {user?.role === "citizen" && (
          <Link href="/complaints/create" className="btn-primary text-xs px-4 py-2.5">
            + Report New Issue
          </Link>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
          >
            <option value="">All Statuses</option>
            {Object.values(ComplaintStatusEnum).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Category Filter</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
          >
            <option value="">All Categories</option>
            {Object.values(ComplaintCategoryEnum).map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Priority Filter</label>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="form-input"
          >
            <option value="">All Priorities</option>
            {Object.values(ComplaintPriorityEnum).map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="mt-2 text-xs text-slate-400">Fetching complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <p className="text-slate-400 text-sm">No complaints found matching the selected filters.</p>
          {user?.role === "citizen" && (
            <Link href="/complaints/create" className="btn-primary text-xs px-4 py-2">
              Submit a Complaint
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Link
              key={c.id}
              href={`/complaints/${c.id}`}
              className="block glass-card p-5 glass-card-hover space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-white hover:text-emerald-400 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <CategoryBadge category={c.category} />
                  {c.address && <span className="truncate max-w-xs">📍 {c.address}</span>}
                </div>
                <span>Submitted {new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {total > 15 && (
        <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
          <span>Showing page {page} of {Math.ceil(total / 15)} ({total} total complaints)</span>
          <div className="flex space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary px-3 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
