"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Papa from "papaparse";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Upload, Globe, Search, Link2, Settings2, Download, X } from "lucide-react";
import {
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
} from "d3-force";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Lazy-load graph to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type Row = Record<string, string | number | null | undefined>;

type Article = {
  id: string;
  title: string;
  url?: string;
  text: string; // scraped text (or fallback)
  row: Row;
};

type KeywordStat = { term: string; df: number; tfidf: number };
type GraphNode = { id: string; type: "keyword" | "article"; label: string; url?: string; hits?: number };
type GraphLink = { source: string; target: string; weight: number };

// -----------------------------
// Text processing
// -----------------------------
const BASE_STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
  "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
  "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've",
  "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
  "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that",
  "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
  "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
  "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
  "yours", "yourself", "yourselves",
  // generic academic/boilerplate
  "using", "used", "use", "result", "results", "method", "methods", "conclusion", "study", "studies", "based", "analysis",
  "paper", "approach", "new", "also", "well", "show", "shown", "showed", "may", "might", "can", "could", "however", "therefore",
  "within", "among", "across", "found", "significant", "significantly", "present", "presented", "proposed", "provide",
  "provided", "provides", "per", "via", "et", "al", "system", "systems", "different", "including", "similar", "type", "total",
  "group", "groups", "one", "two", "three", "open", "file", "information", "values", "min", "day", "days", "time"
]);

// your requested "non-bio" & platform/search/boilerplate terms
const EXTRA_STOPWORDS = new Set([
  // platforms / infra
  "doi", "google", "scholar", "pubmed", "pmc", "sci", "biol", "physiol", "microbiol", "res",
  // article furniture
  "article", "articles", "fig", "figure", "table", "tab", "supplementary", "article", "articles", "free", "fig", "figure", "table", "tab", "supplementary", "dataset", "datasets", "file", "files",
  "information", "data", "model", "models", "test", "reads", "open", "find", "number", "values", "sample", "samples",
  // generic org/geo
  "usa", "university", "center", "international", "york", "cornell",
  // nasa / platform terms that aren’t topical
  "nasa", "iss", "mission", "missions", "genelab",
  // misc boilerplate or catalog words
  "find", "open", "file", "information", "state", "potential", "identified", "performed",
]);

// merge sets
const STOPWORDS = new Set<string>([...BASE_STOPWORDS, ...EXTRA_STOPWORDS]);

const normalize = (s: string) =>
  s.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

const tokenize = (s: string) =>
  normalize(s).split(" ").filter((t) => t && !STOPWORDS.has(t) && t.length > 2);

function computeTfDf(articles: Article[]) {
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
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return { docTfs, df };
}

function rankKeywords(articles: Article[], maxTerms = 300): KeywordStat[] {
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

function buildGraph(articles: Article[], selected: string[], docTfs: Map<string, Map<string, number>>) {
  const keywordNodes: GraphNode[] = selected.map((t) => ({ id: `k:${t}`, type: "keyword", label: t }));
  const articleNodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const a of articles) {
    const tf = docTfs.get(a.id) || new Map();
    let hits = 0;
    for (const k of selected) {
      const weight = tf.get(k) || 0;
      if (weight > 0) {
        hits += weight;
        links.push({ source: `k:${k}`, target: a.id, weight });
      }
    }
    if (hits > 0) articleNodes.push({ id: a.id, type: "article", label: a.title || a.id, url: a.url, hits });
  }
  return { nodes: [...keywordNodes, ...articleNodes], links };
}

// --------------------------------------------------
// Helpers to size keyword pills + collision radii
// -----------------------------
const PILL_PADDING_X = 9;     // matches drawing padding
const PILL_PADDING_Y = 4;
function approxTextWidth(label: string, fontPx: number) {
  // quick width estimate: pixels per char ~ 0.6 * font
  return Math.max(10, label.length * (fontPx * 0.6));
}
function keywordRect(label: string, fontPx: number) {
  const textW = approxTextWidth(label, fontPx);
  const w = textW + PILL_PADDING_X * 2;
  const h = fontPx + PILL_PADDING_Y * 2;
  const r = Math.max(h, w) / 2; // generous collision radius
  return { w, h, r };
}

// -----------------------------
// Column helpers
// -----------------------------
function columnOptions(rows: Row[], includeEmpty = false): string[] {
  const keys = new Set<string>();
  rows.slice(0, 50).forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
  const arr = Array.from(keys);
  return includeEmpty ? ["", ...arr] : arr;
}
function guessTitleKey(r: Row): string {
  const candidates = Object.keys(r || {});
  const score = (k: string) => (/title|headline|name/i.test(k) ? 2 : 0) + (String(r[k] || "").length > 15 ? 1 : 0);
  return candidates.sort((a, b) => score(b) - score(a))[0] || "";
}
function guessUrlKey(r: Row): string {
  const candidates = Object.keys(r || {});
  const score = (k: string) => (/url|link|href|source/i.test(k) ? 2 : 0) + (/^https?:\/\//i.test(String(r[k] || "")) ? 2 : 0);
  return candidates.sort((a, b) => score(b) - score(a))[0] || "";
}

// -----------------------------
// Small UI bits (re-added)
// -----------------------------
function LabeledSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border"
      >
        <option value="">— Auto detect —</option>
        {options.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
    </label>
  );
}
function Pill({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm border">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="rounded-full p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}

// -----------------------------
// Chat section (Gemini) — keep EXACTLY as provided
// -----------------------------
type ChatMsg = { role: "user" | "assistant"; content: string; usedArticles?: number };

function GeminiChatSection({
  selected,
  articles,
  docTfs,
}: {
  selected: string[];
  articles: Array<{ id: string; title: string; url?: string; text: string }>;
  docTfs: Map<string, Map<string, number>>;
}) {
  const [chat, setChat] = React.useState<ChatMsg[]>([]);
  const [userInput, setUserInput] = React.useState("");
  const [includeSelectedArticles, setIncludeSelectedArticles] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // relevant articles (match any selected keyword)
  const relevantArticles = React.useMemo(() => {
    if (!selected.length) return [];
    return articles.filter(a => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some(t => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  // auto-scroll to bottom on new message
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, sending]);

  async function sendMessage() {
    const text = userInput.trim();
    if (!text || sending) return;
    setUserInput("");
    setSending(true);

    // optimistic user message
    setChat(prev => [...prev, { role: "user", content: text }]);

    try {
      const items = includeSelectedArticles
        ? relevantArticles.map(a => ({
          title: a.title,
          url: a.url,
          text: (a.text || "").slice(0, 2000),
        }))
        : [];

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          queryKeywords: selected,
          userPrompt: text,
          history: chat,
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(raw || `HTTP ${res.status} ${res.statusText}`);
      }

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      const assistantText = data.summary || "(No response)";
      setChat(prev => [...prev, { role: "assistant", content: assistantText, usedArticles: items.length }]);
    } catch (err: any) {
      setChat(prev => [...prev, { role: "assistant", content: `**Error:** ${err?.message || "Unknown error"}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-medium">
          <span>Gemini Chat</span>
        </div>
        <div className="text-xs text-zinc-500">
          {selected.length} keyword{selected.length === 1 ? "" : "s"} · {relevantArticles.length} matching article{relevantArticles.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Chat history */}
      <div
        ref={scrollRef}
        className="rounded-xl border bg-white dark:bg-zinc-950 p-3 max-h-72 overflow-auto space-y-3"
      >
        {chat.length === 0 && (
          <div className="text-sm text-zinc-500">
            Ask a question about your selected topics. Toggle “Use selected articles” to include context when sending.
          </div>
        )}

        {chat.map((m, i) => (
          <div
            key={i}
            className={`text-sm flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === "user"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                }`}
            >
              <div className="mb-1 text-[11px] opacity-80">
                {m.role === "user" ? "You" : "Gemini"}{" "}
                {m.role === "assistant" && typeof m.usedArticles === "number" && (
                  <span className="opacity-70">· {m.usedArticles} article{m.usedArticles === 1 ? "" : "s"}</span>
                )}
              </div>

              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask Gemini about the selected topics…"
          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !userInput.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Ask Gemini"}
        </button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 select-none">
        <input
          type="checkbox"
          className="rounded"
          checked={includeSelectedArticles}
          onChange={(e) => setIncludeSelectedArticles(e.target.checked)}
        />
        Use selected articles ({relevantArticles.length} will be included as context)
      </label>
    </div>
  );
}

// -----------------------------
// Page
// -----------------------------
export default function Page() {
  // CSV state
  const [rows, setRows] = useState<Row[]>([]);
  const [colTitle, setColTitle] = useState<string>("");
  const [colUrl, setColUrl] = useState<string>("");

  // derived articles (pre-scrape)
  const [articles, setArticles] = useState<Article[]>([]);
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // keywords / graph
  const [maxTerms, setMaxTerms] = useState(200);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { docTfs } = useMemo(() => computeTfDf(articles), [articles]);
  const ranked = useMemo(() => rankKeywords(articles, maxTerms), [articles, maxTerms]);
  const filteredRanked = useMemo(() => ranked.filter(k => k.term.includes(query.toLowerCase())), [ranked, query]);
  const graph = useMemo(() => buildGraph(articles, selected, docTfs), [articles, selected, docTfs]);

  // Frequency histogram data: df per topic word
  const histogramData = useMemo(() => {
    const topics = selected.length ? selected : ranked.slice(0, 20).map(k => k.term);
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
    return articles.filter(a => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some(t => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  // Summary state (top of graph column)
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  // parse CSV
  function handleFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data.filter(Boolean);
        setRows(data);
        const sample = data[0] || {};
        setColTitle(guessTitleKey(sample));
        setColUrl(guessUrlKey(sample));
        setArticles([]); // reset previous
      },
      error: (err) => alert("CSV parse error: " + err.message),
    });
  }

  // scrape all URLs (server-side via route handler)
  async function scrapeAll() {
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

    await Promise.all(new Array(Math.min(concurrency, items.length)).fill(0).map(() => pump()));

    setArticles(results.filter(Boolean));
    setScraping(false);
  }

  function addKeyword(term: string) {
    setSelected((prev) => (prev.includes(term) ? prev : [...prev, term]));
  }
  function removeKeyword(term: string) {
    setSelected((prev) => prev.filter((t) => t !== term));
  }

  // export PNG
  const fgRef = useRef<any>();
  function exportPNG() {
    if (!fgRef.current) return;
    const canvas: HTMLCanvasElement = fgRef.current.canvas();
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.png";
    a.click();
  }

  // -----------------------------
  // Gemini summarize call (client -> /api/summarize)
  // -----------------------------
  async function summarizeWithGemini() {
    try {
      setSummaryLoading(true);
      setSummaryText("");

      const items = relevantArticles.map(a => ({
        title: a.title,
        url: a.url,
        text: (a.text || "").slice(0, 1200),
      }));

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          queryKeywords: selected,
          userPrompt: selected.length
            ? `Summarize current evidence across abstracts related to: ${selected.join(", ")}.`
            : "Summarize the most salient topics in the current dataset.",
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(raw || `HTTP ${res.status} ${res.statusText}`);
      }

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      setSummaryText(data.summary || "(No summary returned)");
    } catch (err: any) {
      setSummaryText(`Error: ${err?.message || "Unknown error"}`);
    } finally {
      setSummaryLoading(false);
    }
  }

  // -----------------------------
  // Layout: spread out links & nodes
  // -----------------------------
  useEffect(() => {
    if (!fgRef.current) return;

    // Stronger repulsion for more space
    fgRef.current.d3Force("charge", forceManyBody().strength(-320));

    // Collision radius based on node size (keywords use label width)
    fgRef.current.d3Force(
      "collide",
      forceCollide()
        .radius((n: any) => {
          if (n.type === "keyword") {
            const { r } = keywordRect(n.label || "", 14); // font 14px like we draw
            return r + 6; // small buffer
          }
          return 10 + Math.min(16, (n.hits || 1) * 1.2);
        })
        .iterations(2)
    );

    // Optional slight banding to avoid vertical piling
    fgRef.current.d3Force(
      "x",
      forceX((n: any) => (n.type === "keyword" ? 0 : 0)).strength(0.02)
    );
    fgRef.current.d3Force(
      "y",
      forceY((n: any) => (n.type === "keyword" ? -200 : 120)).strength((n: any) => (n.type === "keyword" ? 0.08 : 0.04))
    );

    // Re-heat and autofit
    fgRef.current.d3ReheatSimulation();
    const t = setTimeout(() => {
      try {
        fgRef.current.zoomToFit(600, 60);
      } catch { }
    }, 450);
    return () => clearTimeout(t);
  }, [graph]);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-black/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600" />
            <div>
              <div className="font-semibold">NASA Hackathon 2025</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPNG} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black text-sm hover:opacity-90">
              <Download className="w-4 h-4" /> Export PNG
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        {/* Controls */}
        <section className="lg:col-span-2 space-y-4">
          {/* CSV */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2 mb-3 font-medium"><Upload className="w-4 h-4" /> Load CSV</div>
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
              {rows.length > 0 && (
                <div className="text-xs text-zinc-500">Loaded {rows.length.toLocaleString()} rows</div>
              )}
            </div>
          </motion.div>

          {/* Column mapping */}
          {rows.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2 mb-3 font-medium"><Settings2 className="w-4 h-4" /> Map Columns</div>
              <div className="grid grid-cols-2 gap-3">
                <LabeledSelect label="Title" value={colTitle} onChange={setColTitle} options={columnOptions(rows)} />
                <LabeledSelect label="URL" value={colUrl} onChange={setColUrl} options={columnOptions(rows)} />
              </div>
              <button
                disabled={scraping || rows.length === 0 || !colUrl}
                onClick={scrapeAll}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
              >
                <Globe className="w-4 h-4" /> {scraping ? "Scraping…" : "Scrape & Build"}
              </button>
              {scraping && (
                <div className="mt-3 text-xs text-zinc-500">
                  Progress: {progress.done}/{progress.total}
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded mt-1 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Keywords */}
          {articles.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 font-medium"><Search className="w-4 h-4" /> Keywords</div>
                <label className="text-xs flex items-center gap-2">
                  Max terms
                  <input type="range" min={50} max={700} step={10} value={maxTerms} onChange={(e) => setMaxTerms(parseInt(e.target.value))} />
                  <span className="tabular-nums">{maxTerms}</span>
                </label>
              </div>
              <div className="mb-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
                      <tr key={k.term} className="border-t hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
                        <td className="px-3 py-1.5 font-medium">{k.term}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{k.df}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button onClick={() => addKeyword(k.term)} className="px-2 py-1 text-xs rounded-md border hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
                    <Pill key={t} onRemove={() => removeKeyword(t)}>{t}</Pill>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Gemini Chat (chat-like, markdown, history) */}
          {articles.length > 0 && (
            <GeminiChatSection selected={selected} articles={articles} docTfs={docTfs} />
          )}

          {/* Tips */}
          <div className="p-4 rounded-2xl border bg-emerald-50/60 dark:bg-emerald-950/20 text-sm space-y-2">
            <div className="font-medium flex items-center gap-2"><Search className="w-4 h-4" /> Tips</div>
            <ul className="list-disc pl-5 space-y-1 text-emerald-900 dark:text-emerald-200">
              <li>Upload a CSV file with article titles and URLs to begin analysis.</li>
              <li>Scrape the URLs to extract abstracts and text for keyword generation.</li>
              <li>Use the keyword table to add or remove topics for your mind map.</li>
              <li>Explore the mind map by dragging or zooming to view relationships between topics and articles.</li>
              <li>Use the Gemini chat to ask questions about selected topics and view AI-generated insights.</li>
              <li>Export the mind map as a PNG image to include in reports or presentations.</li>
            </ul>
          </div>
        </section>

        {/* Graph */}
        <section className="lg:col-span-3 min-h-[60vh] lg:min-h-[78vh] p-2 rounded-2xl border bg-white dark:bg-zinc-950 relative overflow-hidden">
          {selected.length === 0 && histogramData.length === 0 ? (
            <div className="h-full grid place-items-center text-zinc-500">
              <div className="text-center">
                <div className="font-semibold mb-1">No keywords selected</div>
                <div className="text-sm">Pick keywords on the left to build the mind map.</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Summary — TOP OF GRAPH COLUMN */}
              <div className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border mb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={summarizeWithGemini}
                    disabled={summaryLoading || relevantArticles.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white disabled:opacity-60 text-sm"
                  >
                    {summaryLoading ? "Summarizing…" : `Gemini Summary (${relevantArticles.length} articles)`}
                  </button>
                  <div className="ml-auto text-xs text-zinc-500">
                    {selected.length} keyword{selected.length === 1 ? "" : "s"} in context
                  </div>
                </div>
                {summaryText && (
                  <div className="mt-2 text-sm p-3 rounded-lg border bg-white dark:bg-zinc-950 max-h-48 overflow-auto prose prose-sm dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Histogram */}
              <div className="h-[200px] w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis
                      dataKey="term"
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(99,102,241,0.08)" }}
                      contentStyle={{ background: "var(--tooltip-bg, #0b1220)", color: "#fff", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}
                      labelStyle={{ fontWeight: 600 }}
                      formatter={(value: any) => [`${value}`, "Docs"]}
                    />
                    <Bar dataKey="count" name="Docs" radius={[6, 6, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Force graph */}
              <div className="flex-1 rounded-xl overflow-hidden">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graph}
                  nodeRelSize={6}
                  cooldownTicks={140}
                  linkDirectionalParticles={0}
                  linkColor={() => "rgba(16,185,129,0.45)"}
                  linkWidth={(d: any) => 0.5 + Math.min(5, d.weight)}
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const n: GraphNode = node;
                    const label = n.label;
                    const fontSize = Math.max(6, 14 / (globalScale ** 0.5));
                    ctx.font = `${fontSize}px Inter, ui-sans-serif`;

                    if (n.type === "keyword") {
                      const textW = ctx.measureText(label).width;
                      const w = textW + PILL_PADDING_X * 2;
                      const h = fontSize + PILL_PADDING_Y * 2;
                      ctx.fillStyle = "#ecfdf5";
                      roundRect(ctx, node.x - w / 2, node.y - h / 2, w, h, 12, true, false);
                      ctx.fillStyle = "#065f46";
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillText(label, node.x, node.y);
                    } else {
                      const radius = 5 + Math.min(18, (n.hits || 1) * 1.2);
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                      ctx.fillStyle = "#60a5fa";
                      ctx.fill();
                      ctx.strokeStyle = "#1e40af";
                      ctx.lineWidth = 1;
                      ctx.stroke();
                    }
                  }}
                  onNodeClick={(node: any) => {
                    const n = node as GraphNode;
                    if (n.type === "article" && n.url && /^https?:\/\//i.test(n.url)) {
                      window.open(n.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke?: boolean) {
  radius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
