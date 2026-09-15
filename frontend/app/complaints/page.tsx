"use client";

import React, { useEffect, useState, useCallback } from "react";
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

const CATEGORY_ICONS: Record<string, string> = {
  pothole: "🕳️",
  streetlight: "💡",
  garbage: "🗑️",
  water_leak: "💧",
  sewage: "🌊",
  traffic_signal: "🚦",
  drainage: "🌊",
  park_maintenance: "🌳",
  noise_pollution: "📢",
  other: "📋",
};

function ComplaintsContent() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");

  const pageSize = 12;

  const fetchComplaints = useCallback(async () => {
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
      setError(err.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, searchTerm]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue);
    setPage(1);
  };

  const handleFilterChange = (type: "status" | "category", value: string) => {
    if (type === "status") setStatusFilter(value);
    if (type === "category") setCategoryFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setSearchTerm("");
    setInputValue("");
    setPage(1);
  };

  const hasFilters = statusFilter || categoryFilter || searchTerm;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Public Audit Log & Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            311 Service Requests Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Search, filter, and track public infrastructure complaints across the city.
          </p>
        </div>

        <Link
          href="/complaints/create"
          className="btn-civic-gold text-xs px-5 py-2.5 shrink-0 shadow-sm"
        >
          + Submit New Request
        </Link>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="civic-card p-4 space-y-3 bg-white">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search title, location, description, or ID..."
              className="input-civic pl-10 text-xs"
            />
          </div>

          {/* Select Status */}
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input-civic text-xs md:max-w-[170px]"
          >
            <option value="">All Statuses</option>
            {Object.values(ComplaintStatusEnum).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Select Category */}
          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="input-civic text-xs md:max-w-[170px]"
          >
            <option value="">All Categories</option>
            {Object.values(ComplaintCategoryEnum).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-civic-primary text-xs px-6 py-2.5 shrink-0">
            Search
          </button>
        </form>

        {/* Active Filters Pill Row */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Active filters:</span>
            {statusFilter && (
              <FilterPill label={`Status: ${statusFilter.replace(/_/g, " ")}`} onRemove={() => handleFilterChange("status", "")} />
            )}
            {categoryFilter && (
              <FilterPill label={`Category: ${categoryFilter.replace(/_/g, " ")}`} onRemove={() => handleFilterChange("category", "")} />
            )}
            {searchTerm && (
              <FilterPill label={`"${searchTerm}"`} onRemove={() => { setSearchTerm(""); setInputValue(""); }} />
            )}
            <button
              onClick={clearFilters}
              className="text-[11px] text-rose-700 hover:underline ml-1 font-bold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Results Summary ── */}
      {!loading && !error && (
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>
            {total === 0
              ? "No matching requests found"
              : `Showing ${total} service request${total !== 1 ? "s" : ""}`}
          </span>
          {totalPages > 1 && (
            <span>
              Page <strong className="text-slate-900">{page}</strong> of{" "}
              <strong className="text-slate-900">{totalPages}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── List Rows ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No requests found"
          description="No civic service requests match your search criteria. Try adjusting your filters or search terms."
          actionLabel="Clear Filters"
          actionHref="/complaints"
        />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-civic-secondary text-xs px-4 py-2 disabled:opacity-40"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1">
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    pg === page
                      ? "bg-[#0a2540] text-white"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
          </div>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-civic-secondary text-xs px-4 py-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Complaint Row Component ── */
function ComplaintRow({ complaint: c }: { complaint: Complaint }) {
  const icon = CATEGORY_ICONS[c.category] ?? "📋";
  const timeAgo = formatTimeAgo(c.created_at);

  return (
    <Link
      href={`/complaints/${c.id}`}
      className="group civic-card p-4 hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4 bg-white"
    >
      {/* Category Icon */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 mt-0.5">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate pr-2">
            {c.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={c.priority} />
            <StatusBadge status={c.status} />
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
          {c.description}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
          <CategoryBadge category={c.category} />
          <span>•</span>
          <span className="font-mono text-slate-700 font-bold">
            #{c.id.substring(0, 8).toUpperCase()}
          </span>
          <span>•</span>
          {(c.address || `${c.latitude?.toFixed(3)}, ${c.longitude?.toFixed(3)}`) && (
            <>
              <span className="truncate max-w-[200px] text-slate-700 font-medium">
                {c.address || `${c.latitude?.toFixed(3)}, ${c.longitude?.toFixed(3)}`}
              </span>
              <span>•</span>
            </>
          )}
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors shrink-0 mt-2"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
      {label}
      <button
        onClick={onRemove}
        className="text-blue-600 hover:text-blue-900 font-black leading-none ml-1"
        aria-label="Remove filter"
      >
        ×
      </button>
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
