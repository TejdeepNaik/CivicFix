"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto py-12">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-time Civic Resolution Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          Fix Municipal Issues <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            With Speed & Transparency
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Report potholes, streetlights, garbage, and infrastructure complaints in seconds. Track full audit trails, automated department routing, and verified resolution status.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {user ? (
            <Link
              href="/dashboard"
              className="btn-primary text-base px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              Go to Your Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="btn-primary text-base px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Report a Civic Issue Now
              </Link>
              <Link
                href="/login"
                className="btn-secondary text-base px-8 py-3.5 rounded-xl"
              >
                Sign In to Account
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 space-y-3 glass-card-hover">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 text-xl font-bold border border-emerald-800/60">
            🏛️
          </div>
          <h3 className="font-bold text-lg text-white">For Citizens</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Report complaints with geolocation details, receive real-time notifications, and verify issue completion before closure.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3 glass-card-hover">
          <div className="w-10 h-10 rounded-lg bg-blue-950 flex items-center justify-center text-blue-400 text-xl font-bold border border-blue-800/60">
            👷
          </div>
          <h3 className="font-bold text-lg text-white">For Workers</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            View assigned tasks, update progress status, upload resolution notes, and receive instant task reassignment alerts.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3 glass-card-hover">
          <div className="w-10 h-10 rounded-lg bg-purple-950 flex items-center justify-center text-purple-400 text-xl font-bold border border-purple-800/60">
            📊
          </div>
          <h3 className="font-bold text-lg text-white">Dept Admins</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Monitor department workload, route complaints to field workers, and track category/priority bottleneck metrics.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3 glass-card-hover">
          <div className="w-10 h-10 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400 text-xl font-bold border border-amber-800/60">
            ⚡
          </div>
          <h3 className="font-bold text-lg text-white">City Leadership</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Access city-wide dashboards, high-level resolution metrics, user role statistics, and department response times.
          </p>
        </div>
      </section>
    </div>
  );
}
