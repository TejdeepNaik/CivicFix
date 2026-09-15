import React from "react";
import { ComplaintStatusEnum, ComplaintPriorityEnum, ComplaintCategoryEnum, RoleEnum } from "../lib/types";

export function StatusBadge({ status }: { status: string }) {
  let style = "bg-slate-800/80 text-slate-300 border-slate-700";
  let label = status;

  switch (status) {
    case ComplaintStatusEnum.SUBMITTED:
      style = "bg-blue-950/80 text-blue-300 border-blue-800/60";
      label = "Submitted";
      break;
    case ComplaintStatusEnum.UNDER_REVIEW:
      style = "bg-purple-950/80 text-purple-300 border-purple-800/60";
      label = "Under Review";
      break;
    case ComplaintStatusEnum.ASSIGNED:
      style = "bg-cyan-950/80 text-cyan-300 border-cyan-800/60";
      label = "Assigned";
      break;
    case ComplaintStatusEnum.IN_PROGRESS:
      style = "bg-amber-950/80 text-amber-300 border-amber-800/60";
      label = "In Progress";
      break;
    case ComplaintStatusEnum.RESOLVED:
      style = "bg-emerald-950/80 text-emerald-300 border-emerald-800/60 font-bold";
      label = "Resolved";
      break;
    case ComplaintStatusEnum.CLOSED:
      style = "bg-teal-950/80 text-teal-300 border-teal-800/60";
      label = "Closed";
      break;
    case ComplaintStatusEnum.REJECTED:
      style = "bg-rose-950/80 text-rose-300 border-rose-800/60";
      label = "Rejected";
      break;
  }

  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border inline-flex items-center gap-1.5 ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  let style = "bg-slate-800 text-slate-300 border-slate-700";
  const label = priority.toUpperCase();

  switch (priority) {
    case ComplaintPriorityEnum.LOW:
      style = "bg-slate-900 text-slate-400 border-slate-800";
      break;
    case ComplaintPriorityEnum.MEDIUM:
      style = "bg-sky-950/80 text-sky-300 border-sky-800/60";
      break;
    case ComplaintPriorityEnum.HIGH:
      style = "bg-amber-950/80 text-amber-300 border-amber-800/60";
      break;
    case ComplaintPriorityEnum.CRITICAL:
      style = "bg-rose-950/80 text-rose-300 border-rose-800/60 font-bold animate-pulse";
      break;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${style}`}>
      {label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  let icon = "📌";
  const label = category.replace(/_/g, " ");

  switch (category) {
    case ComplaintCategoryEnum.POTHOLE:
      icon = "🕳️";
      break;
    case ComplaintCategoryEnum.STREETLIGHT:
      icon = "💡";
      break;
    case ComplaintCategoryEnum.GARBAGE:
      icon = "🗑️";
      break;
    case ComplaintCategoryEnum.WATER_LEAK:
      icon = "💧";
      break;
    case ComplaintCategoryEnum.TRAFFIC_SIGNAL:
      icon = "🚦";
      break;
    case ComplaintCategoryEnum.DRAINAGE:
      icon = "🌊";
      break;
    case ComplaintCategoryEnum.NOISE_POLLUTION:
      icon = "📢";
      break;
    case ComplaintCategoryEnum.OTHER:
      icon = "📌";
      break;
  }

  return (
    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900/90 text-slate-300 border border-slate-800/80 inline-flex items-center gap-1.5 capitalize">
      <span className="text-xs">{icon}</span>
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  let style = "bg-slate-800 text-slate-300 border-slate-700";
  const label = role.replace(/_/g, " ").toUpperCase();

  switch (role) {
    case RoleEnum.CITIZEN:
      style = "bg-teal-950/80 text-teal-300 border-teal-800/60";
      break;
    case RoleEnum.WORKER:
      style = "bg-amber-950/80 text-amber-300 border-amber-800/60";
      break;
    case RoleEnum.DEPARTMENT_ADMIN:
      style = "bg-purple-950/80 text-purple-300 border-purple-800/60";
      break;
    case RoleEnum.CITY_ADMIN:
    case RoleEnum.SUPER_ADMIN:
      style = "bg-rose-950/80 text-rose-300 border-rose-800/60 font-bold";
      break;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${style}`}>
      {label}
    </span>
  );
}
