"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { RoleEnum } from "../../lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<RoleEnum>(RoleEnum.CITIZEN);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        email,
        password,
        full_name: fullName || undefined,
        role,
      });

      router.push("/dashboard");
    } catch (err: any) {
      if (err.message?.includes("already registered")) {
        setError("This email address is already registered. Please sign in instead.");
      } else {
        setError(err.message || "Registration failed. Please check your information.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-xl my-4 animate-fade-in">
      {/* Left Column: Product Narrative */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#0a2540] text-white overflow-hidden">
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#d97706] text-white font-black text-sm flex items-center justify-center">
            311
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">CivicFix 311</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md my-auto">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Join City Network</span>
          <h2 className="text-3xl font-black text-white leading-tight">
            Building better, safer neighborhoods together.
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Report infrastructure hazards, receive automated assignment updates, and verify issue completion with full municipal transparency.
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Residents • Field Workers • Department Admins</span>
          <span className="text-amber-400 font-mono">Civic Platform</span>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-white">
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">New Account</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Create an Account</h1>
          <p className="text-xs text-slate-600">Enter your details to join the CivicFix 311 portal</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold space-y-1">
            <span className="font-bold block">Registration Error</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="input-civic text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="input-civic text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Password (Min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-civic text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Account Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleEnum)}
              className="input-civic text-xs"
            >
              <option value={RoleEnum.CITIZEN}>Citizen (Report & Track Issues)</option>
              <option value={RoleEnum.WORKER}>Field Worker (Resolve Assigned Complaints)</option>
              <option value={RoleEnum.DEPARTMENT_ADMIN}>Department Admin (Manage Department)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-civic-gold w-full text-xs py-3.5 mt-2 shadow-sm"
          >
            {submitting ? "Creating Account..." : "Create Account →"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-700 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
