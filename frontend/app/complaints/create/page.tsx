"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { createComplaintApi, uploadEvidenceApi } from "../../../lib/api";
import {
  ComplaintCategoryEnum,
  ComplaintPriorityEnum,
  RoleEnum,
  Complaint,
} from "../../../lib/types";
import { CategoryBadge, PriorityBadge } from "../../../components/Badge";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("../../../components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
      <span className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      <span>Loading location picker map…</span>
    </div>
  ),
});

const MapView = dynamic(() => import("../../../components/MapView"), {
  ssr: false,
  loading: () => <div className="h-44 w-full bg-slate-100 animate-pulse rounded-lg" />,
});

export default function CreateComplaintPage() {
  return (
    <ProtectedRoute allowedRoles={[RoleEnum.CITIZEN]}>
      <CreateComplaintWizard />
    </ProtectedRoute>
  );
}

const CATEGORY_OPTIONS = [
  { value: ComplaintCategoryEnum.POTHOLE,          label: "Potholes & Road Damage",     icon: "🕳️", desc: "Street cracks, asphalt damage, and pavement hazards." },
  { value: ComplaintCategoryEnum.STREETLIGHT,      label: "Broken Streetlight",          icon: "💡", desc: "Dark light poles, flickering fixtures, or broken poles." },
  { value: ComplaintCategoryEnum.GARBAGE,          label: "Garbage & Sanitation",        icon: "🗑️", desc: "Overflowing public bins, alley debris, uncollected trash." },
  { value: ComplaintCategoryEnum.WATER_LEAK,       label: "Water Leaks & Hydrants",      icon: "💧", desc: "Main pipe leaks, gushing hydrants, water runoff." },
  { value: ComplaintCategoryEnum.TRAFFIC_SIGNAL,   label: "Traffic Signal & Signs",      icon: "🚦", desc: "Broken traffic lights, damaged stop signs, lane hazards." },
  { value: ComplaintCategoryEnum.DRAINAGE,         label: "Drainage & Sewer Backup",     icon: "🌊", desc: "Clogged storm drains, standing water, sewer overflow." },
  { value: ComplaintCategoryEnum.NOISE_POLLUTION,  label: "Noise & Nuisance",            icon: "📢", desc: "Commercial noise violations, construction hours." },
  { value: ComplaintCategoryEnum.OTHER,            label: "Other Infrastructure",        icon: "📋", desc: "General public property maintenance and repair." },
];

const PRIORITY_OPTIONS = [
  { value: ComplaintPriorityEnum.LOW,      label: "Low",      hint: "Minor inconvenience, routine fix" },
  { value: ComplaintPriorityEnum.MEDIUM,   label: "Medium",   hint: "Standard issue, affects neighborhood" },
  { value: ComplaintPriorityEnum.HIGH,     label: "High",     hint: "Significant hazard, prompt fix needed" },
  { value: ComplaintPriorityEnum.CRITICAL, label: "Critical", hint: "Immediate danger or severe safety hazard" },
];

function CreateComplaintWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams?.get("category");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [category, setCategory] = useState<ComplaintCategoryEnum>(
    (preselectedCategory as ComplaintCategoryEnum) || ComplaintCategoryEnum.POTHOLE
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintPriorityEnum>(
    ComplaintPriorityEnum.MEDIUM
  );

  // Location State
  const [latitude, setLatitude] = useState<number>(41.8781);
  const [longitude, setLongitude] = useState<number>(-87.6298);
  const [address, setAddress] = useState("");

  // Camera & Gallery Image File State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Success State
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator && !preselectedCategory) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        () => {}
      );
    }
  }, [preselectedCategory]);

  const handleLocationChange = (lat: number, lng: number, addr?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (addr) setAddress(addr);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size exceeds 10MB limit. Please select a smaller photo.");
        return;
      }
      setImageFile(file);
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageFileName(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 5) {
      setError("Please enter a clear title (at least 5 characters).");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError("Please enter a detailed description (at least 10 characters).");
      return;
    }

    setSubmitting(true);

    try {
      let uploadedEvidenceUrl: string | undefined = undefined;

      if (imageFile) {
        const uploadRes = await uploadEvidenceApi(imageFile);
        uploadedEvidenceUrl = uploadRes.evidence_url;
      }

      const created = await createComplaintApi({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        latitude,
        longitude,
        address: address.trim() || undefined,
        evidence_url: uploadedEvidenceUrl,
      });

      setCreatedComplaint(created);
    } catch (err: any) {
      setError(err.message || "Failed to submit report. Please review form entries.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render Success State
  if (createdComplaint) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up space-y-6 text-center">
        <div className="gov-card p-8 bg-white border border-slate-200 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto border border-emerald-200">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Official Report Logged & Dispatched
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {createdComplaint.title}
            </h1>
            <p className="text-xs text-slate-600">
              Your civic report has been received and registered into the municipal public works system.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Complaint ID:</span>
              <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                #{createdComplaint.id.substring(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Current Status:</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Submitted
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Next Action:</span>
              <span className="text-slate-800 font-medium">Department AI analysis & field assignment</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/complaints/${createdComplaint.id}`}
              className="btn-gov-primary text-xs px-6 py-3 w-full sm:w-auto"
            >
              View Case File & AI Analysis →
            </Link>
            <Link
              href="/dashboard"
              className="btn-gov-secondary text-xs px-6 py-3 w-full sm:w-auto"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in">
      
      {/* Page Header */}
      <div className="space-y-0.5">
        <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
          Official Civic Service Portal
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          Report an Issue
        </h1>
        <p className="text-xs text-slate-600">
          Complete the guided steps below to submit a formal non-emergency infrastructure report.
        </p>
      </div>

      {/* 4-Step Progress Indicator */}
      <div className="gov-card p-3.5 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "1. Problem" },
            { num: 2, label: "2. Location" },
            { num: 3, label: "3. Evidence" },
            { num: 4, label: "4. Review" },
          ].map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;

            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => isCompleted && setStep(s.num as any)}
                  className={`flex items-center space-x-2 ${
                    isCompleted ? "cursor-pointer" : ""
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-all ${
                      isCurrent
                        ? "bg-[#0f2942] text-white shadow-xs"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? "✓" : s.num}
                  </span>
                  <span
                    className={`text-xs hidden sm:inline ${
                      isCurrent
                        ? "font-bold text-slate-900"
                        : isCompleted
                        ? "font-semibold text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {idx < 3 && <div className="flex-1 h-0.5 bg-slate-200 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
          <strong>Form Error:</strong> {error}
        </div>
      )}

      {/* ── STEP 1: WHAT IS THE PROBLEM? ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Step 1: What is the Problem?</h2>
            <p className="text-xs text-slate-600">Select the category that best describes the issue.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <div
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`gov-card p-3 cursor-pointer transition-all border flex items-start space-x-3 ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="text-lg p-1.5 rounded bg-slate-50 border border-slate-200 shrink-0">
                    {cat.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-xs text-slate-900">{cat.label}</h3>
                    <p className="text-[11px] text-slate-600 leading-snug">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={() => setStep(2)} className="btn-gov-primary text-xs px-5 py-2">
              Continue to Location →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: WHERE IS IT? ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Step 2: Where is it?</h2>
            <p className="text-xs text-slate-600">Provide the address and pin the location on the map.</p>
          </div>

          <div className="gov-card p-5 space-y-4 bg-white border border-slate-200">
            <div className="space-y-1">
              <label className="gov-label">
                Street Address or Physical Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 100 Main Street or Corner of 5th Ave & Pine St"
                className="gov-input"
              />
              <p className="text-[11px] text-slate-500">Provide cross-streets or landmarks if available.</p>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-300">
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleLocationChange}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span>Selected Coordinates:</span>
              <span className="font-mono text-slate-900 font-bold">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(1)} className="btn-gov-secondary text-xs px-4 py-2">
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="btn-gov-primary text-xs px-6 py-2.5">
              Continue to Evidence →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: ADD EVIDENCE & CAMERA + GALLERY ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Step 3: Add Evidence & Details</h2>
            <p className="text-xs text-slate-600">Describe the issue and add photos to help field workers evaluate the hazard.</p>
          </div>

          <div className="gov-card p-6 space-y-6 bg-white border border-slate-200">
            {/* Title */}
            <div className="space-y-1">
              <label className="gov-label">
                Issue Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Large pothole near crosswalk causing vehicle damage"
                className="gov-input"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="gov-label">
                Detailed Problem Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the size, depth, severity, or immediate safety hazard..."
                className="gov-input resize-none"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="gov-label">Reported Urgency & Priority</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRIORITY_OPTIONS.map((p) => {
                  const isSel = priority === p.value;
                  return (
                    <div
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                        isSel
                          ? "border-sky-600 bg-sky-50 font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <PriorityBadge priority={p.value} />
                      <p className="text-[10px] text-slate-500 mt-1">{p.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 📷 CAMERA + GALLERY PHOTO PICKER SECTION */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <label className="gov-label">Add Photos of the Problem</label>
              <p className="text-xs text-slate-600">
                Take a photo or choose an image from your gallery.
              </p>

              {/* Hidden File Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {!imagePreview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-4 rounded-lg border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-100/50 transition-colors text-center space-y-1.5 cursor-pointer"
                  >
                    <span className="text-2xl block">📷</span>
                    <span className="font-bold text-xs text-sky-900 block">Take Photo</span>
                    <span className="text-[10px] text-sky-700 block">Use mobile camera directly</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-center space-y-1.5 cursor-pointer"
                  >
                    <span className="text-2xl block">🖼️</span>
                    <span className="font-bold text-xs text-slate-800 block">Choose from Gallery</span>
                    <span className="text-[10px] text-slate-500 block">Select photo from device</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                      📷 Attached Photo: {imageFileName || "Evidence Photo"}
                    </span>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>

                  <div className="relative h-48 w-full rounded-lg overflow-hidden border border-slate-300 bg-black flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Uploaded evidence preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="btn-gov-secondary text-xs px-3 py-1.5"
                    >
                      Replace Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(2)} className="btn-gov-secondary text-xs px-4 py-2">
              ← Back
            </button>
            <button
              onClick={() => {
                if (title.length < 5 || description.length < 10) {
                  setError("Please enter a title (min 5 chars) and description (min 10 chars).");
                  return;
                }
                setError(null);
                setStep(4);
              }}
              className="btn-gov-primary text-xs px-6 py-2.5"
            >
              Review Report →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: REVIEW & SUBMIT ── */}
      {step === 4 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Step 4: Review & Submit Report</h2>
            <p className="text-xs text-slate-600">Review your report details before sending to public works.</p>
          </div>

          <div className="gov-card p-6 space-y-6 bg-white border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                  <CategoryBadge category={category} />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                  <PriorityBadge priority={priority} />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Title</span>
                  <h3 className="font-bold text-sm text-slate-900">{title}</h3>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{description}</p>
                </div>

                {imagePreview && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Photo Evidence</span>
                    <div className="h-28 w-40 rounded-md overflow-hidden border border-slate-300 mt-1">
                      <img src={imagePreview} alt="Evidence preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location Address</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                  </span>
                </div>

                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <MapView latitude={latitude} longitude={longitude} height="h-40" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-gov-secondary text-xs px-4 py-2"
              >
                ← Edit Details
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-gov-blue text-xs px-8 py-3 shadow-xs"
              >
                {submitting ? "Submitting Report..." : "Submit Report Now →"}
              </button>
            </div>
          </div>
        </form>
      )}

    </div>
  );
}
