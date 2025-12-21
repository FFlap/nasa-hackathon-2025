"use client";

import React from "react";
interface HeaderProps {}

export function Header({}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">NASA Research Explorer</h1>
            <p className="text-xs text-[var(--muted)] font-medium tracking-wide uppercase">AI-Powered Analysis Tool</p>
          </div>
        </div>
      </div>
    </header>
  );
}
