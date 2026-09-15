"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative text-center space-y-8 max-w-4xl mx-auto pt-8 pb-12">
        {/* Glow background accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-semibold shadow-inner">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Modern Municipal SaaS Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
          Report, Track & Resolve <br />
          <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Civic Issues In Your Community
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          CivicFix helps you report potholes, broken streetlights, water leaks, and garbage hazards in seconds. Experience complete transparency with automated department routing and verified resolutions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {user ? (
            <>
              {user.role === "citizen" ? (
                <Link
                  href="/complaints/create"
                  className="btn-civic-primary text-sm px-8 py-4 text-slate-950 rounded-xl"
                >
                  <span>+</span> Report an Issue
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="btn-civic-secondary text-sm px-8 py-4 rounded-xl"
              >
                Track My Complaints →
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className="btn-civic-primary text-sm px-8 py-4 text-slate-950 rounded-xl"
              >
                Report an Issue
              </Link>
              <Link
                href="/login"
                className="btn-civic-secondary text-sm px-8 py-4 rounded-xl"
              >
                Track My Complaints
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 3-Step Process Section */}
      <section className="space-y-10 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-extrabold text-teal-400 uppercase tracking-widest">Simple Workflow</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">How CivicFix Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-8 space-y-4 relative group glass-panel-hover">
            <div className="w-12 h-12 rounded-2xl bg-teal-950 border border-teal-800/80 text-teal-400 text-xl font-bold flex items-center justify-center shadow-lg">
              1
            </div>
            <h3 className="text-lg font-bold text-white">Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Snap a description, pick your location on an interactive map, and submit your complaint in under 60 seconds.
            </p>
          </div>

          <div className="glass-panel p-8 space-y-4 relative group glass-panel-hover">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xl font-bold flex items-center justify-center shadow-lg">
              2
            </div>
            <h3 className="text-lg font-bold text-white">Track</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Watch real-time status updates as your report is routed to the responsible city department and assigned to field workers.
            </p>
          </div>

          <div className="glass-panel p-8 space-y-4 relative group glass-panel-hover">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 text-xl font-bold flex items-center justify-center shadow-lg">
              3
            </div>
            <h3 className="text-lg font-bold text-white">Resolve</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review resolution evidence uploaded by municipal workers and verify that the issue has been fixed to your satisfaction.
            </p>
          </div>
        </div>
      </section>

      {/* What Can I Report Grid */}
      <section className="space-y-10 max-w-6xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-extrabold text-teal-400 uppercase tracking-widest">Categories</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">What Can You Report?</p>
          <p className="text-xs text-slate-400">CivicFix handles municipal infrastructure and public safety issues.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <CategoryCard icon="🕳️" name="Potholes & Roads" desc="Damaged asphalt & hazardous dips" />
          <CategoryCard icon="💡" name="Streetlights" desc="Dark streets & flickering bulbs" />
          <CategoryCard icon="🗑️" name="Garbage & Waste" desc="Overflowing bins & litter spots" />
          <CategoryCard icon="💧" name="Water Leakage" desc="Broken mains & drainage issues" />
          <CategoryCard icon="🚦" name="Traffic Signals" desc="Signal failures & sign damage" />
          <CategoryCard icon="🌳" name="Parks & Recreation" desc="Fallen trees & playground repairs" />
        </div>
      </section>

      {/* Why CivicFix Trust Cards */}
      <section className="glass-panel p-10 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Why Citizens & Municipalities Choose CivicFix</h3>
            <p className="text-xs text-slate-400">Designed for speed, accountability, and seamless city operations.</p>
          </div>
          <Link href="/register" className="btn-civic-primary text-xs px-6 py-3 whitespace-nowrap">
            Join CivicFix Today
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-teal-400 text-sm font-bold flex items-center gap-2">
              <span>⚡</span> 100% Transparent Audit Trail
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every status change, worker assignment, and timestamp is logged in an immutable activity timeline.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-cyan-400 text-sm font-bold flex items-center gap-2">
              <span>🗺️</span> Geolocation Pinpointing
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Built-in interactive Leaflet maps ensure municipal repair crews locate the exact problem site.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-emerald-400 text-sm font-bold flex items-center gap-2">
              <span>✅</span> Citizen Verification
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complaints aren&apos;t closed until citizens confirm the work was completed or provide feedback.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="glass-panel p-4 text-center space-y-2 glass-panel-hover flex flex-col items-center justify-center min-h-[140px]">
      <div className="text-2xl mb-1">{icon}</div>
      <h4 className="font-bold text-xs text-white leading-tight">{name}</h4>
      <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
    </div>
  );
}
