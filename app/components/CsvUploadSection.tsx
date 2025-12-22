"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload, Globe, FileText, Check, X } from "lucide-react";
import Papa from "papaparse";
import type { Row } from "@/app/types";
import { guessTitleKey, guessUrlKey } from "@/app/lib/columnHelpers";
import { ProgressBar } from "./ui/ProgressBar";

interface FilePreview {
  fileName: string;
  rows: Row[];
  columns: string[];
}

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
  // New props for preview flow
  pendingFile?: FilePreview | null;
  onFilePreview?: (preview: FilePreview | null) => void;
  onConfirmFile?: () => void;
  onCancelFile?: () => void;
  // For showing file info after analysis
  activeFileName?: string | null;
  analysisComplete?: boolean;
}

export function CsvUploadSection({ 
  rowCount, 
  onFileLoaded,
  onScrape: _onScrape,
  scraping,
  progress,
  pendingFile,
  onFilePreview,
  onConfirmFile,
  onCancelFile,
  activeFileName,
  analysisComplete,
}: CsvUploadSectionProps) {
  
  function handleFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data.filter(Boolean);
        const columns = results.meta.fields || [];
        
        // If preview callback exists, show preview instead of loading directly
        if (onFilePreview) {
          onFilePreview({
            fileName: file.name,
            rows: data,
            columns,
          });
        } else {
          // Fallback to direct load (old behavior)
          const sample = data[0] || {};
          onFileLoaded(data, guessTitleKey(sample), guessUrlKey(sample));
        }
      },
      error: (err) => alert("CSV parse error: " + err.message),
    });
  }

  // Show file info after analysis is complete
  if (analysisComplete && activeFileName) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Analysis Complete</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">File</span>
            <span className="text-[var(--foreground)] font-medium">{activeFileName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Records</span>
            <span className="text-[var(--foreground)] font-medium">{rowCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Status</span>
            <span className="text-green-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Complete
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show file preview for confirmation
  if (pendingFile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Confirm File</h3>
        </div>
        
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-[var(--foreground)]/5 border border-[var(--border)]">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">File Name</span>
                <span className="text-[var(--foreground)] font-medium truncate max-w-[180px]">
                  {pendingFile.fileName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Rows</span>
                <span className="text-[var(--foreground)] font-medium">{pendingFile.rows.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Columns</span>
                <span className="text-[var(--foreground)] font-medium">{pendingFile.columns.length}</span>
              </div>
            </div>
            
            {/* Column preview */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted)] mb-2">Columns found:</p>
              <div className="flex flex-wrap gap-1">
                {pendingFile.columns.slice(0, 6).map((col, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded bg-[var(--foreground)]/10 text-[var(--foreground)]"
                  >
                    {col}
                  </span>
                ))}
                {pendingFile.columns.length > 6 && (
                  <span className="px-2 py-0.5 text-xs rounded bg-[var(--muted)]/20 text-[var(--muted)]">
                    +{pendingFile.columns.length - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onCancelFile}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--foreground)]/5 transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onConfirmFile}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] font-medium hover:opacity-90 transition-opacity text-sm shadow-sm"
            >
              <Globe className="w-4 h-4" />
              Start Analysis
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show progress during analysis
  if (scraping || progress.done > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]">
            <Globe className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Analyzing...</h3>
        </div>
        
        <ProgressBar done={progress.done} total={progress.total} />
      </motion.div>
    );
  }

  // Default: Show upload prompt
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
        <div className="text-xs text-[var(--muted)] p-2 rounded-lg bg-[var(--foreground)]/5 border border-[var(--border)]">
          Upload a CSV file with Title and Link columns.
        </div>

        <label className="block w-full group cursor-pointer">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFile(file);
                // Reset input so the same file can be selected again
                e.target.value = '';
              }
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
      </div>
    </motion.div>
  );
}
