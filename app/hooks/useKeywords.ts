"use client";

import { useState, useMemo, useCallback } from "react";
import type { Article, KeywordStat, HistogramDataItem, GraphNode, GraphLink } from "@/app/types";
import { computeTfDf, rankKeywords } from "@/app/lib/textProcessing";
import { buildGraph } from "@/app/lib/graphUtils";

interface UseKeywordsResult {
  selected: string[];
  query: string;
  maxTerms: number;
  docTfs: Map<string, Map<string, number>>;
  ranked: KeywordStat[];
  filteredRanked: KeywordStat[];
  graph: { nodes: GraphNode[]; links: GraphLink[] };
  histogramData: HistogramDataItem[];
  relevantArticles: Article[];
  setQuery: (value: string) => void;
  setMaxTerms: (value: number) => void;
  addKeyword: (term: string) => void;
  removeKeyword: (term: string) => void;
}

export function useKeywords(articles: Article[]): UseKeywordsResult {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [maxTerms, setMaxTerms] = useState(200);

  const { docTfs } = useMemo(() => computeTfDf(articles), [articles]);
  const ranked = useMemo(() => rankKeywords(articles, maxTerms), [articles, maxTerms]);
  const filteredRanked = useMemo(
    () => ranked.filter((k) => k.term.includes(query.toLowerCase())),
    [ranked, query]
  );
  const graph = useMemo(
    () => buildGraph(articles, selected, docTfs),
    [articles, selected, docTfs]
  );

  // Frequency histogram data: df per topic word
  const histogramData = useMemo(() => {
    const topics = selected.length
      ? selected
      : ranked.slice(0, 20).map((k) => k.term);
    const dfMap = new Map<string, number>();
    for (const t of topics) {
      let count = 0;
      for (const a of articles) {
        const tf = docTfs.get(a.id);
        if (tf?.has(t)) count++;
      }
      dfMap.set(t, count);
    }
    return Array.from(dfMap.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count);
  }, [articles, docTfs, ranked, selected]);

  // Relevant articles for summary (auto-selected by keywords)
  const relevantArticles = useMemo(() => {
    if (!selected.length) return [];
    return articles.filter((a) => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some((t) => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  const addKeyword = useCallback((term: string) => {
    setSelected((prev) => (prev.includes(term) ? prev : [...prev, term]));
  }, []);

  const removeKeyword = useCallback((term: string) => {
    setSelected((prev) => prev.filter((t) => t !== term));
  }, []);

  return {
    selected,
    query,
    maxTerms,
    docTfs,
    ranked,
    filteredRanked,
    graph,
    histogramData,
    relevantArticles,
    setQuery,
    setMaxTerms,
    addKeyword,
    removeKeyword,
  };
}
