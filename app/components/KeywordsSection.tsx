"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { Pill } from "./ui/Pill";
import type { KeywordStat } from "@/app/types";

interface KeywordsSectionProps {
  filteredRanked: KeywordStat[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onAddKeyword: (term: string) => void;
  onRemoveKeyword: (term: string) => void;
}

type SortKey = "term" | "count";
type SortDir = "asc" | "desc";

export function KeywordsSection({
  filteredRanked,
  selected,
  query,
  onQueryChange,
  onAddKeyword,
  onRemoveKeyword,
}: KeywordsSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Handle column header click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // Switch to new key with default direction
      setSortKey(key);
      setSortDir(key === "term" ? "asc" : "desc");
    }
  };

  // Sorted keywords
  const sortedKeywords = useMemo(() => {
    const sorted = [...filteredRanked];
    sorted.sort((a, b) => {
      if (sortKey === "term") {
        const cmp = a.term.localeCompare(b.term);
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        const cmp = a.df - b.df;
        return sortDir === "asc" ? cmp : -cmp;
      }
    });
    return sorted;
  }, [filteredRanked, sortKey, sortDir]);

  // Sort icon component - shows ArrowUpDown for inactive, ChevronUp/Down for active
  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex flex-col h-[600px]"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]">
          <Search className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Keywords</h3>
      </div>

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search keywords..."
          className="w-full px-3 py-2 rounded-lg bg-[var(--section-bg)] border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition-all placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--section-bg)]">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-[var(--section-bg)] text-[var(--muted)] text-xs uppercase tracking-wide font-semibold border-b border-[var(--border)] z-10">
            <tr>
              <th 
                className="px-4 py-3 cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => handleSort("term")}
              >
                <div className="flex items-center gap-1">
                  Term
                  <SortIcon column="term" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-center cursor-pointer hover:text-[var(--foreground)] transition-colors select-none w-[80px]"
                onClick={() => handleSort("count")}
              >
                <div className="flex items-center justify-center gap-1">
                  Count
                  <SortIcon column="count" />
                </div>
              </th>
              <th className="px-4 py-3 w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedKeywords.slice(0, 600).map((k) => {
              const isSelected = selected.includes(k.term);
              return (
                <tr
                  key={k.term}
                  className={`transition-colors group ${
                    isSelected 
                      ? "bg-[var(--primary)]/10" 
                      : "hover:bg-[var(--foreground)]/5"
                  }`}
                >
                  <td className="px-4 py-2 font-medium text-[var(--foreground)]">{k.term}</td>
                  <td className="px-4 py-2 text-center tabular-nums text-[var(--muted)] w-[80px]">{k.df}</td>
                  <td className="px-4 py-2 text-right">
                    {isSelected ? (
                      <button
                        onClick={() => onRemoveKeyword(k.term)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--foreground)] hover:bg-[var(--primary)]/20 transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => onAddKeyword(k.term)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        Add
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wide">Selected Topics</div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {selected.map((t) => (
              <Pill key={t} onRemove={() => onRemoveKeyword(t)}>
                {t}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

