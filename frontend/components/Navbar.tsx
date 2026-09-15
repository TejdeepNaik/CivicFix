"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./Badge";
import { listNotificationsApi } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      listNotificationsApi({ unread_only: true, size: 100 })
        .then((res) => {
          setUnreadCount(res.total || res.items?.length || 0);
        })
        .catch(() => {});
    }
  }, [user, pathname]);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-teal-400 text-lg">
                CF
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                CivicFix
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase -mt-1">
                Civic Tech Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive("/") ? "bg-teal-950/80 text-teal-300 border border-teal-800/60" : "text-slate-300 hover:text-white hover:bg-slate-900/60"
              }`}
            >
              Home
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive("/dashboard") ? "bg-teal-950/80 text-teal-300 border border-teal-800/60" : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  Dashboard
                </Link>

                <Link
                  href="/complaints"
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive("/complaints") ? "bg-teal-950/80 text-teal-300 border border-teal-800/60" : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  Complaints
                </Link>

                {user.role === "citizen" && (
                  <Link
                    href="/complaints/create"
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition-all flex items-center gap-1"
                  >
                    <span>+</span> Report Issue
                  </Link>
                )}

                <Link
                  href="/notifications"
                  className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive("/notifications") ? "bg-teal-950/80 text-teal-300 border border-teal-800/60" : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-500 text-slate-950 shadow-sm animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            ) : null}
          </nav>

          {/* Desktop User / Auth Action */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                    {user.full_name || user.email}
                  </span>
                  <div className="mt-0.5"><RoleBadge role={user.role} /></div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="btn-civic-secondary text-xs px-4 py-2">
                  Sign In
                </Link>
                <Link href="/register" className="btn-civic-primary text-xs px-4 py-2">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
          >
            Home
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/complaints"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Complaints
              </Link>
              {user.role === "citizen" && (
                <Link
                  href="/complaints/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-bold bg-teal-950 text-teal-300 border border-teal-800"
                >
                  + Report Issue
                </Link>
              )}
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-900"
              >
                Notifications ({unreadCount})
              </Link>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{user.full_name || user.email}</span>
                  <div className="mt-1"><RoleBadge role={user.role} /></div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-950/50 rounded-lg border border-rose-800"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-civic-secondary text-center text-xs py-2.5"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-civic-primary text-center text-xs py-2.5"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
