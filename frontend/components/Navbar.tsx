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
    <header className="w-full shadow-md">
      {/* Top Utility Bar - Municipal Official Strip */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold tracking-wide">CivicFix 311</span>
            <span className="text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400">Official Municipal Service & Infrastructure Resolution Portal</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-medium text-slate-400">
            <span className="hover:text-white cursor-pointer">Emergency: Call 911</span>
            <span>|</span>
            <span className="hover:text-white cursor-pointer">City Services 24/7</span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation Bar */}
      <div className="bg-[#0a2540] text-white border-b border-[#173859]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand Logo & Title */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-lg bg-[#d97706] text-white font-black text-sm flex items-center justify-center shadow-md border border-amber-500/30 group-hover:bg-[#b45309] transition-all">
                311
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight leading-none text-white">
                  Civic<span className="text-amber-400">Fix</span>
                </span>
                <span className="text-[11px] font-medium text-slate-300 tracking-wider uppercase mt-1">
                  City Service Portal
                </span>
              </div>
            </Link>

            {/* Centered Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link
                href="/"
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  isActive("/")
                    ? "bg-[#173859] text-white shadow-inner border border-blue-400/30"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Home
              </Link>

              <Link
                href="/complaints"
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  isActive("/complaints")
                    ? "bg-[#173859] text-white shadow-inner border border-blue-400/30"
                    : "text-slate-200 hover:text-white hover:bg-white/10"
                }`}
              >
                Service Directory & Issues
              </Link>

              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                      isActive("/dashboard")
                        ? "bg-[#173859] text-white shadow-inner border border-blue-400/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/notifications"
                    className={`relative px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
                      isActive("/notifications")
                        ? "bg-[#173859] text-white shadow-inner border border-blue-400/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>Inbox</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 shadow">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4 pl-4 border-l border-slate-700">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">
                      {user.full_name || user.email}
                    </span>
                    <div className="mt-0.5"><RoleBadge role={user.role} /></div>
                  </div>
                  {user.role === "citizen" && (
                    <Link href="/complaints/create" className="btn-civic-gold text-xs px-4 py-2.5 shadow-sm">
                      Submit a Request →
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-rose-300 rounded hover:bg-white/5 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/login" className="btn-civic-secondary text-xs px-4 py-2.5">
                    Sign In
                  </Link>
                  <Link href="/complaints/create" className="btn-civic-gold text-xs px-4 py-2.5 shadow-sm">
                    Submit a Request →
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10"
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
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#061729] text-white border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded.md text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Home
          </Link>
          <Link
            href="/complaints"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Service Directory & Issues
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Dashboard
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Inbox ({unreadCount})
              </Link>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{user.full_name || user.email}</span>
                  <div className="mt-1"><RoleBadge role={user.role} /></div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 rounded border border-rose-800"
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
                href="/complaints/create"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-civic-gold text-center text-xs py-2.5"
              >
                Submit a Request →
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
