"use client";

import React from "react";
import { X } from "lucide-react";

interface PillProps {
  children: React.ReactNode;
  onRemove?: () => void;
}

export function Pill({ children, onRemove }: PillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--muted)]/10 text-[var(--foreground)] text-xs font-medium border border-[var(--border)]">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-[var(--foreground)]/10 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
