import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "📋",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="glass-panel p-8 text-center space-y-4 max-w-md mx-auto my-6 border-dashed border-slate-700/60">
      <div className="w-14 h-14 rounded-2xl bg-teal-950/60 border border-teal-800/40 text-2xl flex items-center justify-center mx-auto shadow-inner">
        {icon}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>

      {actionLabel && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref} className="btn-civic-primary text-xs px-5 py-2.5">
              {actionLabel}
            </Link>
          ) : (
            <button onClick={onAction} className="btn-civic-primary text-xs px-5 py-2.5">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
