import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-300 bg-[#0a2540] text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-700/80">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded bg-[#d97706] text-white font-black text-xs flex items-center justify-center">
                311
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">CivicFix 311</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Official 311 City Infrastructure & Municipal Resolution Platform. Connecting residents directly to public works field crews.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-slate-300 font-medium">
            <Link href="/" className="hover:text-amber-400 transition-colors">
              Home
            </Link>
            <Link href="/complaints" className="hover:text-amber-400 transition-colors">
              Service Directory
            </Link>
            <Link href="/complaints/create" className="hover:text-amber-400 transition-colors">
              Submit Request
            </Link>
            <Link href="/dashboard" className="hover:text-amber-400 transition-colors">
              Portal Dashboard
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center space-x-4">
            <span>© {new Date().getFullYear()} City CivicFix 311 System</span>
            <span>•</span>
            <span className="text-slate-400">For life-threatening emergencies call 911</span>
          </div>

          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              System v1.0.0
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Operational 24/7
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
