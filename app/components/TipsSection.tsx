"use client";

import React from "react";
import { Search } from "lucide-react";

export function TipsSection() {
  return (
    <div className="p-4 rounded-2xl border bg-emerald-50/60 dark:bg-emerald-950/20 text-sm space-y-2">
      <div className="font-medium flex items-center gap-2">
        <Search className="w-4 h-4" /> Tips
      </div>
      <ul className="list-disc pl-5 space-y-1 text-emerald-900 dark:text-emerald-200">
        <li>Upload a CSV file with article titles and URLs to begin analysis.</li>
        <li>Scrape the URLs to extract abstracts and text for keyword generation.</li>
        <li>Use the keyword table to add or remove topics for your mind map.</li>
        <li>
          Explore the mind map by dragging or zooming to view relationships
          between topics and articles.
        </li>
        <li>
          Use the Gemini chat to ask questions about selected topics and view
          AI-generated insights.
        </li>
        <li>
          Export the mind map as a PNG image to include in reports or
          presentations.
        </li>
      </ul>
    </div>
  );
}
