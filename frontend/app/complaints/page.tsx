"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { StatusBadge, PriorityBadge, CategoryBadge } from "../../components/Badge";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { listComplaintsApi } from "../../lib/api";
import {
  Complaint,
  ComplaintCategoryEnum,
  ComplaintStatusEnum,
} from "../../lib/types";

export default function ComplaintsDirectoryPage() {
  return (
    <ProtectedRoute>
      <ComplaintsContent />
    </ProtectedRoute>
  );
}

function ComplaintsContent() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const pageSize = 10;

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listComplaintsApi({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: searchTerm || undefined,
        page,
        size: pageSize,
      });
      setComplaints(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load complaints directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Civic Complaints Directory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Browse and track reported infrastructure complaints across the municipality.
          </p>
        </div>

        <Link href="/complaints/create" className="btn-civic-primary text-xs px-5 py-2.5">
          + Report New Issue
        </Link>
      </div>

      {/* Search & Filters Controls */}
      <div className="glass-panel p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, location, or description..."
              className="form-input-modern text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="form-input-modern text-xs min-w-[140px]"
            >
              <option value="">All Statuses</option>
              {Object.values(ComplaintStatusEnum).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="form-input-modern text-xs min-w-[140px]"
            >
              <option value="">All Categories</option>
              {Object.values(ComplaintCategoryEnum).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-civic-secondary text-xs px-4 py-2.5">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Directory Results List */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No complaints found"
          description="No civic issues match your selected filters or search parameters."
          actionLabel="Report a New Issue"
          actionHref="/complaints/create"
        />
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <Link
              key={c.id}
              href={`/complaints/${c.id}`}
              className="block glass-panel p-5 glass-panel-hover space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-white hover:text-teal-400 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <CategoryBadge category={c.category} />
                <span>•</span>
                <span className="truncate max-w-xs">{c.address || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}</span>
                <span>•</span>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
          <span>
            Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total complaints)
          </span>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-civic-secondary text-xs px-3 py-1.5"
            >
              ← Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="btn-civic-secondary text-xs px-3 py-1.5"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
