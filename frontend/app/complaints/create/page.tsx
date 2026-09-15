"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="h-72 w-full rounded-xl bg-slate-100 border border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs gap-2.5">
      <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span>Loading interactive map picker…</span>
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

const CATEGORY_OPTIONS = [
  { value: ComplaintCategoryEnum.POTHOLE,          label: "Pothole / Road Damage",     icon: "🕳️", desc: "Street potholes, asphalt cracks, or pavement hazards." },
  { value: ComplaintCategoryEnum.STREETLIGHT,      label: "Broken Streetlight",        icon: "💡", desc: "Dark fixtures, flickering poles, or broken lighting." },
  { value: ComplaintCategoryEnum.GARBAGE,          label: "Garbage Overflow",          icon: "🗑️", desc: "Illegal dumping, missed trash collection, overflowing bins." },
  { value: ComplaintCategoryEnum.WATER_LEAK,       label: "Water Leak / Pipe Burst",   icon: "💧", desc: "Main pipe leaks, gushing fire hydrants, clean water runs." },
  { value: ComplaintCategoryEnum.TRAFFIC_SIGNAL,   label: "Traffic Signal Issue",      icon: "🚦", desc: "Malfunctioning signal lights, damaged stop signs." },
  { value: ComplaintCategoryEnum.DRAINAGE,         label: "Drainage / Sewage Issue",   icon: "🌊", desc: "Storm drain blockage, standing street water, sewer backup." },
  { value: ComplaintCategoryEnum.NOISE_POLLUTION,  label: "Noise Pollution",           icon: "📢", desc: "Construction noise, loud industrial machinery." },
  { value: ComplaintCategoryEnum.OTHER,            label: "Other Infrastructure Issue",icon: "📋", desc: "General public property maintenance and repair." },
];

const PRIORITY_OPTIONS = [
  {
    value: ComplaintPriorityEnum.LOW,
    label: "Low",
    hint: "Minor cosmetic issue, routine maintenance",
  },
  {
    value: ComplaintPriorityEnum.MEDIUM,
    label: "Medium",
    hint: "Standard issue, affects daily neighborhood routine",
  },
  {
    value: ComplaintPriorityEnum.HIGH,
    label: "High",
    hint: "Significant hazard, requires prompt repair",
  },
  {
    value: ComplaintPriorityEnum.CRITICAL,
    label: "Critical",
    hint: "Immediate safety hazard or structural danger",
  },
];

function CreateComplaintWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCategory = searchParams?.get("category");

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [category, setCategory] = useState<ComplaintCategoryEnum>(
    (preselectedCategory as ComplaintCategoryEnum) || ComplaintCategoryEnum.POTHOLE
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintPriorityEnum>(
    ComplaintPriorityEnum.MEDIUM
  );

  // Location State (Default to Chicago coordinates if none set)
  const [latitude, setLatitude] = useState<number>(41.8781);
  const [longitude, setLongitude] = useState<number>(-87.6298);
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill user geolocation if available
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 5) {
      setError("Please enter a title (at least 5 characters).");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError("Please enter a detailed description (at least 10 characters).");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createComplaintApi({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        latitude,
        longitude,
        address: address.trim() || undefined,
      });

      router.push(`/complaints/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint. Please check form fields.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8 animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md space-y-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
          311 Service Request
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Submit a City Service Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Report non-emergency municipal issues directly to public works field crews.
        </p>
      </div>

      {/* ── Step Indicator Bar ── */}
      <div className="civic-card p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4 w-full">
          <div
            onClick={() => setStep(1)}
            className={`flex items-center space-x-2 cursor-pointer ${
              step >= 1 ? "text-blue-700 font-bold" : "text-slate-400"
            }`}
          >
            <span className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold ${
              step === 1 ? "bg-blue-600 text-white" : step > 1 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              1
            </span>
            <span className="text-xs hidden sm:inline">Select Category</span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200" />

          <div
            onClick={() => step > 1 && setStep(2)}
            className={`flex items-center space-x-2 cursor-pointer ${
              step >= 2 ? "text-blue-700 font-bold" : "text-slate-400"
            }`}
          >
            <span className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold ${
              step === 2 ? "bg-blue-600 text-white" : step > 2 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              2
            </span>
            <span className="text-xs hidden sm:inline">Pin Location</span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200" />

          <div
            onClick={() => step > 2 && setStep(3)}
            className={`flex items-center space-x-2 cursor-pointer ${
              step === 3 ? "text-blue-700 font-bold" : "text-slate-400"
            }`}
          >
            <span className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold ${
              step === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              3
            </span>
            <span className="text-xs hidden sm:inline">Details & Submit</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold space-y-1">
          <span className="font-bold block">Submission Error:</span>
          <p>{error}</p>
        </div>
      )}

      {/* ── STEP 1: Select Category ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Step 1: Choose Service Category</h2>
            <p className="text-xs text-slate-600">Select the type of municipal issue you are reporting.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <div
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`civic-card p-4 cursor-pointer transition-all border-2 flex items-start space-x-3 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-2xl p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                    {cat.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900">{cat.label}</h3>
                    <p className="text-xs text-slate-600">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="btn-civic-primary text-xs px-6 py-3"
            >
              Next: Pin Location →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Location Map Pinning ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Step 2: Pin Location on Map</h2>
            <p className="text-xs text-slate-600">Click on the interactive map to specify the exact location of the issue.</p>
          </div>

          <div className="civic-card p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Street Address or Landmark (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main Street or Corner of 5th & Oak"
                className="input-civic text-xs"
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-300">
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleLocationChange}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span>Selected Coordinates:</span>
              <span className="font-mono text-slate-800 font-bold">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="btn-civic-secondary text-xs px-5 py-2.5"
            >
              ← Back to Categories
            </button>
            <button
              onClick={() => setStep(3)}
              className="btn-civic-primary text-xs px-6 py-3"
            >
              Next: Add Details →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Details & Submit Form ── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Step 3: Issue Details & Priority</h2>
            <p className="text-xs text-slate-600">Provide clear information to help field workers locate and repair the issue.</p>
          </div>

          <div className="civic-card p-6 space-y-5">
            {/* Category Summary Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category & Location</span>
              <div className="flex items-center space-x-2">
                <CategoryBadge category={category} />
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Issue Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep pothole causing lane hazard near intersection"
                className="input-civic text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Detailed Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the exact location, size, severity, or any hazards to drivers or pedestrians..."
                className="input-civic text-xs resize-none"
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Urgency & Priority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRIORITY_OPTIONS.map((p) => {
                  const isSel = priority === p.value;
                  return (
                    <div
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                        isSel
                          ? "border-blue-600 bg-blue-50 font-bold"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <PriorityBadge priority={p.value} />
                      <p className="text-[10px] text-slate-500 mt-1">{p.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-civic-secondary text-xs px-5 py-2.5"
            >
              ← Back to Map
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-civic-gold text-xs px-8 py-3.5 shadow-md"
            >
              {submitting ? "Submitting Request..." : "Submit Service Request →"}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
