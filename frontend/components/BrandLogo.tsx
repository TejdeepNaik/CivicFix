import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  lightMode?: boolean;
}

export function BrandMark({ size = "md", lightMode = false }: { size?: "sm" | "md" | "lg"; lightMode?: boolean }) {
  let dim = "w-8 h-8";
  if (size === "sm") dim = "w-7 h-7";
  if (size === "lg") dim = "w-10 h-10";

  return (
    <div
      className={`${dim} rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${
        lightMode
          ? "bg-white text-[#0f2942] border border-slate-200"
          : "bg-[#0f2942] text-white border border-[#1e3a5f]"
      }`}
    >
      <svg
        className={size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 11l-3 3-2-2"
          className="stroke-amber-400"
          strokeWidth={2.5}
        />
      </svg>
    </div>
  );
}

export default function BrandLogo({ showTagline = false, size = "md", lightMode = false }: BrandLogoProps) {
  return (
    <Link href="/" className="flex items-center space-x-2.5 group">
      <BrandMark size={size} lightMode={lightMode} />
      <div className="flex flex-col">
        <div className="flex items-center space-x-1.5">
          <span className={`font-black tracking-tight ${size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-base"} ${lightMode ? "text-slate-900" : "text-white"}`}>
            Civic<span className="text-sky-500">Fix</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Gov
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase leading-none mt-0.5">
            Official Civic Service Portal
          </span>
        )}
      </div>
    </Link>
  );
}
