"use client";

import React from "react";

interface ProgressBarProps {
  done: number;
  total: number;
}

export function ProgressBar({ done, total }: ProgressBarProps) {
  const percentage = total ? (done / total) * 100 : 0;

  return (
    <div className="mt-3 text-xs text-zinc-500">
      Progress: {done}/{total}
      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded mt-1 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
