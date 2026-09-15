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
    <div className="h-48 w-full rounded-xl bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center text-slate-500 text-xs">
      Loading map preview...
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

  // Workflow Modal States
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
      setError(err.message || "Failed to load complaint details. Please check the URL.");
    } finally {
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
      alert(err.message || "Failed to update verification state.");
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
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="p-6 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm font-medium">
          {error || "Complaint record not found"}
        </div>
        <button onClick={() => router.back()} className="btn-civic-secondary text-xs px-5 py-2.5">
          ← Back to Complaints
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-white mb-1 inline-flex items-center gap-1 transition-colors"
          >
            ← Back to Directory
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white">{complaint.title}</h1>
          </div>
          <p className="text-xs text-slate-400">
            Reported on {new Date(complaint.created_at).toLocaleString()} • ID:{" "}
            <span className="font-mono text-teal-400">{complaint.id.substring(0, 8)}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      {/* Visual Resolution Pipeline Banner */}
      <div className="glass-panel p-6 shadow-lg">
        <StatusTimeline status={complaint.status} />
      </div>

      {/* Main Grid: Complaint Details & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{complaint.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Category</span>
                <div className="mt-1"><CategoryBadge category={complaint.category} /></div>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Location Address</span>
                <span className="text-slate-200 font-medium mt-1 block">
                  {complaint.address || `${complaint.latitude.toFixed(4)}, ${complaint.longitude.toFixed(4)}`}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-slate-800">
              <MapView latitude={complaint.latitude} longitude={complaint.longitude} />
            </div>

            {/* Resolution Notes Display */}
            {complaint.resolution_notes && (
              <div className="mt-4 p-5 rounded-xl bg-teal-950/40 border border-teal-800/60 space-y-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                  Work Completion & Resolution Notes
                </span>
                <p className="text-xs text-teal-200 leading-relaxed">{complaint.resolution_notes}</p>
                {complaint.resolution_evidence && (
                  <a
                    href={complaint.resolution_evidence}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-300 underline font-mono block pt-1"
                  >
                    View Resolution Evidence →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Workflow Action Panel */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Actions</h3>

            <div className="flex flex-wrap items-center gap-3">
              {/* Worker or Admin Resolve Action */}
              {(isAssignedWorker || isAdmin) &&
                (complaint.status === ComplaintStatusEnum.ASSIGNED ||
                  complaint.status === ComplaintStatusEnum.IN_PROGRESS) && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="btn-civic-primary text-xs px-5 py-2.5"
                  >
                    Mark Issue as Resolved
                  </button>
                )}

              {/* Citizen Verification Action */}
              {isOwner && complaint.status === ComplaintStatusEnum.RESOLVED && (
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="btn-civic-primary text-xs px-5 py-2.5 bg-emerald-500 text-slate-950"
                >
                  Verify Resolution Status
                </button>
              )}

              {/* Admin Department Routing */}
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <select
                    value={complaint.department_id || ""}
                    onChange={(e) => handleDeptRoute(e.target.value)}
                    className="form-input-modern text-xs py-2"
                  >
                    <option value="">Route to Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isAssignedWorker && !isOwner && !isAdmin && (
                <p className="text-xs text-slate-500">No pending workflow actions for your role on this report.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity Timeline Audit Trail */}
        <div className="space-y-6">
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity Audit Trail</h3>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {activities.map((act) => (
                  <div key={act.id} className="relative pl-7 space-y-1">
                    <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-teal-400 ring-4 ring-slate-950 shadow" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 capitalize">
                        {act.event_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {act.message && <p className="text-xs text-slate-400 leading-relaxed">{act.message}</p>}
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Mark Resolved */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white">Resolve Complaint</h3>
            <form onSubmit={handleResolve} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Resolution Notes (Min 5 chars)</label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe the repair actions taken..."
                  className="form-input-modern"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Evidence Link (Optional)</label>
                <input
                  type="text"
                  value={resolutionEvidence}
                  onChange={(e) => setResolutionEvidence(e.target.value)}
                  placeholder="https://evidence-url..."
                  className="form-input-modern"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
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
                  className="btn-civic-primary text-xs px-5 py-2"
                >
                  {resolving ? "Submitting..." : "Confirm Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Citizen Verification */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white">Verify Resolution</h3>
            <p className="text-xs text-slate-400">
              Are you satisfied with the work completed for this complaint?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Optional Feedback</label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Add any feedback for the municipal crew..."
                className="form-input-modern"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
              >
                Request Rework
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(true)}
                className="btn-civic-primary text-xs px-5 py-2"
              >
                Accept & Close Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
