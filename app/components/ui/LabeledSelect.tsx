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
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border"
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
