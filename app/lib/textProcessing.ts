// Text processing utilities for keyword extraction and TF-IDF

import { STOPWORDS } from "./stopwords";
import type { Article, KeywordStat } from "@/app/types";

/**
 * Normalize text: lowercase, remove URLs, remove special chars, collapse whitespace
 */
export const normalize = (s: string): string =>
  s.toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Tokenize text: normalize and filter stopwords and short tokens
 */
export const tokenize = (s: string): string[] =>
  normalize(s)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t) && t.length > 2);

/**
 * Compute term frequency and document frequency for a collection of articles
 */
export function computeTfDf(articles: Article[]): {
  docTfs: Map<string, Map<string, number>>;
  df: Map<string, number>;
} {
  const docTfs: Map<string, Map<string, number>> = new Map();
  const df: Map<string, number> = new Map();

  for (const a of articles) {
    const tokens = tokenize(`${a.title} ${a.text}`);
    const tf = new Map<string, number>();
    const seen = new Set<string>();
    
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
      seen.add(t);
    }
    
    docTfs.set(a.id, tf);
    
    for (const t of seen) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  
  return { docTfs, df };
}

/**
 * Rank keywords by TF-IDF score across all articles
 */
export function rankKeywords(articles: Article[], maxTerms = 300): KeywordStat[] {
  const N = Math.max(1, articles.length);
  const { docTfs, df } = computeTfDf(articles);
  const scores: Map<string, number> = new Map();

  for (const a of articles) {
    const tf = docTfs.get(a.id)!;
    for (const [term, freq] of tf.entries()) {
      const idf = Math.log((N + 1) / (1 + (df.get(term) || 1))) + 1;
      scores.set(term, (scores.get(term) || 0) + freq * idf);
    }
  }

  return Array.from(scores.entries())
    .map(([term, score]) => ({ term, tfidf: score, df: df.get(term) || 0 }))
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, maxTerms);
}
