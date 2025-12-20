"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { RawNodeDatum } from "react-d3-tree";

const Tree = dynamic(() => import("react-d3-tree"), { ssr: false });

type GraphNode = { id: string; type: "keyword" | "article"; label: string; url?: string; hits?: number };
type GraphLink = { source: string | GraphNode; target: string | GraphNode; weight: number };

export default function TreeMindmap({
  nodes,
  links,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build: Root -> Keyword -> Article
  const treeData: RawNodeDatum = useMemo(() => {
    const kwNodes = nodes.filter(n => n.type === "keyword");
    const articleByKw: Record<string, GraphNode[]> = {};
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      const a = nodes.find(n => n.id === s) ?? nodes.find(n => n.id === t);
      const b = nodes.find(n => n.id === t) ?? nodes.find(n => n.id === s);
      const kw = [a, b].find(n => n?.type === "keyword");
      const art = [a, b].find(n => n?.type === "article");
      if (!kw || !art) continue;
      articleByKw[kw.id] ??= [];
      if (!articleByKw[kw.id].some(x => x.id === art.id)) articleByKw[kw.id].push(art);
    }

    return {
      name: "Topics",
      children: kwNodes.map(kw => ({
        name: kw.label,
        attributes: { role: "keyword" },
        children: (articleByKw[kw.id] || []).map(a => ({
          name: a.label,
          attributes: { role: "article", url: a.url || "" },
          children: [],
        })),
      })),
    };
  }, [nodes, links]);

  useEffect(() => {
    if (!containerRef.current) return;
    const { height } = containerRef.current.getBoundingClientRect();
    setTranslate({ x: 140, y: height / 2 });
  }, []);

  const renderNode = ({ nodeDatum }: any) => {
    const role = nodeDatum?.attributes?.role as ("keyword" | "article" | undefined);
    const isRoot = nodeDatum.name === "Topics";
    const fontSize = role === "keyword" ? 13 : 12;
    const text = nodeDatum.name as string;
    const w = Math.max(60, text.length * (fontSize * 0.62)) + 20;
    const h = fontSize + 12;
    const rx = 12;

    const style =
      isRoot
        ? { fill: "#111827", stroke: "#c7d2fe" }
        : role === "keyword"
          ? { fill: "#1f2937", stroke: "#93c5fd" }
          : { fill: "#0f766e", stroke: "#99f6e4" };

    return (
      <g>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} ry={rx}
          fill={style.fill} stroke={style.stroke} strokeWidth={1.2} />
        <text
          fill="#e5e7eb"
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={fontSize}
          style={{ pointerEvents: "none", fontFamily: "Inter, ui-sans-serif" }}
        >
          {nodeDatum.name}
        </text>
      </g>
    );
  };

  const handleNodeClick = (nodeData: any) => {
    const url = nodeData?.data?.attributes?.url as string | undefined;
    if (url && /^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div ref={containerRef} className="h-[75vh] w-full rounded-2xl border bg-[#0b1220] text-white">
      <Tree
        data={treeData}
        translate={translate}
        collapsible
        orientation="horizontal"
        separation={{ siblings: 1.1, nonSiblings: 1.25 }}
        renderCustomNodeElement={renderNode}
        pathFunc="elbow"
        styles={{ links: { stroke: "rgba(147,197,253,0.55)", strokeWidth: 1.6 } }}
        shouldCollapseNeighborNodes={false}
        onNodeClick={handleNodeClick}
        zoomable
        zoom={0.85}
        depthFactor={200}
      />
    </div>
  );
}
