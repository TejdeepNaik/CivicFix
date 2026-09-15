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
} from "../../../lib/api";
import {
  Complaint,
  ComplaintActivity,
  ComplaintStatusEnum,
  Department,
  RoleEnum,
} from "../../../lib/types";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../../../components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-xs animate-pulse">
      Loading location map…
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
    } catch (err: any) {
      setError(err.message || "Failed to load complaint details.");
    } fontally: () => {
      setLoading(false);
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
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error || "Complaint not found"}
        </div>
        <button
          onClick={() => router.back()}
          className="btn-civic-secondary text-xs px-5 py-2.5"
        >
          ← Go Back
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

  const hasActions =
    (
      (isAssignedWorker || isAdmin) &&
      (complaint.status === ComplaintStatusEnum.ASSIGNED ||
        complaint.status === ComplaintStatusEnum.IN_PROGRESS)
    ) ||
    (isOwner && complaint.status === ComplaintStatusEnum.RESOLVED) ||
    isAdmin;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4 animate-fade-in">

      {/* ── Breadcrumb & Header Card ── */}
      <div className="space-y-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Service Directory
        </button>

        <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-400">
              <span>TRACKING ID:</span>
              <span className="font-bold bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800">
                #{complaint.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black leading-snug">
              {complaint.title}
            </h1>
            <div className="text-xs text-slate-300">
              Reported on {new Date(complaint.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
        </div>
      </div>

      {/* ── 6-Stage Resolution Timeline ── */}
      <div className="civic-card p-5 sm:p-6 bg-white">
        <StatusTimeline status={complaint.status} />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Issue Details & Map ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Details Card */}
          <div className="civic-card p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Description & Notes
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {complaint.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Category
                </span>
                <CategoryBadge category={complaint.category} />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Location Address
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {complaint.address ||
                    `${complaint.latitude?.toFixed(4)}, ${complaint.longitude?.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Geographic Location Pin
              </span>
              <div className="rounded-xl overflow-hidden border border-slate-300">
                <MapView latitude={complaint.latitude} longitude={complaint.longitude} />
              </div>
            </div>

            {/* Resolution Notes section if present */}
            {complaint.resolution_notes && (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700 text-base font-bold">✓</span>
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
                    className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-bold transition-colors pt-1"
                  >
                    View Attached Work Evidence →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions Panel */}
          {hasActions && (
            <div className="civic-card p-5 sm:p-6 space-y-4 bg-slate-50 border border-slate-300">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Municipal Action Panel
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {/* Worker/Admin resolve */}
                {(isAssignedWorker || isAdmin) &&
                  (complaint.status === ComplaintStatusEnum.ASSIGNED ||
                    complaint.status === ComplaintStatusEnum.IN_PROGRESS) && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="btn-civic-gold text-xs px-5 py-2.5 shadow-sm"
                    >
                      Mark Issue as Resolved ✓
                    </button>
                  )}

                {/* Citizen verify */}
                {isOwner && complaint.status === ComplaintStatusEnum.RESOLVED && (
                  <button
                    onClick={() => setShowVerifyModal(true)}
                    className="btn-civic-primary text-xs px-5 py-2.5"
                  >
                    Verify & Confirm Resolution
                  </button>
                )}

                {/* Admin department routing */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <select
                      value={complaint.department_id || ""}
                      onChange={(e) => handleDeptRoute(e.target.value)}
                      className="input-civic text-xs py-2 max-w-[240px]"
                    >
                      <option value="">Assign to Department…</option>
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
          )}
        </div>

        {/* ── Right: Official Activity Audit Trail ── */}
        <div className="space-y-5">
          <div className="civic-card p-5 space-y-4 bg-white sticky top-24">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-200">
              Official Activity Audit Trail
            </h3>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No activity recorded yet.
              </p>
            ) : (
              <div className="space-y-0 relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

                {activities.map((act, idx) => (
                  <div key={act.id} className="relative pl-7 pb-4">
                    {/* Dot indicator */}
                    <div
                      className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                        idx === 0
                          ? "bg-blue-600 border-blue-700 text-white"
                          : "bg-slate-100 border-slate-300 text-slate-500"
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
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Mark Resolved ── */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="civic-card max-w-lg w-full p-6 space-y-5 bg-white shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Submit Work Completion Report</h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Resolution & Repair Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe field repair actions completed, materials installed, and outcome..."
                  className="input-civic text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Work Evidence Photo / Document URL (Optional)
                </label>
                <input
                  type="text"
                  value={resolutionEvidence}
                  onChange={(e) => setResolutionEvidence(e.target.value)}
                  placeholder="https://..."
                  className="input-civic text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="btn-civic-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="btn-civic-gold text-xs px-5 py-2"
                >
                  {resolving ? "Submitting..." : "Confirm Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Citizen Verification ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="civic-card max-w-lg w-full p-6 space-y-5 bg-white shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Verify & Close Request</h3>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Is the reported issue fixed to your satisfaction? Your feedback helps maintain municipal service standards.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Resident Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Any additional feedback for city field workers..."
                className="input-civic text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(false)}
                className="btn-civic-secondary text-xs px-4 py-2 text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                Request Rework
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(true)}
                className="btn-civic-primary text-xs px-5 py-2"
              >
                {verifying ? "Saving..." : "Accept & Close Request"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
