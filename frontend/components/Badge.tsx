import React from "react";
import { ComplaintStatusEnum, ComplaintPriorityEnum, ComplaintCategoryEnum, RoleEnum } from "../lib/types";

export function StatusBadge({ status }: { status: string }) {
  let style = "bg-slate-100 text-slate-800 border-slate-300";
  let label = status;

  switch (status) {
    case ComplaintStatusEnum.SUBMITTED:
      style = "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      label = "Submitted";
      break;
    case ComplaintStatusEnum.UNDER_REVIEW:
      style = "bg-purple-50 text-purple-700 border-purple-200 font-semibold";
      label = "Under Review";
      break;
    case ComplaintStatusEnum.ASSIGNED:
      style = "bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold";
      label = "Assigned";
      break;
    case ComplaintStatusEnum.IN_PROGRESS:
      style = "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
      label = "In Progress";
      break;
    case ComplaintStatusEnum.RESOLVED:
      style = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
      label = "Resolved";
      break;
    case ComplaintStatusEnum.CLOSED:
      style = "bg-slate-100 text-slate-700 border-slate-300 font-semibold";
      label = "Closed";
      break;
    case ComplaintStatusEnum.REJECTED:
      style = "bg-rose-50 text-rose-700 border-rose-200 font-semibold";
      label = "Rejected";
      break;
  }

  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] border inline-flex items-center gap-1.5 ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  let style = "bg-slate-100 text-slate-700 border-slate-200";
  const label = priority.toUpperCase();

  switch (priority) {
    case ComplaintPriorityEnum.LOW:
      style = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case ComplaintPriorityEnum.MEDIUM:
      style = "bg-sky-50 text-sky-800 border-sky-200";
      break;
    case ComplaintPriorityEnum.HIGH:
      style = "bg-amber-100 text-amber-900 border-amber-300 font-semibold";
      break;
    case ComplaintPriorityEnum.CRITICAL:
      style = "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse";
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
    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center gap-1.5 capitalize">
      <span className="text-xs">{icon}</span>
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  let style = "bg-slate-100 text-slate-700 border-slate-200";
  const label = role.replace(/_/g, " ").toUpperCase();

  switch (role) {
    case RoleEnum.CITIZEN:
      style = "bg-teal-50 text-teal-800 border-teal-200";
      break;
    case RoleEnum.WORKER:
      style = "bg-amber-50 text-amber-800 border-amber-200";
      break;
    case RoleEnum.DEPARTMENT_ADMIN:
      style = "bg-purple-50 text-purple-800 border-purple-200";
      break;
    case RoleEnum.CITY_ADMIN:
    case RoleEnum.SUPER_ADMIN:
      style = "bg-rose-50 text-rose-800 border-rose-200 font-bold";
      break;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${style}`}>
      {label}
    </span>
  );
}
