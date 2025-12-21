// CSV column mapping helpers

import type { Row } from "@/app/types";

/**
 * Get column options from CSV rows
 */
export function columnOptions(rows: Row[], includeEmpty = false): string[] {
  const keys = new Set<string>();
  rows.slice(0, 50).forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
  const arr = Array.from(keys);
  return includeEmpty ? ["", ...arr] : arr;
}

/**
 * Auto-detect the likely title column from a row
 */
export function guessTitleKey(r: Row): string {
  const candidates = Object.keys(r || {});
  const score = (k: string) =>
    (/title|headline|name/i.test(k) ? 2 : 0) + (String(r[k] || "").length > 15 ? 1 : 0);
  return candidates.sort((a, b) => score(b) - score(a))[0] || "";
}

/**
 * Auto-detect the likely URL column from a row
 */
export function guessUrlKey(r: Row): string {
  const candidates = Object.keys(r || {});
  const score = (k: string) =>
    (/url|link|href|source/i.test(k) ? 2 : 0) + (/^https?:\/\//i.test(String(r[k] || "")) ? 2 : 0);
  return candidates.sort((a, b) => score(b) - score(a))[0] || "";
}
