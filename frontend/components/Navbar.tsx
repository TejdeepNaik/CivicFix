"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { RoleBadge } from "./Badge";
import BrandLogo from "./BrandLogo";
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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-xs">
      {/* Top Official Government Banner */}
      <div className="gov-topbar hidden sm:flex">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="gov-topbar-tag">
            <span className="badge-official">Official Portal</span>
            <span>CivicFix Government Infrastructure System</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span>City Operations: Active</span>
            <span>•</span>
            <span>Emergency: Call 911</span>
          </div>
        </div>
      </div>

      {/* Main Navbar Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* LEFT: CivicFix Brand */}
          <div className="flex items-center space-x-4">
            <BrandLogo size="sm" lightMode={true} showTagline={false} />
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 border border-slate-200 bg-slate-50 p-1 rounded-md">
            <Link
              href="/"
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                isActive("/")
                  ? "bg-[#0f2942] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Home
            </Link>

            <Link
              href="/complaints/create"
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                isActive("/complaints/create")
                  ? "bg-[#0f2942] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Report Issue
            </Link>

            <Link
              href="/complaints"
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                isActive("/complaints") && !isActive("/complaints/create")
                  ? "bg-[#0f2942] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Explore & Map
            </Link>

            {user && (
              <Link
                href="/dashboard"
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  isActive("/dashboard")
                    ? "bg-[#0f2942] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* RIGHT: User Profile & Actions */}
          <div className="hidden md:flex items-center space-x-2.5">
            {user ? (
              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
                <Link
                  href="/notifications"
                  className="relative p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-sky-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center space-x-2 p-1 rounded hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0f2942] text-white flex items-center justify-center font-bold text-[11px]">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                      {user.full_name || user.email}
                    </span>
                    <div className="mt-0.5"><RoleBadge role={user.role} /></div>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="btn-gov-secondary text-xs px-3.5 py-1.5">
                  Log In
                </Link>
                <Link href="/signup" className="btn-gov-blue text-xs px-3.5 py-1.5 shadow-xs">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <Link href="/notifications" className="relative p-1.5 text-slate-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-sky-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* MOBILE MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 animate-fade-in shadow-md">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-1.5 rounded text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            Home
          </Link>
          <Link
            href="/complaints/create"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0f2942]"
          >
            + Report an Issue
          </Link>
          <Link
            href="/complaints"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-1.5 rounded text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            Explore & Map
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 rounded text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 rounded text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                My Account Profile
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-1.5 rounded text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                Notifications ({unreadCount})
              </Link>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">{user.full_name || user.email}</span>
                  <div className="mt-0.5"><RoleBadge role={user.role} /></div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded border border-rose-200"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-gov-secondary text-center text-xs py-2"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-gov-blue text-center text-xs py-2"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
