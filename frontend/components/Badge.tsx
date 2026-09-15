import React from "react";
import {
  ComplaintStatusEnum,
  ComplaintPriorityEnum,
  ComplaintCategoryEnum,
  RoleEnum,
} from "../lib/types";

export function StatusBadge({ status }: { status: ComplaintStatusEnum | string }) {
  let colorClass = "bg-slate-700/60 text-slate-300 border-slate-600";

  switch (status) {
    case ComplaintStatusEnum.SUBMITTED:
    case "submitted":
      colorClass = "bg-blue-900/40 text-blue-300 border-blue-700/50";
      break;
    case ComplaintStatusEnum.UNDER_REVIEW:
    case "under_review":
      colorClass = "bg-purple-900/40 text-purple-300 border-purple-700/50";
      break;
    case ComplaintStatusEnum.ASSIGNED:
    case "assigned":
      colorClass = "bg-cyan-900/40 text-cyan-300 border-cyan-700/50";
      break;
    case ComplaintStatusEnum.IN_PROGRESS:
    case "in_progress":
      colorClass = "bg-amber-900/40 text-amber-300 border-amber-700/50";
      break;
    case ComplaintStatusEnum.RESOLVED:
    case "resolved":
      colorClass = "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
      break;
    case ComplaintStatusEnum.REJECTED:
    case "rejected":
      colorClass = "bg-rose-900/40 text-rose-300 border-rose-700/50";
      break;
    case ComplaintStatusEnum.CLOSED:
    case "closed":
      colorClass = "bg-slate-800 text-slate-400 border-slate-700";
      break;
  }

  const label = typeof status === "string" ? status.replace(/_/g, " ") : status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} capitalize`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ComplaintPriorityEnum | string }) {
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";

  switch (priority) {
    case ComplaintPriorityEnum.LOW:
    case "low":
      colorClass = "bg-slate-800 text-slate-300 border-slate-700";
      break;
    case ComplaintPriorityEnum.MEDIUM:
    case "medium":
      colorClass = "bg-blue-950 text-blue-400 border-blue-800";
      break;
    case ComplaintPriorityEnum.HIGH:
    case "high":
      colorClass = "bg-amber-950 text-amber-400 border-amber-800";
      break;
    case ComplaintPriorityEnum.CRITICAL:
    case "critical":
      colorClass = "bg-rose-950 text-rose-400 border-rose-800 animate-pulse";
      break;
  }

  const label = typeof priority === "string" ? priority.toUpperCase() : priority;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${colorClass}`}>
      {label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: ComplaintCategoryEnum | string }) {
  const label = typeof category === "string" ? category.replace(/_/g, " ") : category;

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80 capitalize">
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: RoleEnum | string }) {
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";

  switch (role) {
    case RoleEnum.CITIZEN:
    case "citizen":
      colorClass = "bg-emerald-950 text-emerald-400 border-emerald-800";
      break;
    case RoleEnum.WORKER:
    case "worker":
      colorClass = "bg-blue-950 text-blue-400 border-blue-800";
      break;
    case RoleEnum.DEPARTMENT_ADMIN:
    case "department_admin":
      colorClass = "bg-purple-950 text-purple-400 border-purple-800";
      break;
    case RoleEnum.CITY_ADMIN:
    case "city_admin":
      colorClass = "bg-amber-950 text-amber-400 border-amber-800";
      break;
    case RoleEnum.SUPER_ADMIN:
    case "super_admin":
      colorClass = "bg-rose-950 text-rose-400 border-rose-800";
      break;
  }

  const label = typeof role === "string" ? role.replace(/_/g, " ") : role;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass} capitalize`}>
      {label}
    </span>
  );
}
