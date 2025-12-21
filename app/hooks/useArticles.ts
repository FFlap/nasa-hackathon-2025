"use client";

import { useState, useCallback } from "react";
import type { Row, Article } from "@/app/types";

interface UseArticlesResult {
  rows: Row[];
  articles: Article[];
  colTitle: string;
  colUrl: string;
  scraping: boolean;
  progress: { done: number; total: number };
  setRows: (rows: Row[]) => void;
  setArticles: (articles: Article[]) => void;
  setColTitle: (value: string) => void;
  setColUrl: (value: string) => void;
  handleFileLoaded: (rows: Row[], guessedTitle: string, guessedUrl: string) => void;
  scrapeAll: () => Promise<void>;
}

export function useArticles(): UseArticlesResult {
  const [rows, setRows] = useState<Row[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [colTitle, setColTitle] = useState<string>("");
  const [colUrl, setColUrl] = useState<string>("");
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleFileLoaded = useCallback(
    (newRows: Row[], guessedTitle: string, guessedUrl: string) => {
      setRows(newRows);
      setColTitle(guessedTitle);
      setColUrl(guessedUrl);
      setArticles([]); // reset previous
    },
    []
  );

  const scrapeAll = useCallback(async () => {
    const items = rows
      .map((r, i) => {
        const title = String((r[colTitle] ?? "") || "");
        const url = String((r[colUrl] ?? "") || "");
        return { idx: i, title, url, row: r };
      })
      .filter((x) => x.title || x.url);

    setProgress({ done: 0, total: items.length });
    setScraping(true);

    const concurrency = 5;
    let cursor = 0;
    const results: Article[] = new Array(items.length);

    const pump = async (): Promise<void> => {
      if (cursor >= items.length) return;
      const myIdx = cursor++;
      const it = items[myIdx];

      try {
        let text = "";
        let finalTitle = it.title;
        if (it.url && /^https?:\/\//i.test(it.url)) {
          const res = await fetch("/api/scrape", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: it.url }),
          });
          if (res.ok) {
            const data = await res.json();
            text = data.text || "";
            if (!finalTitle && data.title) finalTitle = data.title;
          }
        }
        const combined = [finalTitle, text].filter(Boolean).join(" ");
        results[myIdx] = {
          id: `a${myIdx}`,
          title: finalTitle || (it.url || `Row ${it.idx + 1}`),
          url: it.url || undefined,
          text: combined,
          row: it.row,
        };
      } catch {
        results[myIdx] = {
          id: `a${myIdx}`,
          title: it.title || (it.url || `Row ${it.idx + 1}`),
          url: it.url || undefined,
          text: it.title || "",
          row: it.row,
        };
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        if (cursor < items.length) await pump();
      }
    };

    await Promise.all(
      new Array(Math.min(concurrency, items.length)).fill(0).map(() => pump())
    );

    setArticles(results.filter(Boolean));
    setScraping(false);
  }, [rows, colTitle, colUrl]);

  return {
    rows,
    articles,
    colTitle,
    colUrl,
    scraping,
    progress,
    setRows,
    setArticles,
    setColTitle,
    setColUrl,
    handleFileLoaded,
    scrapeAll,
  };
}
