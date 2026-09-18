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
      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span>Case Status: Complaint Rejected by Municipal Department</span>
        </div>
        <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">Case Closed</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 py-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
        <span className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
          <span>Case Resolution Pipeline</span>
        </span>
        <span className="text-sky-800 font-semibold bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
          Stage {currentIndex + 1} of {STAGES.length}
        </span>
      </div>

      <div className="relative flex items-center justify-between w-full pt-1 pb-2 px-2 overflow-x-auto">
        {/* Track Line */}
        <div className="absolute top-[18px] left-6 right-6 h-1 bg-slate-200 rounded-full z-0" />

        {/* Active Progress */}
        <div
          className="absolute top-[18px] left-6 h-1 bg-[#0f2942] rounded-full z-0 transition-all duration-500"
          style={{
            width: `calc(${Math.min(100, (currentIndex / (STAGES.length - 1)) * 100)}% - 1.5rem)`,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          let circleClass = "bg-white border-slate-300 text-slate-400";
          if (isPassed) {
            circleClass = "bg-emerald-600 border-emerald-600 text-white shadow-xs";
          } else if (isCurrent) {
            circleClass = "bg-[#0f2942] border-[#0f2942] text-white ring-4 ring-sky-100 shadow-xs";
          }

          return (
            <div key={stage.status} className="relative z-10 flex flex-col items-center group min-w-[70px]">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all duration-300 ${circleClass}`}
              >
                {isPassed ? "✓" : idx + 1}
              </div>

              <span
                className={`text-[11px] font-medium mt-2 text-center transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "text-[#0f2942] font-bold"
                    : isPassed
                    ? "text-slate-800 font-semibold"
                    : "text-slate-400"
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
