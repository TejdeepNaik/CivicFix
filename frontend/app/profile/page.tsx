"use client";

import React from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../../components/Badge";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="gov-card p-6 sm:p-8 bg-[#0f2942] text-white rounded-xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-sky-600 text-white font-black text-2xl flex items-center justify-center border-2 border-white/20 shadow-inner">
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">{user.full_name || user.email}</h1>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-xs text-slate-300 font-mono">{user.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors"
        >
          Sign Out of Account
        </button>
      </div>

      {/* Account Details & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="gov-card p-6 bg-white space-y-4 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
            Account Information
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Email Address:</span>
              <span className="font-bold text-slate-900">{user.email}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Account Status:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                Active & Verified
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold">Role Access:</span>
              <RoleBadge role={user.role} />
            </div>

            {user.department_id && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Department ID:</span>
                <span className="font-mono text-slate-800">{user.department_id}</span>
              </div>
            )}
          </div>
        </div>

        <div className="gov-card p-6 bg-white space-y-4 border border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
            Quick Actions & Links
          </h3>

          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-sky-500 text-xs font-bold text-slate-900 transition-colors flex items-center justify-between"
            >
              <span>Go to Personal Dashboard</span>
              <span className="text-sky-700">→</span>
            </Link>

            <Link
              href="/complaints/create"
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-sky-500 text-xs font-bold text-slate-900 transition-colors flex items-center justify-between"
            >
              <span>Report a New Issue</span>
              <span className="text-sky-700">→</span>
            </Link>

            <Link
              href="/notifications"
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-sky-500 text-xs font-bold text-slate-900 transition-colors flex items-center justify-between"
            >
              <span>View System Notifications</span>
              <span className="text-sky-700">→</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
