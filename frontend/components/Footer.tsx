import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} CivicFix Platform. AI-Powered Civic Issue Resolution.</p>
        <div className="flex space-x-4 text-slate-400">
          <span>FastAPI Backend</span>
          <span>•</span>
          <span>Next.js App Router</span>
          <span>•</span>
          <span>PostgreSQL Audit Trail</span>
        </div>
      </div>
    </footer>
  );
}
