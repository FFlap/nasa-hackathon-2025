import React from "react";
import { Skeleton } from "./ui/Skeleton";

export function GhostAnalysisView() {
  return (
    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
      {/* Controls Column (Left) */}
      <section className="lg:col-span-2 space-y-4">
        {/* File Info Header Skeleton */}
        <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>

        {/* Keywords Section Skeleton */}
        <div className="p-5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center gap-2 mb-4">
             <Skeleton className="w-8 h-8 rounded-md" />
             <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mb-4" /> {/* Search input */}
          
          {/* Table Header */}
          <div className="flex justify-between mb-4 px-2">
             <Skeleton className="h-4 w-16" />
             <Skeleton className="h-4 w-16" />
             <Skeleton className="h-4 w-12" />
          </div>

          {/* Table Rows */}
          <div className="flex-1 space-y-3 overflow-hidden">
             {[...Array(12)].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-2">
                   <Skeleton className="h-4 w-40" />
                   <Skeleton className="h-4 w-12" />
                   <Skeleton className="h-6 w-12 rounded-md" />
                </div>
             ))}
          </div>
        </div>

        {/* Chat Section Skeleton */}
        <div className="card p-5 flex flex-col h-[600px]">
           <div className="flex items-center justify-between gap-2 mb-4">
             <div className="flex items-center gap-2">
               <Skeleton className="w-8 h-8 rounded-md" />
               <Skeleton className="h-4 w-40" />
             </div>
           </div>
           
           {/* Chat Area */}
           <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-4 space-y-4 mb-4">
              <div className="flex justify-start">
                 <Skeleton className="h-16 w-3/4 rounded-lg" />
              </div>
              <div className="flex justify-end">
                 <Skeleton className="h-12 w-1/2 rounded-lg" />
              </div>
               <div className="flex justify-start">
                 <Skeleton className="h-24 w-3/4 rounded-lg" />
              </div>
           </div>

           {/* Input Area */}
           <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-64" /> {/* Checkbox */}
              <div className="flex items-center gap-2">
                 <Skeleton className="h-10 flex-1 rounded-lg" />
                 <Skeleton className="h-10 w-20 rounded-lg" />
              </div>
           </div>
        </div>
      </section>

      {/* Graph Column (Right) */}
      <section className="lg:col-span-3 flex flex-col gap-4 h-full">
         {/* Histogram Skeleton */}
         <div className="card p-4 flex flex-col">
            <Skeleton className="h-4 w-48 mb-3" />
            <Skeleton className="h-[180px] w-full rounded-lg" />
         </div>

         {/* Summary Card Skeleton */}
         <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="h-4 w-24" />
               </div>
               <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="space-y-2">
               <Skeleton className="h-3 w-full" />
               <Skeleton className="h-3 w-5/6" />
               <Skeleton className="h-3 w-4/6" />
            </div>
         </div>

         {/* Main Graph Skeleton */}
         <div className="flex-1 card p-0 overflow-hidden relative min-h-[500px] flex flex-col">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
               <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
               <Skeleton className="h-8 w-8 rounded-md" />
               <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="w-full h-full" />
         </div>
      </section>
    </div>
  );
}
