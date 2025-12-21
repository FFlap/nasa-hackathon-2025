"use client";

import React, { useRef } from "react";

// Components
import { Header } from "./components/Header";
import { CsvUploadSection } from "./components/CsvUploadSection";
import { ColumnMappingSection } from "./components/ColumnMappingSection";
import { KeywordsSection } from "./components/KeywordsSection";
import { GeminiChatSection } from "./components/GeminiChatSection";
import { TipsSection } from "./components/TipsSection";
import { GraphSection } from "./components/GraphSection";

// Hooks
import { useArticles } from "./hooks/useArticles";
import { useKeywords } from "./hooks/useKeywords";

// ForceGraph2D ref type
interface ForceGraphMethods {
  d3Force: (name: string, force?: unknown) => unknown;
  d3ReheatSimulation: () => void;
  zoomToFit: (duration: number, padding: number) => void;
  canvas: () => HTMLCanvasElement;
}

export default function Page() {
  // Article state and handlers
  const {
    rows,
    articles,
    colTitle,
    colUrl,
    scraping,
    progress,
    setColTitle,
    setColUrl,
    handleFileLoaded,
    scrapeAll,
  } = useArticles();

  // Keyword state and handlers
  const {
    selected,
    query,
    maxTerms,
    docTfs,
    filteredRanked,
    graph,
    histogramData,
    setQuery,
    setMaxTerms,
    addKeyword,
    removeKeyword,
  } = useKeywords(articles);

  // Graph ref for export and force configuration
  const fgRef = useRef<ForceGraphMethods | null>(null);

  // Export PNG
  function exportPNG() {
    if (!fgRef.current) return;
    const canvas: HTMLCanvasElement = fgRef.current.canvas();
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.png";
    a.click();
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50">
      <Header onExportPNG={exportPNG} />

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-4 p-4">
        {/* Controls Column */}
        <section className="lg:col-span-2 space-y-4">
          {/* CSV Upload */}
          <CsvUploadSection
            rowCount={rows.length}
            onFileLoaded={handleFileLoaded}
          />

          {/* Column Mapping */}
          {rows.length > 0 && (
            <ColumnMappingSection
              rows={rows}
              colTitle={colTitle}
              colUrl={colUrl}
              onColTitleChange={setColTitle}
              onColUrlChange={setColUrl}
              onScrape={scrapeAll}
              scraping={scraping}
              progress={progress}
            />
          )}

          {/* Keywords */}
          {articles.length > 0 && (
            <KeywordsSection
              filteredRanked={filteredRanked}
              selected={selected}
              query={query}
              maxTerms={maxTerms}
              onQueryChange={setQuery}
              onMaxTermsChange={setMaxTerms}
              onAddKeyword={addKeyword}
              onRemoveKeyword={removeKeyword}
            />
          )}

          {/* Gemini Chat */}
          {articles.length > 0 && (
            <GeminiChatSection
              selected={selected}
              articles={articles}
              docTfs={docTfs}
            />
          )}

          {/* Tips */}
          <TipsSection />
        </section>

        {/* Graph Column */}
        <GraphSection
          selected={selected}
          articles={articles}
          docTfs={docTfs}
          graph={graph}
          histogramData={histogramData}
          fgRef={fgRef}
        />
      </main>
    </div>
  );
}
