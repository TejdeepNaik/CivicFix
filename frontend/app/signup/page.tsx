"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { RoleEnum } from "../../lib/types";
import BrandLogo from "../../components/BrandLogo";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError("This email address is already registered. Please log in instead.");
      } else {
        setError(err.message || "Registration failed. Please verify your details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 px-4 animate-fade-in">
      <div className="gov-card p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-md">
        
        {/* Header Branding */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <BrandLogo size="md" lightMode={true} showTagline={false} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-slate-900">Create Citizen Account</h1>
            <p className="text-xs text-slate-600">Official Municipal Registration System</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium space-y-0.5">
            <span className="font-bold block text-rose-950">Registration Error</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="gov-label">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="gov-input text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="gov-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.doe@example.com"
              className="gov-input text-xs"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="gov-label">
                Password <span className="text-[11px] text-slate-400 font-normal">(Min 8 chars)</span>
              </label>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="gov-input text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="gov-label">Account Role & Access Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleEnum)}
              className="gov-input text-xs cursor-pointer"
            >
              <option value={RoleEnum.CITIZEN}>Citizen (Report & Track Issues)</option>
              <option value={RoleEnum.WORKER}>Field Worker (Resolve Tasks)</option>
              <option value={RoleEnum.DEPARTMENT_ADMIN}>Department Admin (Manage Workload)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-gov-blue w-full text-xs py-2.5 mt-1 shadow-xs"
          >
            {submitting ? "Creating Account..." : "Create Account & Sign In →"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
          <div>
            Already have an account?{" "}
            <Link href="/login" className="text-sky-700 font-bold hover:underline">
              Log In
            </Link>
          </div>
          <div className="text-[11px] text-slate-400">
            CivicFix Government Data Privacy Compliant
          </div>
        </div>

      </div>
    </div>
  );
}
