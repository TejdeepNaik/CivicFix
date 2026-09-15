"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./Badge";
import { listNotificationsApi } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      listNotificationsApi({ unread_only: true })
        .then((res) => setUnreadCount(res.total))
        .catch((err) => console.error("Error fetching unread notifications:", err));
    }
  }, [user, pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-emerald-500/20 shadow-md group-hover:scale-105 transition-transform">
            CF
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            Civic<span className="text-emerald-400">Fix</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/dashboard")
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/complaints"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/complaints")
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                Complaints
              </Link>

              {user.role === "citizen" && (
                <Link
                  href="/complaints/create"
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm ${
                    isActive("/complaints/create") ? "ring-2 ring-emerald-500/40" : ""
                  }`}
                >
                  + Report Issue
                </Link>
              )}

              <Link
                href="/notifications"
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/notifications")
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-slate-950 bg-emerald-400 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive("/")
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                Home
              </Link>
            </>
          )}
        </nav>

        {/* User Identity / Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-200">
                  {user.full_name || user.email}
                </span>
                <RoleBadge role={user.role} />
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/80 border border-slate-700/80 hover:text-white hover:bg-rose-950/40 hover:border-rose-800/60 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-emerald-500/20 shadow-md"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
