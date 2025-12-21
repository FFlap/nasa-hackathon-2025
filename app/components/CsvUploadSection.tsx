"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, Globe } from "lucide-react";
import Papa from "papaparse";
import type { Row } from "@/app/types";
import { guessTitleKey, guessUrlKey } from "@/app/lib/columnHelpers";
import { ProgressBar } from "./ui/ProgressBar";

interface CsvUploadSectionProps {
  rowCount: number;
  onFileLoaded: (
    rows: Row[],
    guessedTitle: string,
    guessedUrl: string
  ) => void;
  onScrape: () => void;
  scraping: boolean;
  progress: { done: number; total: number };
}

export function CsvUploadSection({ 
  rowCount, 
  onFileLoaded,
  onScrape,
  scraping,
  progress 
}: CsvUploadSectionProps) {
  function handleFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data.filter(Boolean);
        const sample = data[0] || {};
        onFileLoaded(data, guessTitleKey(sample), guessUrlKey(sample));
      },
      error: (err) => alert("CSV parse error: " + err.message),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]">
          <Upload className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Data Import</h3>
      </div>
      
      <div className="grid gap-3">
        {progress.done === 0 && (
          <div className="text-xs text-[var(--muted)] p-2 rounded-lg bg-[var(--foreground)]/5 border border-[var(--border)]">
            CSV should contain Title and Link fields.
          </div>
        )}

        <label className="block w-full group cursor-pointer">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={scraping}
            className="block w-full text-sm text-[var(--muted)]
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-xs file:font-medium
              file:bg-[var(--foreground)] file:text-[var(--background)]
              hover:file:opacity-90 transition-opacity
              cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>
        
        {rowCount > 0 && (
          <div className="space-y-4">
            {/* Hide button after analysis has started */}
            {progress.done === 0 && (
              <button
                disabled={scraping || rowCount === 0}
                onClick={onScrape}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                <Globe className="w-4 h-4" />
                Start Analysis
              </button>
            )}
            
            {/* Show progress bar once analysis starts, keep it visible after completion */}
            {progress.done > 0 && (
              <ProgressBar done={progress.done} total={progress.total} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
