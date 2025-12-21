"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Pill } from "./ui/Pill";
import type { KeywordStat } from "@/app/types";

interface KeywordsSectionProps {
  filteredRanked: KeywordStat[];
  selected: string[];
  query: string;
  maxTerms: number;
  onQueryChange: (value: string) => void;
  onMaxTermsChange: (value: number) => void;
  onAddKeyword: (term: string) => void;
  onRemoveKeyword: (term: string) => void;
}

export function KeywordsSection({
  filteredRanked,
  selected,
  query,
  maxTerms,
  onQueryChange,
  onMaxTermsChange,
  onAddKeyword,
  onRemoveKeyword,
}: KeywordsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-medium">
          <Search className="w-4 h-4" /> Keywords
        </div>
        <label className="text-xs flex items-center gap-2">
          Max terms
          <input
            type="range"
            min={50}
            max={700}
            step={10}
            value={maxTerms}
            onChange={(e) => onMaxTermsChange(parseInt(e.target.value))}
          />
          <span className="tabular-nums">{maxTerms}</span>
        </label>
      </div>
      <div className="mb-3">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter keywords…"
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border"
        />
      </div>
      <div className="max-h-72 overflow-auto rounded-xl border bg-white dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur">
            <tr>
              <th className="text-left px-3 py-2">Term</th>
              <th className="text-right px-3 py-2">Number of Documents With Keyword</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRanked.slice(0, 600).map((k) => (
              <tr
                key={k.term}
                className="border-t hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50"
              >
                <td className="px-3 py-1.5 font-medium">{k.term}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{k.df}</td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    onClick={() => onAddKeyword(k.term)}
                    className="px-2 py-1 text-xs rounded-md border hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((t) => (
            <Pill key={t} onRemove={() => onRemoveKeyword(t)}>
              {t}
            </Pill>
          ))}
        </div>
      )}
    </motion.div>
  );
}
