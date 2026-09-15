import React from "react";
import { ComplaintStatusEnum } from "../lib/types";

const STAGES = [
  { status: ComplaintStatusEnum.SUBMITTED, label: "Submitted" },
  { status: ComplaintStatusEnum.UNDER_REVIEW, label: "Under Review" },
  { status: ComplaintStatusEnum.ASSIGNED, label: "Assigned" },
  { status: ComplaintStatusEnum.IN_PROGRESS, label: "In Progress" },
  { status: ComplaintStatusEnum.RESOLVED, label: "Resolved" },
  { status: ComplaintStatusEnum.CLOSED, label: "Closed" },
];

function getStageIndex(status: ComplaintStatusEnum): number {
  switch (status) {
    case ComplaintStatusEnum.SUBMITTED:
      return 0;
    case ComplaintStatusEnum.UNDER_REVIEW:
      return 1;
    case ComplaintStatusEnum.ASSIGNED:
      return 2;
    case ComplaintStatusEnum.IN_PROGRESS:
      return 3;
    case ComplaintStatusEnum.RESOLVED:
      return 4;
    case ComplaintStatusEnum.CLOSED:
      return 5;
    case ComplaintStatusEnum.REJECTED:
      return -1;
    default:
      return 0;
  }
}

export function StatusTimeline({ status }: { status: ComplaintStatusEnum }) {
  const currentIndex = getStageIndex(status);
  const isRejected = status === ComplaintStatusEnum.REJECTED;

  if (isRejected) {
    return (
      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center justify-between">
        <span>Status: Rejected by Department</span>
        <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200">Closed</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 py-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        <span>Resolution Progress Pipeline</span>
        <span className="text-teal-400 font-semibold lowercase">
          Stage {currentIndex + 1} of {STAGES.length}
        </span>
      </div>

      <div className="relative flex items-center justify-between w-full">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-800 rounded-full z-0" />
        
        {/* Active Progress Line */}
        <div
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full z-0 transition-all duration-500"
          style={{
            width: `${(currentIndex / (STAGES.length - 1)) * 100}%`,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          let circleClass = "bg-slate-900 border-slate-700 text-slate-500";
          if (isPassed) {
            circleClass = "bg-teal-500 border-teal-400 text-slate-950 shadow-md shadow-teal-500/30";
          } else if (isCurrent) {
            circleClass = "bg-teal-400 border-white text-slate-950 ring-4 ring-teal-500/20 shadow-lg shadow-teal-400/40 animate-pulse";
          }

          return (
            <div key={stage.status} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${circleClass}`}
              >
                {isPassed ? "✓" : idx + 1}
              </div>

              <span
                className={`text-[10px] font-semibold mt-2 text-center transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "text-teal-400 font-bold"
                    : isPassed
                    ? "text-slate-300"
                    : "text-slate-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
