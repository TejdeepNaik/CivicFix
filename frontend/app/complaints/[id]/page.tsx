"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { StatusBadge, PriorityBadge, CategoryBadge } from "../../../components/Badge";
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
  loading: () => <div className="h-48 w-full rounded-lg bg-slate-800 animate-pulse flex items-center justify-center text-slate-500 text-xs">Loading map...</div>
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

  const [deptRoutingId, setDeptRoutingId] = useState<string>("");

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

      if (user?.role === RoleEnum.CITY_ADMIN || user?.role === RoleEnum.SUPER_ADMIN || user?.role === RoleEnum.DEPARTMENT_ADMIN) {
        listDepartmentsApi()
          .then((res) => setDepartments(Array.isArray(res) ? res : (res as any).items || []))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || "Failed to load complaint details");
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
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="mt-3 text-xs text-slate-400">Loading complaint details...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-6 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm">
        {error || "Complaint not found"}
      </div>
    );
  }

  const isOwner = user?.id === complaint.citizen_id;
  const isAssignedWorker = user?.id === complaint.assigned_worker_id;
  const isAdmin = user?.role === RoleEnum.DEPARTMENT_ADMIN || user?.role === RoleEnum.CITY_ADMIN || user?.role === RoleEnum.SUPER_ADMIN;

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-white mb-2 flex items-center space-x-1"
          >
            ← Back
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-white">{complaint.title}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Submitted {new Date(complaint.created_at).toLocaleString()}</p>
        </div>

        <div className="flex items-center space-x-3">
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      {/* Main Grid: Details + Workflow Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{complaint.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Category</span>
                <div className="mt-1"><CategoryBadge category={complaint.category} /></div>
              </div>
              <div>
                <span className="text-slate-500 block">Location</span>
                <span className="text-slate-300 font-semibold mt-1 block">
                  {complaint.address || `${complaint.latitude.toFixed(4)}, ${complaint.longitude.toFixed(4)}`}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <MapView latitude={complaint.latitude} longitude={complaint.longitude} />
            </div>

            {complaint.resolution_notes && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolution Notes</span>
                <p className="text-xs text-emerald-200">{complaint.resolution_notes}</p>
              </div>
            )}
          </div>

          {/* Workflow Action Panel */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workflow Actions</h3>

            <div className="flex flex-wrap items-center gap-3">
              {/* Worker or Admin Resolve Action */}
              {(isAssignedWorker || isAdmin) &&
                (complaint.status === ComplaintStatusEnum.ASSIGNED || complaint.status === ComplaintStatusEnum.IN_PROGRESS) && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    Mark as Resolved
                  </button>
                )}

              {/* Citizen Verification Action */}
              {isOwner && complaint.status === ComplaintStatusEnum.RESOLVED && (
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="btn-primary text-xs px-4 py-2 bg-emerald-500 text-slate-950"
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
                    className="form-input text-xs py-1.5"
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
            </div>
          </div>
        </div>

        {/* Right Column: Activity Timeline Audit Trail */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity Audit Trail</h3>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {activities.map((act) => (
                  <div key={act.id} className="relative pl-7 space-y-1">
                    <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-950" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 capitalize">
                        {act.event_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {act.message && <p className="text-xs text-slate-400">{act.message}</p>}
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

      {/* Modal: Resolve Complaint */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
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
                  placeholder="Describe resolution measures implemented..."
                  className="form-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Evidence Link (Optional)</label>
                <input
                  type="text"
                  value={resolutionEvidence}
                  onChange={(e) => setResolutionEvidence(e.target.value)}
                  placeholder="https://evidence-url..."
                  className="form-input"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  {resolving ? "Resolving..." : "Submit Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify Complaint (Satisfied vs Reject) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Verify Resolution</h3>
            <p className="text-xs text-slate-400">
              Are you satisfied with the work completed for this complaint?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Feedback / Notes</label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Optional feedback..."
                className="form-input"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
              >
                Reject & Request Rework
              </button>
              <button
                type="button"
                disabled={verifying}
                onClick={() => handleVerify(true)}
                className="btn-primary text-xs px-4 py-2"
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
