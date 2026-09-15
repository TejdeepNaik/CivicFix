"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { ComplaintCategoryEnum } from "../lib/types";

const SERVICE_CATEGORIES = [
  {
    id: ComplaintCategoryEnum.POTHOLE,
    title: "Potholes & Road Repairs",
    icon: "🕳️",
    desc: "Report street potholes, pavement damage, sinkholes, and roadway hazards.",
  },
  {
    id: ComplaintCategoryEnum.STREETLIGHT,
    title: "Broken Streetlights",
    icon: "💡",
    desc: "Report dark light poles, flickering fixtures, or damaged light structures.",
  },
  {
    id: ComplaintCategoryEnum.GARBAGE,
    title: "Garbage Overflow & Sanitation",
    icon: "🗑️",
    desc: "Report uncollected trash, illegal dumping, overflow bins, or alley debris.",
  },
  {
    id: ComplaintCategoryEnum.WATER_LEAK,
    title: "Water Main & Pipe Leaks",
    icon: "💧",
    desc: "Report clean water leaks, hydrants gushing, or main pipe breaks.",
  },
  {
    id: ComplaintCategoryEnum.TRAFFIC_SIGNAL,
    title: "Traffic Signals & Signs",
    icon: "🚦",
    desc: "Report broken traffic lights, damaged stop signs, or missing street markers.",
  },
  {
    id: ComplaintCategoryEnum.DRAINAGE,
    title: "Drainage & Sewer Backups",
    icon: "🌊",
    desc: "Report clogged storm drains, standing street water, or sewer overflow.",
  },
  {
    id: ComplaintCategoryEnum.NOISE_POLLUTION,
    title: "Noise & Nuisance Issues",
    icon: "📢",
    desc: "Report commercial noise violations, illegal construction hours, or loud equipment.",
  },
  {
    id: ComplaintCategoryEnum.OTHER,
    title: "Other City Services",
    icon: "📋",
    desc: "Submit general non-emergency city infrastructure inquiries and maintenance requests.",
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
    <div className="space-y-12 pb-12 animate-fade-in">
      
      {/* ── 1. HERO HEADER: CHI311 Service Banner ── */}
      <section className="bg-[#0a2540] text-white rounded-2xl p-6 sm:p-12 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle geometric background overlay */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center space-x-2 bg-slate-800/90 px-3.5 py-1.5 rounded-full border border-slate-700 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>Official City 311 Service Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            How can we help you today?
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Submit non-emergency service requests, report municipal infrastructure issues, and track field repair progress in real time across the city.
          </p>

          {/* Quick Search & Tracking Input */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-xl shadow-lg border border-slate-200">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search service name, category, or tracking ID..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 border-none outline-none rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="btn-civic-primary text-xs px-6 py-3 shrink-0"
              >
                Search & Track →
              </button>
            </div>
          </form>

          {/* Dual Action Callouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 max-w-3xl mx-auto text-left">
            <div className="bg-[#173859] p-5 rounded-xl border border-blue-400/30 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Report a Problem</div>
                <h3 className="text-lg font-bold text-white">Submit a New Request</h3>
                <p className="text-xs text-slate-300">
                  Report a pothole, streetlight outage, water leak, or sanitation hazard with pinpoint map accuracy.
                </p>
              </div>
              <Link
                href="/complaints/create"
                className="btn-civic-gold text-xs px-5 py-2.5 w-fit"
              >
                Submit Request Now →
              </Link>
            </div>

            <div className="bg-[#173859] p-5 rounded-xl border border-blue-400/30 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Check Status</div>
                <h3 className="text-lg font-bold text-white">Track Existing Complaint</h3>
                <p className="text-xs text-slate-300">
                  View department assignments, worker dispatch logs, and completion evidence for reported issues.
                </p>
              </div>
              <Link
                href="/complaints"
                className="btn-civic-secondary text-xs px-5 py-2.5 w-fit"
              >
                View Issues Directory →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. SERVICE CATEGORIES DIRECTORY (CHI311 Grid) ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-4 gap-2">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Service Catalog</span>
            <h2 className="text-2xl font-black text-slate-900">311 Municipal Service Directory</h2>
          </div>
          <Link href="/complaints" className="text-xs font-bold text-blue-700 hover:text-blue-900">
            View All Community Complaints →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="civic-card p-5 space-y-3 civic-card-hover border-t-2 border-t-[#0a2540] flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-xl flex items-center justify-center">
                  {cat.icon}
                </div>
                <h3 className="font-bold text-sm text-slate-900">{cat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
              </div>

              <Link
                href={`/complaints/create?category=${cat.id}`}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 pt-2 border-t border-slate-100"
              >
                Report Issue →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. LIVE MUNICIPAL METRICS ── */}
      <section className="civic-card p-8 bg-white border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">City Transparency</span>
            <h2 className="text-xl font-black text-slate-900">Municipal Service Operational Summary</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Updated live with 24/7 public audit log</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="space-y-1 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-3xl font-black text-[#0a2540]">1,420+</div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Reports</div>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-3xl font-black text-emerald-800">1,180</div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Verified Resolved</div>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-3xl font-black text-amber-800">84</div>
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Active Workload</div>
          </div>
          <div className="space-y-1 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-3xl font-black text-blue-800">24 hrs</div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wider">Avg Dispatch Time</div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW 311 WORKS (3-Step Pipeline) ── */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Simple & Accountable</span>
          <h2 className="text-2xl font-black text-slate-900">How CivicFix 311 Works</h2>
          <p className="text-xs text-slate-600">
            Transparent end-to-end processing from resident submission to worker dispatch and verified repair.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="civic-card p-6 space-y-3 civic-card-blue-top">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black text-sm flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900">Submit a Service Request</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Select a category, pin the issue on the interactive map, and add relevant descriptions or photos. Receive a unique tracking ID immediately.
            </p>
          </div>

          <div className="civic-card p-6 space-y-3 civic-card-gold-top">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900">Department Dispatch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Requests are automatically routed to responsible municipal departments (Transportation, Water, Sanitation) and assigned to field crews.
            </p>
          </div>

          <div className="civic-card p-6 space-y-3 civic-card-accent-top">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-black text-sm flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900">Verified Resolution</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Field workers upload resolution evidence notes upon repair completion. Residents verify satisfaction before final issue closure.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. FINAL CALL TO ACTION ── */}
      <section className="bg-[#0a2540] text-white rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-lg border border-slate-700">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
          Ready to report a municipal issue?
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Help keep streets safe, streetlights working, and neighborhoods clean across our city.
        </p>
        <div className="pt-2">
          <Link
            href="/complaints/create"
            className="btn-civic-gold text-sm px-8 py-3.5 shadow-md"
          >
            Submit a Service Request →
          </Link>
        </div>
      </section>

    </div>
  );
}
