"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { ComplaintCategoryEnum } from "../lib/types";
import SnapshotsCarousel from "../components/SnapshotsCarousel";

const ISSUE_CATEGORIES = [
  {
    id: ComplaintCategoryEnum.POTHOLE,
    title: "Potholes & Road Damage",
    icon: (
      <svg className="w-5 h-5 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    desc: "Roadway cracks, pavement hazards, asphalt erosion, and sinkholes.",
  },
  {
    id: ComplaintCategoryEnum.STREETLIGHT,
    title: "Streetlights & Lighting",
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    desc: "Dark streetlamps, broken light fixtures, flickering poles, and wiring issues.",
  },
  {
    id: ComplaintCategoryEnum.GARBAGE,
    title: "Garbage & Public Sanitation",
    icon: (
      <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    desc: "Overflowing public waste bins, illegal dumping, alley debris, and missed pickups.",
  },
  {
    id: ComplaintCategoryEnum.WATER_LEAK,
    title: "Water Leaks & Pipe Spills",
    icon: (
      <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    desc: "Main line breaks, open fire hydrants, clean water waste, and pressure drops.",
  },
  {
    id: ComplaintCategoryEnum.TRAFFIC_SIGNAL,
    title: "Traffic Signals & Signs",
    icon: (
      <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    desc: "Malfunctioning intersection lights, damaged stop signs, and missing road markers.",
  },
  {
    id: ComplaintCategoryEnum.DRAINAGE,
    title: "Drainage & Flooding",
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
    desc: "Clogged catch basins, storm sewer backups, standing street water, and drain grates.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Report a Problem",
    desc: "Submit complaint details, GPS location pin, and optional photo evidence.",
  },
  {
    step: "2",
    title: "AI Analysis & Routing",
    desc: "Automated engine checks duplicate reports and routes to the responsible department.",
  },
  {
    step: "3",
    title: "Field Crew Dispatch",
    desc: "Assigned municipal workers receive task details with precise location coordinates.",
  },
  {
    step: "4",
    title: "Resolution & Verification",
    desc: "Worker resolves the issue, uploads proof, and reporter verifies completion.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/complaints");
    }
  };

  return (
    <div className="space-y-8 pb-8 animate-fade-in max-w-7xl mx-auto">
      
      {/* ── HERO SECTION: Restrained Government Service Banner ── */}
      <section className="bg-[#0f2942] text-white p-6 sm:p-8 rounded-xl border border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-sky-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Official Civic Service Portal</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Report civic problems. Track progress. Improve your community.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              CivicFix enables residents to submit infrastructure repair requests directly to municipal public works. Track status updates and verified resolutions in real time.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link href="/complaints/create" className="btn-gov-blue text-xs px-5 py-2.5 shadow-xs">
                Report an Issue
              </Link>
              <Link href="/complaints" className="btn-gov-secondary text-xs px-5 py-2.5">
                Explore Issues Directory
              </Link>
            </div>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="pt-2 max-w-lg">
              <div className="flex bg-slate-900/90 p-1 rounded-lg border border-slate-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reported issues by title, street, or category..."
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none"
                />
                <button type="submit" className="btn-gov-blue text-xs px-3.5 py-1.5 shrink-0">
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Compact Municipal Register Preview */}
          <div className="lg:col-span-5">
            <div className="gov-card bg-slate-900 border-slate-800 text-white p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-sky-400">Live Service Status</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800">
                  System Active
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded bg-slate-800/90 border border-slate-700 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[200px]">Main Street Pothole Repair</span>
                    <span className="gov-chip gov-chip-progress text-[10px]">In Progress</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Public Works Crew Dispatched</p>
                </div>

                <div className="p-2.5 rounded bg-slate-800/90 border border-slate-700 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[200px]">Oak Avenue Fixture Failure</span>
                    <span className="gov-chip gov-chip-resolved text-[10px]">Resolved</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Replacement luminaire installed</p>
                </div>

                <div className="p-2.5 rounded bg-slate-800/90 border border-slate-700 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[200px]">Pine Street Water Leak</span>
                    <span className="gov-chip gov-chip-submitted text-[10px]">Submitted</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Awaiting department triage</p>
                </div>
              </div>

              <div className="pt-1 text-center">
                <Link href="/complaints" className="text-xs font-semibold text-sky-400 hover:underline">
                  View Full Municipal Complaint Register →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PLATFORM METRICS BANNER ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-4 bg-white border-l-4 border-l-slate-900 border border-slate-200 flex items-center gap-3">
          <div>
            <span className="text-2xl font-black text-slate-900 block leading-none">100%</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block">Transparent Tracking</span>
          </div>
        </div>
        <div className="gov-card p-4 bg-white border-l-4 border-l-sky-600 border border-slate-200 flex items-center gap-3">
          <div>
            <span className="text-2xl font-black text-sky-700 block leading-none">24/7</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block">Online Submission</span>
          </div>
        </div>
        <div className="gov-card p-4 bg-white border-l-4 border-l-emerald-600 border border-slate-200 flex items-center gap-3">
          <div>
            <span className="text-xl font-black text-emerald-700 block leading-none">AI</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block">Duplicate Detection</span>
          </div>
        </div>
        <div className="gov-card p-4 bg-white border-l-4 border-l-amber-600 border border-slate-200 flex items-center gap-3">
          <div>
            <span className="text-xl font-black text-amber-700 block leading-none">GPS</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block">Field Accuracy</span>
          </div>
        </div>
      </section>

      {/* ── REALTIME COMPLAINT SNAPSHOTS CAROUSEL ── */}
      <SnapshotsCarousel />

      {/* ── SECTION 1: Municipal Services Categories ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">Municipal Services</span>
            <h2 className="text-xl font-bold text-slate-900">Report a Problem</h2>
          </div>
          <Link href="/complaints/create" className="btn-gov-blue text-xs px-3.5 py-1.5 shrink-0">
            Start New Report →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ISSUE_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/complaints/create?category=${cat.id}`}
              className="gov-card p-4 gov-card-hover bg-white flex items-start space-x-3.5 group"
            >
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 shrink-0 group-hover:bg-sky-50 transition-colors">
                {cat.icon}
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors truncate pr-1">
                    {cat.title}
                  </h3>
                  <span className="text-xs text-slate-400 group-hover:text-sky-700">→</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: How CivicFix Works ── */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">Structured Workflow</span>
          <h2 className="text-xl font-bold text-slate-900">How CivicFix Works</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="gov-card p-4 space-y-2 bg-white border border-slate-200">
              <div className="w-7 h-7 rounded bg-[#0f2942] text-white font-bold text-xs flex items-center justify-center">
                {item.step}
              </div>
              <h3 className="font-bold text-xs text-slate-900">{item.title}</h3>
              <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: Explore Interactive Map Directory ── */}
      <section className="gov-card p-6 bg-white border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">Public Directory</span>
            <h2 className="text-xl font-bold text-slate-900">
              Explore Nearby Issues & Community Progress
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every complaint registered on CivicFix appears on our municipal interactive map. Search your neighborhood to see pending repairs, active field crew dispatches, and resolved cases.
            </p>
            <div className="pt-1 flex flex-wrap gap-2.5">
              <Link href="/complaints" className="btn-gov-primary text-xs px-4 py-2">
                Open Map Directory →
              </Link>
              {user ? (
                <Link href="/dashboard" className="btn-gov-secondary text-xs px-4 py-2">
                  My Dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-gov-secondary text-xs px-4 py-2">
                  Create Citizen Account
                </Link>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-44 rounded-lg bg-slate-900 text-white p-4 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-400">Map Directory View</span>
                <span className="text-slate-400 text-[11px]">Metropolitan Area</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-white">Geographic Issue Clustering</h4>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Multiple reports of the same hazard are grouped to prioritize crew dispatches.
                </p>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Live Location Tracking Active</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
