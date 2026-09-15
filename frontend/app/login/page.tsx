"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      if (err.message?.includes("Incorrect email") || err.message?.includes("401")) {
        setError("Invalid email or password. Please check your credentials.");
      } else {
        setError(err.message || "Unable to sign in. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-xl my-4 animate-fade-in">
      {/* Left Column: Product Visual & Civic Narrative */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#0a2540] text-white overflow-hidden">
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#d97706] text-white font-black text-sm flex items-center justify-center">
            311
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">CivicFix 311</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md my-auto">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Official Access</span>
          <h2 className="text-3xl font-black text-white leading-tight">
            Keep our city clean, safe, and moving forward.
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Access your personalized 311 portal to track service request status, view field crew assignments, and verify completed infrastructure repairs.
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Municipal Service Infrastructure System</span>
          <span className="text-amber-400 font-mono">v1.0.0</span>
        </div>
      </div>

      {/* Right Column: Clean Auth Form */}
      <div className="p-8 sm:p-12 flex flex-col justify-center space-y-8 bg-white">
        <div className="space-y-2">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">Portal Sign In</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Sign In to CivicFix 311</h1>
          <p className="text-xs text-slate-600">Enter your credentials to access your civic account</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold space-y-1">
            <span className="font-bold block">Sign In Failed</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-civic text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-civic text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-civic-primary w-full text-xs py-3.5 mt-2"
          >
            {submitting ? "Signing In..." : "Sign In to Account →"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-blue-700 font-bold hover:underline">
            Create a Resident Account
          </Link>
        </div>
      </div>
    </div>
  );
}
