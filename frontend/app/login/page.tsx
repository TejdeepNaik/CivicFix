"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError("Invalid email address or password.");
      } else {
        setError(err.message || "Unable to log in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 animate-fade-in">
      <div className="gov-card p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-md">
        
        {/* Header Branding */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <BrandLogo size="md" lightMode={true} showTagline={false} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-slate-900">Sign In to CivicFix</h1>
            <p className="text-xs text-slate-600">Official Municipal & Citizen Portal Access</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium space-y-0.5">
            <span className="font-bold block text-rose-950">Authentication Error</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="gov-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@example.gov"
              className="gov-input text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="gov-label">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-sky-700 font-semibold hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="gov-input text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-gov-primary w-full text-xs py-2.5 mt-1"
          >
            {submitting ? "Authenticating..." : "Log In →"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-sky-700 font-bold hover:underline">
              Register Citizen Account
            </Link>
          </div>
          <div className="text-[11px] text-slate-400">
            Protected by CivicFix Municipal Security Standards
          </div>
        </div>

      </div>
    </div>
  );
}
