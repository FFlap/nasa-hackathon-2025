"use client";

import React from "react";
interface HeaderProps {}

export function Header({}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">NASA Research Explorer</h1>
      </div>
    </header>
  );
}

