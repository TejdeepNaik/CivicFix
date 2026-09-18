import React from "react";
import Link from "next/link";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-[#0b1e36] text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-700/60">
          <div className="md:col-span-2 space-y-3">
            <BrandLogo size="lg" lightMode={false} showTagline={true} />
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              CivicFix is an official government civic-service infrastructure portal empowering citizens to report community issues, track real-time resolution progress, and verify municipal field operations with full transparency.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>City Infrastructure Operations • Real-time Monitoring</span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">Civic Services</span>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li><Link href="/" className="hover:text-white transition-colors">Portal Home</Link></li>
              <li><Link href="/complaints/create" className="hover:text-white transition-colors">Report an Issue</Link></li>
              <li><Link href="/complaints" className="hover:text-white transition-colors">Explore & Map Reports</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Citizen Dashboard</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">Emergency & Support</span>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="text-slate-300 font-semibold">Immediate Emergency: 911</li>
              <li>City Services Hotline: 311</li>
              <li>Water Leak Hotline: (555) 019-2831</li>
              <li>Road Hazards: (555) 019-2832</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} CivicFix Government Infrastructure System</span>
            <span>•</span>
            <Link href="/signup" className="hover:text-white transition-colors">Citizen Sign Up</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Accessibility Compliant (WCAG 2.1)
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
