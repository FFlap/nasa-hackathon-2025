"use client";

import React from "react";

interface ProgressBarProps {
  done: number;
  total: number;
}

export function ProgressBar({ done, total }: ProgressBarProps) {
  const percentage = total ? (done / total) * 100 : 0;
  const isComplete = total > 0 && done >= total;
  const isStarting = total === 0;

  return (
    <div className="mt-3 text-xs font-medium text-[var(--muted)]">
      <div className="flex justify-between mb-1">
        <span>
          {isComplete ? "Done" : isStarting ? "Starting analysis..." : "Processing..."}
        </span>
        {!isStarting && <span>{done}/{total}</span>}
      </div>
      <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            isStarting ? 'bg-[var(--muted)] animate-pulse' : 'bg-[var(--primary)]'
          }`}
          style={{ width: isStarting ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
}


