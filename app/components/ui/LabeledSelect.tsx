"use client";

import React from "react";

interface LabeledSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

export function LabeledSelect({ label, value, onChange, options }: LabeledSelectProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-[var(--muted)] font-medium text-xs uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all appearance-none shadow-sm"
      >
        <option value="">— Auto detect —</option>
        {options.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </label>
  );
}
