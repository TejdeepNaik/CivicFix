"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { createComplaintApi } from "../../../lib/api";
import {
  ComplaintCategoryEnum,
  ComplaintPriorityEnum,
  RoleEnum,
} from "../../../lib/types";
import { CategoryBadge, PriorityBadge } from "../../../components/Badge";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("../../../components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl bg-slate-900 border border-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
      <span className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <span>Loading Interactive Map...</span>
    </div>
  ),
});

export default function CreateComplaintPage() {
  return (
    <ProtectedRoute allowedRoles={[RoleEnum.CITIZEN]}>
      <CreateComplaintWizard />
    </ProtectedRoute>
  );
}

function CreateComplaintWizard() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategoryEnum>(ComplaintCategoryEnum.POTHOLE);
  const [priority, setPriority] = useState<ComplaintPriorityEnum>(ComplaintPriorityEnum.MEDIUM);
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation per step
  const validateStep1 = () => {
    if (title.trim().length < 3) {
      setError("Please provide a short title (at least 3 characters).");
      return false;
    }
    if (description.trim().length < 10) {
      setError("Please provide a detailed description (at least 10 characters).");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!latitude || !longitude) {
      setError("Please select a location on the map.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await createComplaintApi({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        latitude: Number(latitude),
        longitude: Number(longitude),
        address: address.trim() || undefined,
      });
      router.push(`/complaints/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint. Please check your network connection.");
      setSubmitting(false);
    }
  };

  const setSampleCoordinates = (lat: number, lng: number, locName: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(locName);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Wizard Header & Stepper */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black text-white">Report a Civic Issue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Follow 3 easy steps to report municipal infrastructure problems to city services.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="glass-panel p-4 flex items-center justify-between gap-2">
          <WizardStepPill
            stepNumber={1}
            title="1. What happened?"
            active={currentStep === 1}
            completed={currentStep > 1}
          />
          <div className="h-0.5 flex-1 bg-slate-800" />
          <WizardStepPill
            stepNumber={2}
            title="2. Where is it?"
            active={currentStep === 2}
            completed={currentStep > 2}
          />
          <div className="h-0.5 flex-1 bg-slate-800" />
          <WizardStepPill
            stepNumber={3}
            title="3. Review & Submit"
            active={currentStep === 3}
            completed={false}
          />
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium space-y-1">
          <span className="font-bold block">Validation Notice</span>
          <p>{error}</p>
        </div>
      )}

      {/* Wizard Step 1: Issue Details */}
      {currentStep === 1 && (
        <div className="glass-panel p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Step 1: Describe the Issue</h2>
            <p className="text-xs text-slate-400">Tell us what problem you noticed in your neighborhood.</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Complaint Title</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Large pothole near the main gate"
                className="form-input-modern"
              />
              <span className="text-[10px] text-slate-500">Provide a concise, descriptive summary.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Detailed Description</label>
              <textarea
                required
                minLength={10}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. There is a deep pothole on the right lane that makes it difficult for bikes and cars to pass safely, especially at night."
                className="form-input-modern"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategoryEnum)}
                  className="form-input-modern"
                >
                  {Object.values(ComplaintCategoryEnum).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Severity / Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ComplaintPriorityEnum)}
                  className="form-input-modern"
                >
                  {Object.values(ComplaintPriorityEnum).map((p) => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button onClick={handleNext} className="btn-civic-primary text-xs px-6 py-3">
              Continue to Location →
            </button>
          </div>
        </div>
      )}

      {/* Wizard Step 2: Location & Map */}
      {currentStep === 2 && (
        <div className="glass-panel p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Step 2: Pinpoint Location</h2>
            <p className="text-xs text-slate-400">Click or drag on the map to set the exact coordinates.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="form-input-modern text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="form-input-modern text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Street Address / Landmark (Optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Near Central Bus Station, 100 Feet Ring Road"
                className="form-input-modern"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick location presets:</span>
              <button
                type="button"
                onClick={() => setSampleCoordinates(12.9716, 77.5946, "MG Road, Central Zone")}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-teal-300 border border-slate-800 hover:bg-slate-800"
              >
                Central Zone
              </button>
              <button
                type="button"
                onClick={() => setSampleCoordinates(12.9352, 77.6245, "Koramangala 5th Block")}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-teal-300 border border-slate-800 hover:bg-slate-800"
              >
                South Zone
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button onClick={handleBack} className="btn-civic-secondary text-xs px-5 py-2.5">
              ← Back
            </button>
            <button onClick={handleNext} className="btn-civic-primary text-xs px-6 py-3">
              Review Report →
            </button>
          </div>
        </div>
      )}

      {/* Wizard Step 3: Review & Submit */}
      {currentStep === 3 && (
        <div className="glass-panel p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Step 3: Review Your Complaint Summary</h2>
            <p className="text-xs text-slate-400">Verify details before submitting to municipal routing.</p>
          </div>

          <div className="space-y-4 bg-slate-950/60 p-6 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</span>
              <h3 className="text-base font-bold text-white">{title}</h3>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</span>
              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-900">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                <CategoryBadge category={category} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                <PriorityBadge priority={priority} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-900 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
              <span className="text-slate-200 font-semibold block">
                {address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={submitting}
              onClick={handleBack}
              className="btn-civic-secondary text-xs px-5 py-2.5"
            >
              ← Edit Details
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="btn-civic-primary text-xs px-8 py-3"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Submitting Report...
                </span>
              ) : (
                "Submit Complaint Now"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStepPill({
  stepNumber,
  title,
  active,
  completed,
}: {
  stepNumber: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  let style = "bg-slate-900 text-slate-500 border-slate-800";
  if (completed) {
    style = "bg-teal-950/80 text-teal-300 border-teal-800/60 font-semibold";
  } else if (active) {
    style = "bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md shadow-teal-500/20";
  }

  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-2 ${style}`}>
      {completed ? <span>✓</span> : null}
      <span>{title}</span>
    </div>
  );
}
