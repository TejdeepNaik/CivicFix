"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import {
  createComplaintApi,
  analyzeImageApi,
  checkDuplicatesApi,
} from "../../../lib/api";
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
  { value: ComplaintCategoryEnum.POTHOLE,         label: "Potholes & Road Damage",     icon: "🕳️", desc: "Street cracks, asphalt damage, and pavement hazards." },
  { value: ComplaintCategoryEnum.STREETLIGHT,     label: "Broken Streetlight",          icon: "💡", desc: "Dark light poles, flickering fixtures, or broken poles." },
  { value: ComplaintCategoryEnum.GARBAGE,         label: "Garbage & Sanitation",        icon: "🗑️", desc: "Overflowing public bins, alley debris, uncollected trash." },
  { value: ComplaintCategoryEnum.WATER_LEAK,      label: "Water Leaks & Hydrants",      icon: "💧", desc: "Main pipe leaks, gushing hydrants, water runoff." },
  { value: ComplaintCategoryEnum.TRAFFIC_SIGNAL,  label: "Traffic Signal & Signs",      icon: "🚦", desc: "Broken traffic lights, damaged stop signs, lane hazards." },
  { value: ComplaintCategoryEnum.DRAINAGE,        label: "Drainage & Sewer Backup",     icon: "🌊", desc: "Clogged storm drains, standing water, sewer overflow." },
  { value: ComplaintCategoryEnum.NOISE_POLLUTION, label: "Noise & Nuisance",            icon: "📢", desc: "Commercial noise violations, construction hours." },
  { value: ComplaintCategoryEnum.OTHER,           label: "Other Infrastructure",        icon: "📋", desc: "General public property maintenance and repair." },
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

  // Flow Mode & Step: "camera" (landing) -> "preview" -> "review" (after AI analysis) or "manual"
  const [mode, setMode] = useState<"camera" | "preview" | "manual" | "review">("camera");

  // Photo & AI Analysis State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<string>("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const duplicateCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [isAiConfident, setIsAiConfident] = useState<boolean>(true);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiPrimaryIssue, setAiPrimaryIssue] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState<ComplaintCategoryEnum>(
    (preselectedCategory as ComplaintCategoryEnum) || ComplaintCategoryEnum.POTHOLE
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintPriorityEnum>(ComplaintPriorityEnum.MEDIUM);

  // Location State
  const [latitude, setLatitude] = useState<number>(41.8781);
  const [longitude, setLongitude] = useState<number>(-87.6298);
  const [address, setAddress] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"pending" | "granted" | "denied">("pending");

  // Duplicate Check State
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState<Array<any>>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<"context" | "description">("context");

  // UI State
  const [showEditFields, setShowEditFields] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);

  // Auto-Fetch Geolocation on load
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGpsStatus("granted");
        },
        () => {
          setGpsStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsStatus("denied");
    }

    // Check Speech Recognition support
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  const handleLocationChange = (lat: number, lng: number, addr?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (addr) setAddress(addr);
  };

  // Step 1: File selection -> Photo Preview
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Invalid file type. Please select or take a photo image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size exceeds 10MB limit. Please select a smaller photo.");
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Transition to Photo Preview step (Do not submit immediately!)
    setMode("preview");
  };

  // Step 2: "Use This Photo" -> Trigger AI Vision Analysis
  const confirmAndAnalyzePhoto = async () => {
    if (!imageFile) {
      setError("No photo selected. Please take or select a photo first.");
      return;
    }

    setError(null);
    setAnalyzingImage(true);

    try {
      const analysis = await analyzeImageApi(
        imageFile,
        latitude,
        longitude,
        userContext.trim() || undefined
      );

      setEvidenceUrl(analysis.evidence_url);
      const conf = analysis.confidence || 0;
      setAiConfidence(conf);
      setAiReasoning(analysis.reasoning || null);
      setAiPrimaryIssue(analysis.primary_issue || null);

      if (conf >= 0.60 && analysis.is_civic_issue) {
        setIsAiConfident(true);

        // Map Category
        if (analysis.suggested_category) {
          const matchedCat = Object.values(ComplaintCategoryEnum).find(
            (c) => c.toLowerCase() === analysis.suggested_category?.toLowerCase()
          );
          if (matchedCat) setCategory(matchedCat);
        }

        // Map Priority / Severity
        if (analysis.severity) {
          const sev = analysis.severity.toUpperCase();
          if (sev === "CRITICAL") setPriority(ComplaintPriorityEnum.CRITICAL);
          else if (sev === "HIGH") setPriority(ComplaintPriorityEnum.HIGH);
          else if (sev === "MEDIUM") setPriority(ComplaintPriorityEnum.MEDIUM);
          else if (sev === "LOW") setPriority(ComplaintPriorityEnum.LOW);
        }

        // Map Title & Description
        const defaultTitle = analysis.primary_issue || "Reported Civic Infrastructure Issue";
        setTitle(defaultTitle);

        let descText = analysis.reasoning || `Observed civic infrastructure issue requiring municipal inspection.`;
        if (userContext.trim()) {
          descText = `${userContext.trim()}\n\nAI Analysis Note: ${descText}`;
        }
        setDescription(descText);
      } else {
        setIsAiConfident(false);
        setShowEditFields(true);
        setTitle(analysis.primary_issue || "Civic Infrastructure Issue");
        setDescription(userContext.trim() || "");
      }

      setMode("review");
      if (title.trim() && description.trim()) {
        runDuplicateCheck(title, description, category);
      }
    } catch (err: any) {
      console.warn("Vision analysis failed, proceeding with manual details:", err);
      setIsAiConfident(false);
      setShowEditFields(true);
      setTitle("Civic Infrastructure Issue");
      setDescription(userContext.trim() || "");
      setError("AI analysis was unavailable. Please review and fill in the details manually.");
      setMode("review");
    } finally {
      setAnalyzingImage(false);
    }
  };

  const resetPhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setEvidenceUrl(null);
    setUserContext("");
    setAiConfidence(null);
    setAiReasoning(null);
    setAiPrimaryIssue(null);
    setIsAiConfident(true);
    setShowEditFields(false);
    setError(null);
    setMode("camera");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Voice Input Handler (supports either context or description target)
  const toggleVoiceDictation = (target: "context" | "description") => {
    if (!speechSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      setVoiceTarget(target);
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          if (target === "context") {
            setUserContext((prev) => (prev ? `${prev} ${transcript}` : transcript));
          } else {
            setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  // Duplicate Check Trigger (debounced — waits 800ms after last change)
  const runDuplicateCheck = (currentTitle: string, currentDesc: string, currentCat: string) => {
    if (duplicateCheckTimerRef.current) {
      clearTimeout(duplicateCheckTimerRef.current);
    }
    if (!currentTitle.trim() || !currentDesc.trim()) return;

    duplicateCheckTimerRef.current = setTimeout(async () => {
      setCheckingDuplicates(true);
      try {
        const res = await checkDuplicatesApi({
          category: currentCat as any,
          title: currentTitle.trim(),
          description: currentDesc.trim(),
          latitude,
          longitude,
          evidence_url: evidenceUrl || undefined,
        });

        if (res.is_duplicate_likely && res.potential_duplicates.length > 0) {
          setDuplicatesFound(res.potential_duplicates);
          setShowDuplicateAlert(true);
        } else {
          setDuplicatesFound([]);
          setShowDuplicateAlert(false);
        }
      } catch (err) {
        console.warn("Duplicate check warning:", err);
      } finally {
        setCheckingDuplicates(false);
      }
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 4) {
      setError("Please enter a valid report title (at least 4 characters).");
      return;
    }

    if (!description.trim() || description.trim().length < 8) {
      setError("Please enter a description (at least 8 characters).");
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
        evidence_url: evidenceUrl || undefined,
      });

      setCreatedComplaint(created);
    } catch (err: any) {
      setError(err.message || "Failed to submit report. Please review form entries.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render Success Screen ──
  if (createdComplaint) {
    return (
      <div className="max-w-2xl mx-auto py-8 animate-slide-up space-y-6 text-center">
        <div className="gov-card p-8 bg-white border border-slate-200 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-3xl flex items-center justify-center mx-auto border border-emerald-300">
            ✓
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Official Complaint Registered
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              {createdComplaint.title}
            </h1>
            <p className="text-xs text-slate-600">
              Your civic report has been received and routed to municipal field services.
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
              <span className="text-slate-800 font-medium">Municipal AI triage & crew dispatch</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/complaints/${createdComplaint.id}`}
              className="btn-gov-primary text-xs px-6 py-3 w-full sm:w-auto min-h-[48px] flex items-center justify-center"
            >
              View Case File →
            </Link>
            <Link
              href="/dashboard"
              className="btn-gov-secondary text-xs px-6 py-3 w-full sm:w-auto min-h-[48px] flex items-center justify-center"
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
      {/* Hidden File Inputs for Camera and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileInputChange}
        className="hidden"
        id="camera-file-input"
        aria-label="Capture photo with camera"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={onFileInputChange}
        className="hidden"
        id="gallery-file-input"
        aria-label="Choose photo from device gallery"
      />

      {/* Header */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
          Official Civic Service Portal
        </span>
        <h1 className="text-2xl font-black text-slate-900">
          Report a Problem
        </h1>
        <p className="text-xs text-slate-600">
          Snap a photo of the issue. AI will analyze the defect, suggest details, and tag your location automatically.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between">
          <span><strong>Notice:</strong> {error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* ── MODE 1: CAMERA-FIRST LANDING ── */}
      {mode === "camera" && !analyzingImage && (
        <div className="space-y-6">
          <div className="gov-card p-6 sm:p-8 bg-white border border-slate-200 space-y-6 text-center shadow-sm">
            
            <div className="w-20 h-20 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center mx-auto border-2 border-sky-200 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-black text-slate-900">
                Snap a Photo & Report
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take a photo of the pothole, water leak, broken light, or hazard. AI instantly identifies the problem, severity, and category for you.
              </p>
            </div>

            {/* DOMINANT CAMERA ACTION BUTTON (~52px) */}
            <div className="space-y-3 pt-2 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0f2942] hover:bg-[#1c385c] text-white font-black text-sm border border-[#0f2942] shadow-md transition-all flex items-center justify-center space-x-3 focus:outline-none focus:ring-4 focus:ring-sky-500/30 active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span>Take a Photo & Report</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="min-h-[48px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <span>🖼️ Device Gallery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="min-h-[48px] px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center justify-center space-x-1 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <span>Manual Form</span>
                </button>
              </div>
            </div>

            {/* Geolocation Status Indicator */}
            <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
              <span className={`w-2 h-2 rounded-full ${gpsStatus === "granted" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>
                {gpsStatus === "granted"
                  ? `GPS Location Tagged (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                  : "GPS Pending — Location can be selected on map"}
              </span>
            </div>

          </div>

          {/* Quick Category Guide Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Common Municipal Issues</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CATEGORY_OPTIONS.slice(0, 4).map((cat) => (
                <div key={cat.value} className="gov-card p-3 bg-white border border-slate-200 flex items-center space-x-2.5">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-bold text-slate-800 truncate">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODE 2: PHOTO PREVIEW STEP ── */}
      {mode === "preview" && !analyzingImage && (
        <div className="gov-card p-6 bg-white border border-slate-200 space-y-6 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📸 Photo Preview</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Step 2 of 3</span>
          </div>

          {/* Photo Display */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center max-h-[380px]">
              <img src={imagePreview} alt="Captured issue preview" className="max-h-full max-w-full object-contain" />
            </div>
          )}

          {/* Citizen Optional Context / Voice Dictation */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="gov-label" htmlFor="user-context-input">
                Add optional description or voice note for AI:
              </label>

              {speechSupported && (
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation("context")}
                  className={`text-xs px-3 py-1.5 rounded-md border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                    isListening && voiceTarget === "context"
                      ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300"
                  }`}
                  aria-label="Dictate context by voice"
                >
                  <span>{isListening && voiceTarget === "context" ? "🎙️ Listening..." : "🎤 Describe by Voice"}</span>
                </button>
              )}
            </div>

            <input
              id="user-context-input"
              type="text"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="e.g., Water leaking near the sidewalk, deep pothole on right lane..."
              className="gov-input bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={confirmAndAnalyzePhoto}
              className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm border border-sky-700 shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
            >
              <span>✨ Use This Photo & Run AI Analysis →</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors flex items-center justify-center cursor-pointer"
              >
                📷 Retake Photo
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[48px] px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors flex items-center justify-center cursor-pointer"
              >
                🖼️ Choose Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODE: ANALYZING SPINNER ── */}
      {analyzingImage && (
        <div className="gov-card p-10 bg-white border border-slate-200 text-center space-y-4 shadow-sm animate-fade-in">
          <div className="w-14 h-14 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">AI Vision Analyzing Photo...</h3>
            <p className="text-xs text-slate-600">Identifying defect type, priority level, and category.</p>
          </div>
        </div>
      )}

      {/* ── MODE 3: REVIEW & ASSISTIVE AI STEP ── */}
      {mode === "review" && !analyzingImage && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Photo & AI Detection Summary Card */}
          <div className="gov-card p-5 bg-white border border-slate-200 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Captured Photo & Detection</h2>
                  <p className="text-xs text-slate-500">Review AI vision suggestions and edit if needed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetPhoto}
                className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg border border-rose-200 transition-colors cursor-pointer min-h-[40px] flex items-center"
              >
                📷 Retake / Choose Photo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Photo Preview */}
              <div className="md:col-span-5">
                {imagePreview && (
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video flex items-center justify-center">
                    <img src={imagePreview} alt="Captured evidence" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>

              {/* AI Detection Summary */}
              <div className="md:col-span-7 space-y-3">
                {/* AI Confidence Notice */}
                {isAiConfident && aiConfidence !== null && aiConfidence >= 0.60 ? (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span>🤖</span> AI Suggestion
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-200 text-sky-900 text-[10px] font-mono font-bold">
                        {Math.round(aiConfidence * 100)}% Confidence
                      </span>
                    </div>
                    {aiReasoning && (
                      <p className="text-[11px] text-sky-800 leading-snug">
                        <strong>We think this may be {aiPrimaryIssue || "a civic defect"}:</strong> {aiReasoning}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <span>⚠️</span> We&apos;re not sure what this issue is. Please review the details.
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Please select a category, title, and description below so municipal crews can respond accurately.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <CategoryBadge category={category} />
                  <PriorityBadge priority={priority} />
                </div>
              </div>
            </div>

            {/* AI Result Edit Toggle */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEditFields(!showEditFields)}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer min-h-[36px]"
              >
                <span>{showEditFields ? "Hide Customization ▲" : "✏️ Edit Details & Category ▼"}</span>
              </button>
            </div>
          </div>

          {/* Issue Details Form (Title, Description, Category, Priority) */}
          <div className="gov-card p-5 bg-white border border-slate-200 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
              Report Details
            </h3>

            {/* Title */}
            <div className="space-y-1">
              <label className="gov-label" htmlFor="report-title">
                Report Title <span className="text-rose-600">*</span>
              </label>
              <input
                id="report-title"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setTitle(newTitle);
                  runDuplicateCheck(newTitle, description, category);
                }}
                placeholder="Short title describing the issue..."
                className="gov-input"
              />
            </div>

            {/* Description + Voice Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="gov-label" htmlFor="report-description">
                  Description <span className="text-rose-600">*</span>
                </label>

                {/* VOICE DICTATION BUTTON */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => toggleVoiceDictation("description")}
                    className={`text-xs px-2.5 py-1 rounded-md border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] ${
                      isListening && voiceTarget === "description"
                        ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
                    }`}
                    aria-label="Dictate complaint description by voice"
                  >
                    <span>{isListening && voiceTarget === "description" ? "🎙️ Listening..." : "🎤 Describe by Voice"}</span>
                  </button>
                )}
              </div>

              <textarea
                id="report-description"
                required
                rows={3}
                value={description}
                onChange={(e) => {
                  const newDesc = e.target.value;
                  setDescription(newDesc);
                  runDuplicateCheck(title, newDesc, category);
                }}
                placeholder="Provide details about size, hazards, or immediate safety concerns..."
                className="gov-input resize-none"
              />
              {isListening && voiceTarget === "description" && (
                <p className="text-[11px] text-rose-700 font-semibold animate-pulse">
                  🔴 Recording voice... Speak clearly into your device microphone.
                </p>
              )}
            </div>

            {/* Category & Urgency Selectors (Visible if low confidence or toggled) */}
            {(showEditFields || !isAiConfident || (aiConfidence !== null && aiConfidence < 0.60)) && (
              <div className="space-y-5 pt-3 border-t border-slate-200 animate-fade-in">
                {/* Category Picker */}
                <div className="space-y-2">
                  <label className="gov-label">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        type="button"
                        key={cat.value}
                        onClick={() => {
                          setCategory(cat.value);
                          runDuplicateCheck(title, description, cat.value);
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex items-center space-x-2 cursor-pointer min-h-[48px] ${
                          category === cat.value
                            ? "border-sky-600 bg-sky-50 font-bold text-sky-950"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority / Urgency Picker */}
                <div className="space-y-2">
                  <label className="gov-label">Urgency & Priority</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={`p-2 rounded-lg border text-center text-xs transition-colors cursor-pointer min-h-[48px] flex items-center justify-center ${
                          priority === p.value
                            ? "border-sky-600 bg-sky-50 font-bold"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <PriorityBadge priority={p.value} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location & Map Picker */}
          <div className="gov-card p-5 bg-white border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Issue Location & Map Pin</h3>
              <span className="text-xs text-slate-500 font-mono">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </div>

            {gpsStatus === "denied" && (
              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Notice:</strong> Device location permission unavailable. Please drag the marker on the map to set the exact issue location.
              </div>
            )}

            <div className="space-y-1">
              <label className="gov-label" htmlFor="location-address">Street Address or Landmark</label>
              <input
                id="location-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Corner of 5th Ave & Main St"
                className="gov-input"
              />
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-300">
              <MapPicker latitude={latitude} longitude={longitude} onChange={handleLocationChange} />
            </div>
            <p className="text-[11px] text-slate-500 text-center">💡 Tap or drag the map pin to adjust exact location.</p>
          </div>

          {/* ── PRE-SUBMISSION DUPLICATE WARNING BANNER ── */}
          {showDuplicateAlert && duplicatesFound.length > 0 && (
            <div className="gov-card p-5 bg-amber-50 border-2 border-amber-400 space-y-3 animate-fade-in">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">⚠️</span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-950">
                    There&apos;s already a similar issue reported nearby
                  </h4>
                  <p className="text-xs text-amber-900">
                    We found {duplicatesFound.length} matching report(s) near this location. Your report will be automatically linked to boost repair priority.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {duplicatesFound.map((dup) => (
                  <div key={dup.complaint_id} className="p-3 bg-white rounded-lg border border-amber-300 flex items-center justify-between text-xs">
                    <div className="space-y-0.5 max-w-[240px] sm:max-w-md">
                      <span className="font-bold text-slate-900 truncate block">{dup.title}</span>
                      <span className="text-[11px] text-slate-500">
                        {dup.distance_meters}m away • {dup.status}
                      </span>
                    </div>
                    <Link
                      href={`/complaints/${dup.complaint_id}`}
                      target="_blank"
                      className="btn-gov-secondary text-[11px] px-2.5 py-1 shrink-0 min-h-[36px] flex items-center"
                    >
                      View Existing →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON BAR */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={resetPhoto}
              className="btn-gov-secondary text-xs px-4 py-2.5 min-h-[48px] flex items-center"
            >
              ← Retake Photo
            </button>

            <button
              type="submit"
              disabled={submitting || analyzingImage}
              className="btn-gov-blue text-sm px-8 py-3 shadow-md font-black min-h-[48px] cursor-pointer flex items-center"
            >
              {submitting ? "Submitting Report..." : "Submit Complaint Now →"}
            </button>
          </div>

        </form>
      )}

      {/* ── MODE 4: MANUAL FORM (NO PHOTO FALLBACK) ── */}
      {mode === "manual" && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          <div className="gov-card p-6 bg-white border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Manual Complaint Report</h2>
              <button
                type="button"
                onClick={() => setMode("camera")}
                className="text-xs font-bold text-sky-700 hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                📷 Switch to Camera Flow
              </button>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <label className="gov-label">Issue Category <span className="text-rose-600">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    type="button"
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors flex items-center space-x-2 cursor-pointer min-h-[48px] ${
                      category === cat.value
                        ? "border-sky-600 bg-sky-50 font-bold text-sky-950"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="gov-label" htmlFor="manual-title">Title <span className="text-rose-600">*</span></label>
              <input
                id="manual-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title describing problem..."
                className="gov-input"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="gov-label" htmlFor="manual-desc">Description <span className="text-rose-600">*</span></label>
              <textarea
                id="manual-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed description..."
                className="gov-input resize-none"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="gov-label">Urgency</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`p-2 rounded-lg border text-center text-xs transition-colors cursor-pointer min-h-[48px] flex items-center justify-center ${
                      priority === p.value
                        ? "border-sky-600 bg-sky-50 font-bold"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <PriorityBadge priority={p.value} />
                  </button>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <label className="gov-label">Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or landmark"
                className="gov-input"
              />
              <div className="rounded-lg overflow-hidden border border-slate-300 mt-2">
                <MapPicker latitude={latitude} longitude={longitude} onChange={handleLocationChange} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className="btn-gov-secondary text-xs px-4 py-2.5 min-h-[48px] flex items-center"
              >
                ← Back to Camera
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-gov-blue text-xs px-8 py-3 shadow-xs font-bold min-h-[48px] flex items-center"
              >
                {submitting ? "Submitting..." : "Submit Complaint →"}
              </button>
            </div>
          </div>
        </form>
      )}

    </div>
  );
}
