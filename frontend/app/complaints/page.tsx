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
  ComplaintPriorityEnum,
} from "../../lib/types";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 text-xs animate-pulse">
      Loading interactive map...
    </div>
  ),
});

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
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");

  const [viewMode, setViewMode] = useState<"list" | "split">("split");

  const pageSize = 12;

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listComplaintsApi({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
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
  }, [page, statusFilter, categoryFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue);
    setPage(1);
  };

  const handleFilterChange = (type: "status" | "category" | "priority", value: string) => {
    if (type === "status") setStatusFilter(value);
    if (type === "category") setCategoryFilter(value);
    if (type === "priority") setPriorityFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
    setSearchTerm("");
    setInputValue("");
    setPage(1);
  };

  const hasFilters = statusFilter || categoryFilter || priorityFilter || searchTerm;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
            Government Public Audit Directory
          </span>
          <h1 className="text-xl font-black text-slate-900">
            Explore Municipal Complaints & Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Search, filter, and inspect reported civic issues across your city.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg border border-slate-200 bg-slate-100 text-xs">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === "split" ? "bg-[#0f2942] text-white shadow-xs" : "text-slate-700"
              }`}
            >
              🗺️ Map View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === "list" ? "bg-[#0f2942] text-white shadow-xs" : "text-slate-700"
              }`}
            >
              📋 List View
            </button>
          </div>

          <Link
            href="/complaints/create"
            className="btn-gov-blue text-xs px-4 py-2 shrink-0 shadow-xs"
          >
            + Report an Issue
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="gov-card p-4 space-y-3 bg-white border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
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
              placeholder="Search title, street, description, or reference ID..."
              className="gov-input pl-10 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="gov-input text-xs md:max-w-[150px]"
          >
            <option value="">All Statuses</option>
            {Object.values(ComplaintStatusEnum).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="gov-input text-xs md:max-w-[150px]"
          >
            <option value="">All Categories</option>
            {Object.values(ComplaintCategoryEnum).map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="gov-input text-xs md:max-w-[140px]"
          >
            <option value="">All Priorities</option>
            {Object.values(ComplaintPriorityEnum).map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-gov-primary text-xs px-5 py-2.5 shrink-0">
            Search
          </button>
        </form>

        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Active:</span>
            {statusFilter && (
              <FilterPill label={`Status: ${statusFilter.replace(/_/g, " ")}`} onRemove={() => handleFilterChange("status", "")} />
            )}
            {categoryFilter && (
              <FilterPill label={`Category: ${categoryFilter.replace(/_/g, " ")}`} onRemove={() => handleFilterChange("category", "")} />
            )}
            {priorityFilter && (
              <FilterPill label={`Priority: ${priorityFilter}`} onRemove={() => handleFilterChange("priority", "")} />
            )}
            {searchTerm && (
              <FilterPill label={`"${searchTerm}"`} onRemove={() => { setSearchTerm(""); setInputValue(""); }} />
            )}
            <button
              onClick={clearFilters}
              className="text-[11px] text-rose-600 hover:underline ml-1 font-semibold"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Directory Display Area */}
      {viewMode === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Complaints List */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{total} Issue{total !== 1 ? "s" : ""} Found</span>
              {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
                {error}
              </div>
            ) : complaints.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No matching reports"
                description="No complaints match your filters."
                actionLabel="Clear Filters"
                actionHref="/complaints"
              />
            ) : (
              <div className="space-y-2.5">
                {complaints.map((c) => (
                  <ComplaintRow key={c.id} complaint={c} />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Interactive Leaflet Map View */}
          <div className="lg:col-span-6 sticky top-24">
            <div className="gov-card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 font-bold text-slate-900">
                <span>Civic Geographic Location Map</span>
                <span className="text-sky-700 font-mono text-[11px]">{complaints.length} Pins Loaded</span>
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-300">
                <MapView
                  latitude={complaints[0]?.latitude || 41.8781}
                  longitude={complaints[0]?.longitude || -87.6298}
                  height="h-[520px]"
                />
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Full Width List View */
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs">
              {error}
            </div>
          ) : (
            <div className="space-y-2.5">
              {complaints.map((c) => (
                <ComplaintRow key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-gov-secondary text-xs px-4 py-2 disabled:opacity-40"
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
                      ? "bg-[#0f2942] text-white"
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
            className="btn-gov-secondary text-xs px-4 py-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}

function ComplaintRow({ complaint: c }: { complaint: Complaint }) {
  const icon = CATEGORY_ICONS[c.category] ?? "📋";

  return (
    <Link
      href={`/complaints/${c.id}`}
      className="group gov-card p-3.5 gov-card-hover flex items-center justify-between gap-3 bg-white border border-slate-200"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-base shrink-0">
          {icon}
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors truncate">
              {c.title}
            </h3>
            <StatusBadge status={c.status} />
            <PriorityBadge priority={c.priority} />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
            <span className="font-semibold text-slate-700">
              {c.address || `${c.latitude?.toFixed(3)}, ${c.longitude?.toFixed(3)}`}
            </span>
            <span>•</span>
            <span>{new Date(c.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span className="font-mono text-slate-400">
              #{c.id.substring(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 text-xs font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform">
        View →
      </div>
    </Link>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-50 border border-sky-200 text-sky-900 text-[11px] font-bold">
      {label}
      <button
        onClick={onRemove}
        className="text-sky-600 hover:text-sky-900 font-black leading-none ml-1"
      >
        ×
      </button>
    </span>
  );
}
