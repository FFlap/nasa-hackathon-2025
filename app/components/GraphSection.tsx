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
import { Maximize2, Minimize2, Download } from "lucide-react";
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
  fgRef: React.MutableRefObject<unknown>;
  onExportPNG: () => void;
}

export function GraphSection({
  selected,
  articles,
  docTfs,
  graph,
  histogramData,
  fgRef,
  onExportPNG,
}: GraphSectionProps) {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Resize observer for graph container
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const el = containerRef.current;
    
    const measureNow = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    const rafId = requestAnimationFrame(() => {
      setTimeout(measureNow, 50);
    });
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    
    resizeObserver.observe(el);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [isExpanded, selected.length]);

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

    // Stronger repulsion for more space (balanced)
    (fgRef.current as ForceGraphMethods).d3Force("charge", forceManyBody().strength(-1000));

    // Collision radius based on node size (keywords use label width)
    (fgRef.current as ForceGraphMethods).d3Force(
      "collide",
      forceCollide<D3SimNode>()
        .radius((n) => {
          if (n.type === "keyword") {
            const { r } = keywordRect(n.label || "", 14);
            return r + 6; // Balanced padding
          }
          return 10 + Math.min(16, (n.hits || 1) * 1.5);
        })
        .iterations(2)
    );

    // Optional slight banding to avoid vertical piling, but allow clustering
    (fgRef.current as ForceGraphMethods).d3Force(
      "x",
      forceX<D3SimNode>(0).strength(0.02)
    );
    (fgRef.current as ForceGraphMethods).d3Force(
      "y",
      forceY<D3SimNode>((n) => (n.type === "keyword" ? -120 : 80)).strength((n) =>
        n.type === "keyword" ? 0.06 : 0.03
      )
    );

    // Re-heat and autofit
    (fgRef.current as ForceGraphMethods).d3ReheatSimulation();
    const t = setTimeout(() => {
      try {
        if (fgRef.current) {
          (fgRef.current as ForceGraphMethods).zoomToFit(600, 80);
        }
      } catch {}
    }, 450);
    return () => clearTimeout(t);
  }, [graph, fgRef, dimensions]); // Added dimensions dependency to re-simulate on resize

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

  const graphCardClasses = isExpanded
    ? "fixed inset-4 z-50 flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl p-6 overflow-hidden"
    : "flex-1 card p-5 relative overflow-hidden flex flex-col min-h-[500px]";

  const backdrop = isExpanded ? (
    <div 
      className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      onClick={() => setIsExpanded(false)}
    />
  ) : null;

  return (
    <>
      {backdrop}
      <section className="lg:col-span-3 flex flex-col gap-4 h-full">
        {/* Top Row: Histogram & Summary (Hide if graph expanded for focus) */}
        {!isExpanded && (
          <div className="grid grid-cols-1 gap-4">
             {/* Conditionally render Histogram if data exists */}
             {histogramData.length > 0 && (
               <div className="card p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Document Distribution</h3>
                  <div className="flex-1 min-h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={histogramData} // Shows all data
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis
                          dataKey="term"
                          tick={{ fontSize: 10, fill: "var(--muted)" }}
                          interval={0} 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: "var(--muted)" }} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--foreground)", opacity: 0.1 }}
                          contentStyle={{
                            background: "var(--card-bg)",
                            color: "var(--foreground)",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            fontSize: "12px",
                            boxShadow: "none"
                          }}
                          itemStyle={{ color: "var(--foreground)" }}
                          labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "var(--foreground)" }}
                          formatter={(value: number) => [`${value}`, "Documents"]}
                        />
                        <Bar
                          dataKey="count"
                          name="Docs"
                          radius={[2, 2, 0, 0]}
                          fill="var(--foreground)" 
                          className="opacity-80 hover:opacity-100 transition-opacity"
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
             )}

             {/* Summary Card (Visible even if no histogram, but conditioned on component props usually) */}
             <div className="card p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                     <h3 className="text-sm font-semibold text-[var(--foreground)]">AI Analysis</h3>
                     <span className="text-xs text-[var(--muted)]">
                       Articles: {relevantArticles.length}
                     </span>
                  </div>
                  <button
                    onClick={summarizeWithGemini}
                    disabled={summaryLoading || relevantArticles.length === 0}
                    className="btn-primary text-xs py-1.5 px-3 shadow-none disabled:opacity-50"
                  >
                    {summaryLoading ? "ANALYZING..." : "GENERATE SUMMARY"}
                  </button>
                </div>
                
                <div className="relative flex-1 min-h-[120px] bg-[var(--background)] rounded-lg border border-[var(--border)] p-4 overflow-y-auto leading-relaxed text-[var(--foreground)] scrollbar-thin">
                   {summaryText ? (
                     <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-strong:font-semibold">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>
                         {summaryText}
                       </ReactMarkdown>
                     </div>
                   ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)] opacity-60">
                       <div className="text-xs uppercase tracking-widest font-medium mb-1">No Analysis</div>
                       <div className="text-[10px]">Select keywords &gt; Generate Summary</div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Main Graph Card */}
        <div 
          className={graphCardClasses}
        >
          {/* Header Integration (Static, standard style) */}
          <div className="flex items-center justify-between gap-2 mb-4">
             {/* Title Group */}
             <div className="flex items-center gap-2">
                 <h3 className="text-sm font-semibold text-[var(--foreground)]">Keyword Correlation Mind Map</h3>
                 {isExpanded && (
                    <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full font-medium ml-2 border border-[var(--accent)]/20">
                      FOCUSED VIEW
                    </span>
                 )}
             </div>

             {/* Controls Group */}
             <div className="flex items-center gap-2">
                 {/* Export Button */}
                 {selected.length > 0 && (
                   <button
                     onClick={onExportPNG}
                     title="Export Map Image"
                     className="p-1.5 hover:bg-[var(--foreground)]/10 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-colors border border-transparent"
                   >
                     <Download className="w-4 h-4" />
                   </button>
                 )}

                 {/* Maximize/Minimize Toggle */}
                 <button
                   onClick={() => setIsExpanded(!isExpanded)}
                   className="p-1.5 hover:bg-[var(--foreground)]/10 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                   title={isExpanded ? "Minimize" : "Maximize"}
                 >
                   {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                 </button>
             </div>
          </div>

          {selected.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)]">
              <div className="w-16 h-16 mb-4 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center">
                 <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
              </div>
              <div className="font-medium text-sm tracking-wide uppercase">Visualization Empty</div>
              <div className="text-xs opacity-70 mt-1">Select keywords from the sidebar to generate graph</div>
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[400px] relative border border-[var(--border)]/50 rounded-lg overflow-hidden bg-[var(--background)]">
               <div ref={containerRef} className="absolute inset-0">
                 {dimensions.width > 0 && dimensions.height > 0 && (
                   <ForceGraph2D
                     ref={fgRef as React.RefObject<never>}
                     width={dimensions.width}
                     height={dimensions.height}
                     graphData={graph}
                     nodeRelSize={6}
                     cooldownTicks={140}
                     linkDirectionalParticles={0}
                     // Monochrome colors for graph
                     backgroundColor="rgba(0,0,0,0)"
                     linkColor={() => "rgba(120,120,120,0.3)"} 
                     linkWidth={handleLinkWidth as (link: object) => number}
                     nodeCanvasObject={handleNodeCanvas as (node: object, ctx: CanvasRenderingContext2D, scale: number) => void}
                     nodePointerAreaPaint={handleNodePointerArea as (node: object, color: string, ctx: CanvasRenderingContext2D) => void}
                     onNodeClick={handleNodeClick as (node: object, event: MouseEvent) => void}
                   />
                 )}
               </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
