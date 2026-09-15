import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-slate-950/60 py-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center font-black text-slate-950 text-xs">
              CF
            </div>
            <span className="font-extrabold text-white text-base tracking-tight">CivicFix</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            CivicFix is a modern civic-tech platform empowering citizens to report municipal infrastructure issues, track transparent resolution timelines, and collaborate directly with city departments.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Platform</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/complaints" className="hover:text-teal-400 transition-colors">
                Civic Issues Directory
              </Link>
            </li>
            <li>
              <Link href="/complaints/create" className="hover:text-teal-400 transition-colors">
                Report a Pothole or Leak
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-teal-400 transition-colors">
                Citizen Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Trust & Transparency</h4>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-Time Audit Trail</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Automated Department Routing</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Citizen Verification Step</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} CivicFix Municipal SaaS Platform. All rights reserved.</span>
        <div className="flex items-center space-x-4">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-teal-400 font-mono">
            Production Ready v0.1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
