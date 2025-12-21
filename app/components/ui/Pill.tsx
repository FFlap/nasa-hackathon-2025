"use client";

import React from "react";
import { X } from "lucide-react";

interface PillProps {
  children: React.ReactNode;
  onRemove?: () => void;
}

export function Pill({ children, onRemove }: PillProps) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm border">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}
