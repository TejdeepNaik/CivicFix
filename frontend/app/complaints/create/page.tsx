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
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("../../../components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-lg bg-slate-800 animate-pulse flex items-center justify-center text-slate-500 text-xs">Loading map...</div>
});

export default function CreateComplaintPage() {
  return (
    <ProtectedRoute allowedRoles={[RoleEnum.CITIZEN]}>
      <CreateComplaintForm />
    </ProtectedRoute>
  );
}

function CreateComplaintForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategoryEnum>(ComplaintCategoryEnum.POTHOLE);
  const [priority, setPriority] = useState<ComplaintPriorityEnum>(ComplaintPriorityEnum.MEDIUM);
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [address, setAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.length < 3) {
      setError("Title must be at least 3 characters long");
      return;
    }
    if (description.length < 10) {
      setError("Description must be at least 10 characters long");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createComplaintApi({
        title,
        description,
        category,
        priority,
        latitude: Number(latitude),
        longitude: Number(longitude),
        address: address || undefined,
      });
      router.push(`/complaints/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const setSampleCoordinates = (lat: number, lng: number, locName: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(locName);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Report Civic Issue</h1>
        <p className="text-xs text-slate-400">
          Submit details about a public infrastructure or municipal complaint for department routing
        </p>
      </div>

      <div className="glass-card p-6 shadow-xl">
        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Complaint Title</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hazardous Pothole Near Central Bus Stop"
              className="form-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Detailed Description</label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem, severity, and any safety hazards..."
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategoryEnum)}
                className="form-input"
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
                className="form-input"
              >
                {Object.values(ComplaintPriorityEnum).map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300">Location Details</label>

            <div className="mb-3">
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
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="form-input"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Longitude</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or location landmark (e.g. 100 Feet Ring Road)"
                className="form-input"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400">Preset locations:</span>
              <button
                type="button"
                onClick={() => setSampleCoordinates(12.9716, 77.5946, "MG Road, Bengaluru")}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Central Area
              </button>
              <button
                type="button"
                onClick={() => setSampleCoordinates(12.9352, 77.6245, "Koramangala 5th Block")}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                South Zone
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary text-xs px-4 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs px-6 py-2.5"
            >
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
