"use client";

import React, { useRef } from "react";

// Components
import { Header } from "./components/Header";
import { CsvUploadSection } from "./components/CsvUploadSection";
import { KeywordsSection } from "./components/KeywordsSection";
import { GeminiChatSection } from "./components/GeminiChatSection";
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
    scraping,
    progress,
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

    const canvas = document.querySelector("canvas"); 
    
    if (!canvas) {
      console.error("Canvas element not found");
      alert("Could not find graph canvas to export.");
      return;
    }

    try {
      // Create a canvas with background color
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext("2d");
      
      if (ctx) {
        const computedStyle = getComputedStyle(document.body);
        const bg = computedStyle.backgroundColor || "#171717";
        
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw original canvas over it
        ctx.drawImage(canvas, 0, 0);
        
        const url = tempCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "nasas_research_map.png";
        a.click();
      } else {
        // Fallback if context creation fails
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "nasas_research_map.png";
        a.click();
      }
    } catch (err) {
      console.error("Export failed", err);
      // Last resort fallback
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "nasas_research_map_fallback.png";
      a.click();
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-[var(--primary)]/20">
      <Header />

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
        {/* Controls Column */}
        <section className="lg:col-span-2 space-y-4">
          {/* CSV Upload & Analysis Control */}
          <CsvUploadSection
            rowCount={rows.length}
            onFileLoaded={handleFileLoaded}
            onScrape={scrapeAll}
            scraping={scraping}
            progress={progress}
          />

          {/* Keywords */}
          {articles.length > 0 && (
            <KeywordsSection
              filteredRanked={filteredRanked}
              selected={selected}
              query={query}
              onQueryChange={setQuery}
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
        </section>

        {/* Graph Column */}
        <GraphSection
          selected={selected}
          articles={articles}
          docTfs={docTfs}
          graph={graph}
          histogramData={histogramData}
          fgRef={fgRef}
          onExportPNG={exportPNG}
        />
      </main>
    </div>
  );
}
