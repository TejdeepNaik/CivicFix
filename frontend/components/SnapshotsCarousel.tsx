"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPublicSnapshotsApi, getMediaUrl } from "../lib/api";
import { ComplaintPublicSnapshot, ComplaintCategoryEnum } from "../lib/types";
import { StatusBadge, CategoryBadge } from "./Badge";

const CATEGORY_GRADIENTS: Record<string, string> = {
  [ComplaintCategoryEnum.POTHOLE]: "from-slate-800 to-slate-900",
  [ComplaintCategoryEnum.STREETLIGHT]: "from-amber-900 to-slate-900",
  [ComplaintCategoryEnum.GARBAGE]: "from-emerald-900 to-slate-900",
  [ComplaintCategoryEnum.WATER_LEAK]: "from-sky-900 to-slate-900",
  [ComplaintCategoryEnum.TRAFFIC_SIGNAL]: "from-rose-900 to-slate-900",
  [ComplaintCategoryEnum.DRAINAGE]: "from-indigo-900 to-slate-900",
  [ComplaintCategoryEnum.NOISE_POLLUTION]: "from-purple-900 to-slate-900",
  [ComplaintCategoryEnum.OTHER]: "from-slate-800 to-slate-900",
};

const CATEGORY_ICONS: Record<string, string> = {
  [ComplaintCategoryEnum.POTHOLE]: "🕳️",
  [ComplaintCategoryEnum.STREETLIGHT]: "💡",
  [ComplaintCategoryEnum.GARBAGE]: "🗑️",
  [ComplaintCategoryEnum.WATER_LEAK]: "💧",
  [ComplaintCategoryEnum.TRAFFIC_SIGNAL]: "🚦",
  [ComplaintCategoryEnum.DRAINAGE]: "🌊",
  [ComplaintCategoryEnum.NOISE_POLLUTION]: "📢",
  [ComplaintCategoryEnum.OTHER]: "📋",
};

export default function SnapshotsCarousel() {
  const [snapshots, setSnapshots] = useState<ComplaintPublicSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const fetchSnapshots = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await getPublicSnapshotsApi(10);
      setSnapshots(data || []);
      setError(null);
    } catch (err: any) {
      if (!snapshots.length) {
        setError(err.message || "Failed to load recent complaint snapshots.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [snapshots.length]);

  useEffect(() => {
    fetchSnapshots();

    // Lightweight polling every 10 seconds while active
    const pollInterval = setInterval(() => {
      fetchSnapshots(true);
    }, 10000);

    // Instant update listener on local complaint submissions/edits
    const handleComplaintUpdate = () => fetchSnapshots(true);
    window.addEventListener("civicfix:complaint_created", handleComplaintUpdate);
    window.addEventListener("civicfix:complaint_updated", handleComplaintUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("civicfix:complaint_created", handleComplaintUpdate);
      window.removeEventListener("civicfix:complaint_updated", handleComplaintUpdate);
    };
  }, [fetchSnapshots]);

  const handleNext = () => {
    if (snapshots.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % snapshots.length);
  };

  const handlePrev = () => {
    if (snapshots.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + snapshots.length) % snapshots.length);
  };

  const handleImageError = (id: string) => {
    setImageErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section className="gov-card p-5 sm:p-6 bg-white border border-slate-200 space-y-4 shadow-xs">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-0.5">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CivicLens Audit Stream</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Latest Complaint Snapshots
          </h2>
          <p className="text-xs text-slate-500">
            Real-time municipal issue register — auto-refreshed from active database records.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={snapshots.length <= 1}
              aria-label="Previous snapshot"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              disabled={snapshots.length <= 1}
              aria-label="Next snapshot"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <Link
            href="/complaints"
            className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline transition-colors shrink-0"
          >
            View All Register →
          </Link>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        /* Loading Skeleton Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="gov-card p-4 bg-slate-50 border border-slate-200 space-y-3 animate-pulse">
              <div className="h-40 rounded-lg bg-slate-200" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error && snapshots.length === 0 ? (
        /* API Error State */
        <div className="p-6 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-xs text-rose-800 font-semibold">{error}</p>
          <button
            onClick={() => fetchSnapshots()}
            className="btn-gov-secondary text-xs px-4 py-2 text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            Retry Loading Snapshots
          </button>
        </div>
      ) : snapshots.length === 0 ? (
        /* 0 Complaints Empty State */
        <div className="py-12 px-4 text-center space-y-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xl">
            📋
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No complaints reported yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first resident to submit a municipal repair request in your neighborhood.
            </p>
          </div>
          <Link href="/complaints/create" className="btn-gov-blue text-xs px-5 py-2.5 inline-block shadow-xs">
            Report an Issue
          </Link>
        </div>
      ) : (
        /* Real Complaints Carousel Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getVisibleSnapshots(snapshots, currentIndex).map((item) => {
              const hasImage = item.evidence_url && !imageErrorMap[item.id];
              const mediaUrl = hasImage ? getMediaUrl(item.evidence_url) : "";
              const bgGradient = CATEGORY_GRADIENTS[item.category] || "from-slate-800 to-slate-900";
              const catIcon = CATEGORY_ICONS[item.category] || "📋";

              return (
                <div
                  key={item.id}
                  className="gov-card bg-white border border-slate-200 flex flex-col justify-between overflow-hidden shadow-xs hover:border-sky-400 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Media / Fallback Image Container */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-200">
                      {hasImage ? (
                        <img
                          src={mediaUrl}
                          alt={item.title}
                          onError={() => handleImageError(item.id)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${bgGradient} p-4 flex flex-col justify-between text-white relative`}>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{catIcon}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-950/70 border border-slate-700 text-[10px] font-mono text-slate-300">
                              Official Record
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                              CivicFix Infrastructure Audit
                            </span>
                            <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Top Badges Overlay */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                        <CategoryBadge category={item.category} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>REF: #{item.id.substring(0, 8).toUpperCase()}</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 truncate pt-1">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">
                          {item.address || `${item.latitude?.toFixed(3)}, ${item.longitude?.toFixed(3)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Read More Link */}
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Public Record Verified
                    </span>
                    <Link
                      href={`/complaints/${item.id}`}
                      className="font-bold text-sky-700 hover:text-sky-900 group-hover:translate-x-0.5 transition-transform flex items-center gap-1"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Indicators */}
          {snapshots.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {snapshots.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-6 bg-[#0f2942]"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </section>
  );
}

/** Helper to return visible carousel items wrapping around cyclically */
function getVisibleSnapshots(items: ComplaintPublicSnapshot[], startIndex: number): ComplaintPublicSnapshot[] {
  if (!items.length) return [];
  const result: ComplaintPublicSnapshot[] = [];
  const maxDisplay = Math.min(3, items.length);
  for (let i = 0; i < maxDisplay; i++) {
    result.push(items[(startIndex + i) % items.length]);
  }
  return result;
}
