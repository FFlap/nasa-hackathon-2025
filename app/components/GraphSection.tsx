"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  SimulationNodeDatum,
} from "d3-force";
import type {
  Article,
  GraphNode,
  GraphLink,
  HistogramDataItem,
  SummarizeResponse,
} from "@/app/types";
import { getErrorMessage } from "@/app/types";
import { PILL_PADDING_X, PILL_PADDING_Y, keywordRect, roundRect } from "@/app/lib/graphUtils";

// Lazy-load graph to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// ForceGraph2D ref type
interface ForceGraphMethods {
  d3Force: (name: string, force?: unknown) => unknown;
  d3ReheatSimulation: () => void;
  zoomToFit: (duration: number, padding: number) => void;
  canvas: () => HTMLCanvasElement;
}

// D3 simulation node with our custom properties
interface D3SimNode extends SimulationNodeDatum {
  type?: "keyword" | "article";
  label?: string;
  hits?: number;
}

// Force graph node with position
interface FGNode extends GraphNode {
  x: number;
  y: number;
}

// Force graph link with weight
interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  weight: number;
}

interface GraphSectionProps {
  selected: string[];
  articles: Article[];
  docTfs: Map<string, Map<string, number>>;
  graph: { nodes: GraphNode[]; links: GraphLink[] };
  histogramData: HistogramDataItem[];
  fgRef: React.MutableRefObject<ForceGraphMethods | null>;
}

export function GraphSection({
  selected,
  articles,
  docTfs,
  graph,
  histogramData,
  fgRef,
}: GraphSectionProps) {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  // Relevant articles for summary (auto-selected by keywords)
  const relevantArticles = React.useMemo(() => {
    if (!selected.length) return [];
    return articles.filter((a) => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some((t) => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  // Gemini summarize call
  async function summarizeWithGemini() {
    try {
      setSummaryLoading(true);
      setSummaryText("");

      const items = relevantArticles.map((a) => ({
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
      let data: SummarizeResponse | null = null;
      try {
        data = raw ? JSON.parse(raw) as SummarizeResponse : null;
      } catch {
        throw new Error(raw || `HTTP ${res.status} ${res.statusText}`);
      }

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      setSummaryText(data.summary || "(No summary returned)");
    } catch (err: unknown) {
      setSummaryText(`Error: ${getErrorMessage(err)}`);
    } finally {
      setSummaryLoading(false);
    }
  }

  // Layout: spread out links & nodes
  useEffect(() => {
    if (!fgRef.current) return;

    // Stronger repulsion for more space
    fgRef.current.d3Force("charge", forceManyBody().strength(-320));

    // Collision radius based on node size (keywords use label width)
    fgRef.current.d3Force(
      "collide",
      forceCollide<D3SimNode>()
        .radius((n) => {
          if (n.type === "keyword") {
            const { r } = keywordRect(n.label || "", 14);
            return r + 6;
          }
          return 10 + Math.min(16, (n.hits || 1) * 1.2);
        })
        .iterations(2)
    );

    // Optional slight banding to avoid vertical piling
    fgRef.current.d3Force(
      "x",
      forceX<D3SimNode>((n) => (n.type === "keyword" ? 0 : 0)).strength(0.02)
    );
    fgRef.current.d3Force(
      "y",
      forceY<D3SimNode>((n) => (n.type === "keyword" ? -200 : 120)).strength((n) =>
        n.type === "keyword" ? 0.08 : 0.04
      )
    );

    // Re-heat and autofit
    fgRef.current.d3ReheatSimulation();
    const t = setTimeout(() => {
      try {
        fgRef.current?.zoomToFit(600, 60);
      } catch {}
    }, 450);
    return () => clearTimeout(t);
  }, [graph, fgRef]);

  // Type-safe callback wrappers for ForceGraph2D
  const handleLinkWidth = (link: FGLink): number => {
    return 0.5 + Math.min(5, link.weight);
  };

  const handleNodeCanvas = (
    node: FGNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ): void => {
    const label = node.label;
    const fontSize = Math.max(6, 14 / globalScale ** 0.5);
    ctx.font = `${fontSize}px Inter, ui-sans-serif`;

    if (node.type === "keyword") {
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
      const radius = 5 + Math.min(18, (node.hits || 1) * 1.2);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = "#60a5fa";
      ctx.fill();
      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const handleNodeClick = (node: FGNode): void => {
    if (node.type === "article" && node.url && /^https?:\/\//i.test(node.url)) {
      window.open(node.url, "_blank", "noopener,noreferrer");
    }
  };

  // Define the clickable hitbox area (matches visual node size)
  const handleNodePointerArea = (
    node: FGNode,
    color: string,
    ctx: CanvasRenderingContext2D
  ): void => {
    ctx.fillStyle = color;
    if (node.type === "keyword") {
      const fontSize = 14;
      ctx.font = `${fontSize}px Inter, ui-sans-serif`;
      const textW = ctx.measureText(node.label).width;
      const w = textW + PILL_PADDING_X * 2;
      const h = fontSize + PILL_PADDING_Y * 2;
      ctx.fillRect(node.x - w / 2, node.y - h / 2, w, h);
    } else {
      const radius = 5 + Math.min(18, (node.hits || 1) * 1.2);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  };

  return (
    <section className="lg:col-span-3 min-h-[60vh] lg:min-h-[78vh] p-2 rounded-2xl border bg-white dark:bg-zinc-950 relative overflow-hidden">
      {selected.length === 0 && histogramData.length === 0 ? (
        <div className="h-full grid place-items-center text-zinc-500">
          <div className="text-center">
            <div className="font-semibold mb-1">No keywords selected</div>
            <div className="text-sm">
              Pick keywords on the left to build the mind map.
            </div>
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
                {summaryLoading
                  ? "Summarizing…"
                  : `Gemini Summary (${relevantArticles.length} articles)`}
              </button>
              <div className="ml-auto text-xs text-zinc-500">
                {selected.length} keyword{selected.length === 1 ? "" : "s"} in
                context
              </div>
            </div>
            {summaryText && (
              <div className="mt-2 text-sm p-3 rounded-lg border bg-white dark:bg-zinc-950 max-h-48 overflow-auto prose prose-sm dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summaryText}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Histogram */}
          <div className="h-[200px] w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogramData}
                margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
              >
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
                  contentStyle={{
                    background: "var(--tooltip-bg, #0b1220)",
                    color: "#fff",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value}`, "Docs"]}
                />
                <Bar
                  dataKey="count"
                  name="Docs"
                  radius={[6, 6, 0, 0]}
                  fill="#10b981"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Force graph */}
          <div className="flex-1 rounded-xl overflow-hidden">
            <ForceGraph2D
              ref={fgRef as React.RefObject<never>}
              graphData={graph}
              nodeRelSize={6}
              cooldownTicks={140}
              linkDirectionalParticles={0}
              linkColor={() => "rgba(16,185,129,0.45)"}
              linkWidth={handleLinkWidth as (link: object) => number}
              nodeCanvasObject={handleNodeCanvas as (node: object, ctx: CanvasRenderingContext2D, scale: number) => void}
              nodePointerAreaPaint={handleNodePointerArea as (node: object, color: string, ctx: CanvasRenderingContext2D) => void}
              onNodeClick={handleNodeClick as (node: object, event: MouseEvent) => void}
            />
          </div>
        </div>
      )}
    </section>
  );
}
