// Type definitions for NASA Hackathon 2025 application

export type Row = Record<string, string | number | null | undefined>;

export type Article = {
  id: string;
  title: string;
  url?: string;
  text: string; // scraped text (or fallback)
  row: Row;
};

export type KeywordStat = {
  term: string;
  df: number;
  tfidf: number;
};

export type GraphNode = {
  id: string;
  type: "keyword" | "article";
  label: string;
  url?: string;
  hits?: number;
  x?: number;
  y?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  weight: number;
};

export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  usedArticles?: number;
};

export type HistogramDataItem = {
  term: string;
  count: number;
};

// API Response types
export interface ScrapeResponse {
  ok: boolean;
  title?: string;
  text?: string;
  error?: string;
}

export interface SummarizeResponse {
  ok: boolean;
  summary?: string;
  error?: string;
}

export interface SummarizeRequest {
  items: Array<{ title: string; url?: string; text: string }>;
  queryKeywords: string[];
  userPrompt: string;
  history?: ChatMsg[];
  modelName?: string;
}

// Force graph callback types
export interface ForceGraphNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface ForceGraphLink {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  weight: number;
}

// Tree mindmap types
export interface TreeNodeDatum {
  name: string;
  attributes?: {
    role?: "keyword" | "article";
    url?: string;
  };
  children?: TreeNodeDatum[];
}

export interface TreeNodeClickData {
  data?: TreeNodeDatum;
}

// D3 Force simulation node type - extends d3's SimulationNodeDatum
export interface SimulationNode {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  type?: "keyword" | "article";
  label?: string;
  hits?: number;
}

// Error helper type
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
