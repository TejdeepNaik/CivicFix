"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { StatusBadge, PriorityBadge, CategoryBadge } from "../../../components/Badge";
import { StatusTimeline } from "../../../components/StatusTimeline";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  getComplaintApi,
  getComplaintActivityApi,
  resolveComplaintApi,
  verifyComplaintApi,
  updateComplaintApi,
  listDepartmentsApi,
  getToken,
} from "../../../lib/api";
import {
  Complaint,
  ComplaintActivity,
  ComplaintAnalysisResponse,
  ComplaintStatusEnum,
  Department,
  RoleEnum,
} from "../../../lib/types";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapView = dynamic(() => import("../../../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs animate-pulse">
      Loading map...
    </div>
  ),
});

export default function ComplaintDetailPage() {
  return (
    <ProtectedRoute>
      <ComplaintDetailContent />
    </ProtectedRoute>
  );
}

function ComplaintDetailContent() {
  const params = useParams();
  const router = useRouter();
  const complaintId = params?.id as string;
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [activities, setActivities] = useState<ComplaintActivity[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<ComplaintAnalysisResponse | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionEvidence, setResolutionEvidence] = useState("");
  const [resolving, setResolving] = useState(false);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fetchData = async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const [cData, actData] = await Promise.all([
        getComplaintApi(complaintId),
        getComplaintActivityApi(complaintId),
      ]);
      setComplaint(cData);
      setActivities(actData.items);

      if (
        user?.role === RoleEnum.CITY_ADMIN ||
        user?.role === RoleEnum.SUPER_ADMIN ||
        user?.role === RoleEnum.DEPARTMENT_ADMIN
      ) {
        listDepartmentsApi()
          .then((res) => setDepartments(Array.isArray(res) ? res : (res as any).items || []))
          .catch(() => {});
      }

      // Fetch Real AI Duplicate Analysis
      runAiAnalysis(complaintId);
    } catch (err: any) {
      setError(err.message || "Failed to load complaint details.");
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (cId: string) => {
    setAnalyzingAi(true);
    try {
      const token = getToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/complaints/${cId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.ok) {
        const json = await res.json();
        setAiAnalysis(json);
      }
    } catch {
      // Non-blocking AI analysis fallback
    } finally {
      setAnalyzingAi(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [complaintId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || resolutionNotes.length < 5) return;
    setResolving(true);
    try {
      await resolveComplaintApi(complaint.id, {
        resolution_notes: resolutionNotes,
        resolution_evidence: resolutionEvidence || undefined,
      });
      setShowResolveModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to submit resolution.");
    } finally {
      setResolving(false);
    }
  };

  const handleVerify = async (isSatisfied: boolean) => {
    if (!complaint) return;
    setVerifying(true);
    try {
      await verifyComplaintApi(complaint.id, {
        is_satisfied: isSatisfied,
        feedback_notes: feedbackNotes || undefined,
      });
      setShowVerifyModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to verify.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDeptRoute = async (deptId: string) => {
    if (!complaint || !deptId) return;
    try {
      await updateComplaintApi(complaint.id, { department_id: deptId });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to assign department.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto py-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 animate-fade-in">
        <div className="p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error || "Complaint record not found"}
        </div>
        <button
          onClick={() => router.back()}
          className="btn-gov-secondary text-xs px-5 py-2.5"
        >
          ← Go Back to Register
        </button>
      </div>
    );
  }

  const isOwner = user?.id === complaint.citizen_id;
  const isAssignedWorker = user?.id === complaint.assigned_worker_id;
  const isAdmin =
    user?.role === RoleEnum.DEPARTMENT_ADMIN ||
    user?.role === RoleEnum.CITY_ADMIN ||
    user?.role === RoleEnum.SUPER_ADMIN;

  const hasWorkerActions =
    (isAssignedWorker || isAdmin) &&
    (complaint.status === ComplaintStatusEnum.ASSIGNED ||
      complaint.status === ComplaintStatusEnum.IN_PROGRESS);

  const hasCitizenVerifyActions = isOwner && complaint.status === ComplaintStatusEnum.RESOLVED;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4 animate-fade-in">

      {/* Header Bar */}
      <div className="space-y-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Complaints Register
        </button>

        <div className="gov-card p-5 bg-[#0f2942] text-white rounded-lg border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-semibold">CASE REF:</span>
              <span className="font-mono text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                #{complaint.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black leading-snug">
              {complaint.title}
            </h1>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 flex-wrap">
              <CategoryBadge category={complaint.category} />
              <span>•</span>
              <span>
                Reported {new Date(complaint.created_at).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-900/90 p-2.5 rounded border border-slate-800">
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
        </div>
      </div>

      {/* Visual 5-Stage Status Timeline */}
      <div className="gov-card p-5 bg-white border border-slate-200">
        <StatusTimeline status={complaint.status} />
      </div>

      {/* Main Content Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Complaint Details, AI Clustering, Activity Audit Log */}
        <div className="lg:col-span-7 space-y-6">

          {/* Problem Description Card */}
          <div className="gov-card p-5 space-y-3 bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Official Case Description
            </h3>
            <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-line font-normal">
              {complaint.description}
            </p>
          </div>

          {/* ── REAL AI DUPLICATE ISSUE DETECTION & CLUSTERING SECTION ── */}
          <div className="gov-card p-5 bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#0f2942] uppercase tracking-wider">
                  AI Duplicate Detection & Issue Clustering
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px] border border-sky-300 font-bold">
                  pgvector AI
                </span>
              </div>
              {analyzingAi && (
                <span className="text-[11px] text-slate-500 animate-pulse font-medium">
                  Analyzing similarity…
                </span>
              )}
            </div>

            {aiAnalysis ? (
              <div className="space-y-3">
                {aiAnalysis.cluster_id && (
                  <div className="p-3 rounded bg-slate-900 text-white border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Persistent Issue Cluster
                      </span>
                      <span className="font-mono text-amber-400 font-bold">
                        CLST-{aiAnalysis.cluster_id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-semibold border border-slate-700">
                        {aiAnalysis.cluster_report_count} Report{aiAnalysis.cluster_report_count > 1 ? "s" : ""} Linked
                      </span>
                      <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Priority:</span>
                        <PriorityBadge priority={aiAnalysis.cluster_priority} />
                      </div>
                    </div>
                  </div>
                )}

                {aiAnalysis.summary && (
                  <div className="p-3 rounded bg-white border border-slate-200 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      AI Executive Summary
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {aiAnalysis.summary}
                    </p>
                  </div>
                )}

                {aiAnalysis.is_duplicate_likely && aiAnalysis.potential_duplicates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center justify-between">
                      <span>Related Nearby Reports ({aiAnalysis.potential_duplicates.length})</span>
                      <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                        Proximity Match
                      </span>
                    </div>

                    <div className="space-y-2">
                      {aiAnalysis.potential_duplicates.map((dup: any) => (
                        <Link
                          key={dup.complaint_id}
                          href={`/complaints/${dup.complaint_id}`}
                          className="block p-3 rounded bg-white border border-slate-200 hover:border-sky-500 transition-colors space-y-1 group"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                              {dup.title}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              {(dup.similarity_score * 100).toFixed(0)}% Match
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span className="capitalize">{dup.category}</span>
                            <span>•</span>
                            <span className="uppercase">{dup.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-white border border-slate-200 text-xs text-slate-600">
                    No duplicate reports detected in geographic proximity.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 text-xs text-slate-500 text-center">
                Similarity detection active.
              </div>
            )}
          </div>

          {/* Activity History Audit Log */}
          <div className="gov-card p-5 space-y-3 bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
              Activity Audit Log
            </h3>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No activity recorded yet.
              </p>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

                {activities.map((act, idx) => (
                  <div key={act.id} className="relative pl-6 pb-3">
                    <div
                      className={`absolute left-0 top-1 w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                        idx === 0
                          ? "bg-[#0f2942] border-[#0f2942] text-white"
                          : "bg-white border-slate-300 text-slate-500"
                      }`}
                    >
                      {idx === 0 ? "●" : "○"}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 capitalize block">
                        {act.event_type.replace(/_/g, " ")}
                      </span>
                      {act.message && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">{act.message}</p>
                      )}
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Status Summary, Location Map, Contained Evidence, Actions */}
        <div className="lg:col-span-5 space-y-6">

          {/* Status & Category Card */}
          <div className="gov-card p-5 space-y-3 bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
              Case Metadata & Location
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Status:</span>
                <StatusBadge status={complaint.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Priority:</span>
                <PriorityBadge priority={complaint.priority} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Category:</span>
                <CategoryBadge category={complaint.category} />
              </div>
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-semibold block mb-0.5">Address:</span>
                <span className="font-bold text-slate-900 block">
                  {complaint.address || `${complaint.latitude?.toFixed(4)}, ${complaint.longitude?.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Contained Map View */}
            <div className="rounded-lg overflow-hidden border border-slate-300 mt-2">
              <MapView latitude={complaint.latitude} longitude={complaint.longitude} height="h-44" />
            </div>
          </div>

          {/* Submitted Photo Evidence (Strict 4:3 / 16:9 Contained max-h-52) */}
          {complaint.evidence_url && (
            <div className="gov-card p-5 space-y-2 bg-white border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Photo Evidence
              </h3>
              <div className="rounded-lg overflow-hidden border border-slate-300 max-h-52 bg-slate-900 flex justify-center">
                <img
                  src={
                    complaint.evidence_url.startsWith("http")
                      ? complaint.evidence_url
                      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${complaint.evidence_url}`
                  }
                  alt="Complaint photo evidence"
                  className="object-contain max-h-52 w-full"
                />
              </div>
            </div>
          )}

          {/* Resolution Summary if available */}
          {complaint.resolution_notes && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span>
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Work Resolution Report
                </span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed">
                {complaint.resolution_notes}
              </p>
              {complaint.resolution_evidence && (
                <a
                  href={complaint.resolution_evidence}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline font-bold transition-colors pt-0.5"
                >
                  View Attached Resolution Photo →
                </a>
              )}
            </div>
          )}

          {/* Citizen Verification Callout */}
          {hasCitizenVerifyActions && (
            <div className="gov-card p-5 bg-amber-50/90 border-2 border-amber-300 space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-950 font-bold text-xs">
                <span>🔍 Action Required: Verify Work</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                Municipal crews marked this repair as resolved. Please verify your satisfaction.
              </p>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="btn-gov-primary text-xs px-4 py-2 w-full"
              >
                Verify Resolution Now →
              </button>
            </div>
          )}

          {/* Worker Actions */}
          {hasWorkerActions && (
            <div className="gov-card p-5 bg-slate-50 border border-slate-300 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Field Worker Actions
              </h3>
              <button
                onClick={() => setShowResolveModal(true)}
                className="btn-gov-blue text-xs px-4 py-2 w-full shadow-xs"
              >
                Mark Issue as Resolved ✓
              </button>
            </div>
          )}

          {/* Department Admin Routing */}
          {isAdmin && (
            <div className="gov-card p-4 bg-white space-y-2 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Department Assignment Controls
              </h3>
              <select
                value={complaint.department_id || ""}
                onChange={(e) => handleDeptRoute(e.target.value)}
                className="gov-input text-xs py-1.5 w-full"
              >
                <option value="">Route to Department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

      </div>

      {/* Modal: Mark Resolved */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="gov-card max-w-lg w-full p-6 space-y-5 bg-white shadow-xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Submit Resolution Evidence</h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div className="space-y-1">
                <label className="gov-label">
                  Repair Actions & Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe repair actions completed, materials used, and field status..."
                  className="gov-input resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="gov-label">
                  Work Evidence Photo URL (Optional)
                </label>
                <input
                  type="text"
                  value={resolutionEvidence}
                  onChange={(e) => setResolutionEvidence(e.target.value)}
                  placeholder="https://..."
                  className="gov-input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="btn-gov-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="btn-gov-blue text-xs px-5 py-2"
                >
                  {resolving ? "Submitting..." : "Confirm Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="gov-card max-w-lg w-full p-6 space-y-5 bg-white shadow-xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Verify Resolution</h3>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Is the reported issue resolved to your satisfaction?
            </p>

            <div className="space-y-1">
              <label className="gov-label">
                Resident Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Feedback for municipal field crews..."
                className="gov-input resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(false)}
                className="btn-gov-secondary text-xs px-4 py-2 text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                Request Rework
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(true)}
                className="btn-gov-primary text-xs px-5 py-2"
              >
                {verifying ? "Saving..." : "Accept & Close Report"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
