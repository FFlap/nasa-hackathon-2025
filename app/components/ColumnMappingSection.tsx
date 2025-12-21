"use client";

import React from "react";
import { motion } from "framer-motion";
import { Settings2, Globe } from "lucide-react";
import { LabeledSelect } from "./ui/LabeledSelect";
import { ProgressBar } from "./ui/ProgressBar";
import { columnOptions } from "@/app/lib/columnHelpers";
import type { Row } from "@/app/types";

interface ColumnMappingSectionProps {
  rows: Row[];
  colTitle: string;
  colUrl: string;
  onColTitleChange: (value: string) => void;
  onColUrlChange: (value: string) => void;
  onScrape: () => void;
  scraping: boolean;
  progress: { done: number; total: number };
}

export function ColumnMappingSection({
  rows,
  colTitle,
  colUrl,
  onColTitleChange,
  onColUrlChange,
  onScrape,
  scraping,
  progress,
}: ColumnMappingSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40"
    >
      <div className="flex items-center gap-2 mb-3 font-medium">
        <Settings2 className="w-4 h-4" /> Map Columns
      </div>
      <div className="grid grid-cols-2 gap-3">
        <LabeledSelect
          label="Title"
          value={colTitle}
          onChange={onColTitleChange}
          options={columnOptions(rows)}
        />
        <LabeledSelect
          label="URL"
          value={colUrl}
          onChange={onColUrlChange}
          options={columnOptions(rows)}
        />
      </div>
      <button
        disabled={scraping || rows.length === 0 || !colUrl}
        onClick={onScrape}
        className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
      >
        <Globe className="w-4 h-4" /> {scraping ? "Scraping…" : "Scrape & Build"}
      </button>
      {scraping && <ProgressBar done={progress.done} total={progress.total} />}
    </motion.div>
  );
}
