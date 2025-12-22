// Graph building and rendering utilities

import type { Article, GraphNode, GraphLink } from "@/app/types";

// Constants for pill rendering
export const PILL_PADDING_X = 9;
export const PILL_PADDING_Y = 4;

/**
 * Approximate text width based on font size
 */
export function approxTextWidth(label: string, fontPx: number): number {
  // quick width estimate: pixels per char ~ 0.6 * font
  return Math.max(10, label.length * (fontPx * 0.6));
}

/**
 * Calculate keyword pill rectangle dimensions
 */
export function keywordRect(label: string, fontPx: number): { w: number; h: number; r: number } {
  const textW = approxTextWidth(label, fontPx);
  const w = textW + PILL_PADDING_X * 2;
  const h = fontPx + PILL_PADDING_Y * 2;
  const r = Math.max(h, w) / 2; // generous collision radius
  return { w, h, r };
}

/**
 * Build a graph from articles and selected keywords
 */
export function buildGraph(
  articles: Article[],
  selected: string[],
  docTfs: Map<string, Map<string, number>>
): { nodes: GraphNode[]; links: GraphLink[] } {
  // Random position so nodes don't all start at (0,0)
  const randomPos = () => (Math.random() - 0.5) * 600;
  
  const keywordNodes: GraphNode[] = selected.map((t) => ({
    id: `k:${t}`,
    type: "keyword",
    label: t,
    x: randomPos(),
    y: randomPos(),
  }));
  
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
    
    if (hits > 0) {
      articleNodes.push({
        id: a.id,
        type: "article",
        label: a.title || a.id,
        url: a.url,
        hits,
        x: randomPos(),
        y: randomPos(),
      });
    }
  }
  
  return { nodes: [...keywordNodes, ...articleNodes], links };
}

/**
 * Draw a rounded rectangle on canvas
 */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke?: boolean
): void {
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
