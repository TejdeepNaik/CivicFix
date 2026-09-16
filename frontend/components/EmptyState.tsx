import React from "react";
import Link from "next/link";
import { Icon, IconName } from "./Icons";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "file-text",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="civic-card p-10 text-center space-y-4 max-w-md mx-auto my-6 border-dashed border-slate-300 bg-slate-50/60">
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-sm">
        <Icon name={icon} size={26} />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
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
