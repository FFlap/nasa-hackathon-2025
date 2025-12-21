"use client";

import React from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import type { Row } from "@/app/types";
import { guessTitleKey, guessUrlKey } from "@/app/lib/columnHelpers";

interface CsvUploadSectionProps {
  rowCount: number;
  onFileLoaded: (
    rows: Row[],
    guessedTitle: string,
    guessedUrl: string
  ) => void;
}

export function CsvUploadSection({ rowCount, onFileLoaded }: CsvUploadSectionProps) {
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
      className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40"
    >
      <div className="flex items-center gap-2 mb-3 font-medium">
        <Upload className="w-4 h-4" /> Load CSV
      </div>
      <div className="grid gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-zinc-900 file:text-white hover:file:opacity-90 dark:file:bg-white dark:file:text-black"
        />
        {rowCount > 0 && (
          <div className="text-xs text-zinc-500">
            Loaded {rowCount.toLocaleString()} rows
          </div>
        )}
      </div>
    </motion.div>
  );
}
