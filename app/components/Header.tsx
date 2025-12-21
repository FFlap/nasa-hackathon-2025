"use client";

import React from "react";
import { Download } from "lucide-react";

interface HeaderProps {
  onExportPNG: () => void;
}

export function Header({ onExportPNG }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-black/50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600" />
          <div>
            <div className="font-semibold">NASA Hackathon 2025</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportPNG}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black text-sm hover:opacity-90"
          >
            <Download className="w-4 h-4" /> Export PNG
          </button>
        </div>
      </div>
    </header>
  );
}
