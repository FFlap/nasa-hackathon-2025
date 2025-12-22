"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Components
import { Sidebar } from "./components/Sidebar";
import { CsvUploadSection } from "./components/CsvUploadSection";
import { KeywordsSection } from "./components/KeywordsSection";
import { GeminiChatSection } from "./components/GeminiChatSection";
import { GraphSection } from "./components/GraphSection";
import { GhostAnalysisView } from "./components/GhostAnalysisView";

// Hooks
import { useArticles } from "./hooks/useArticles";
import { useKeywords } from "./hooks/useKeywords";

// Types
import type { Row, ChatMsg } from "./types";

interface UserFile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ForceGraphMethods {
  d3Force: (name: string, force?: unknown) => unknown;
  d3ReheatSimulation: () => void;
  zoomToFit: (duration: number, padding: number) => void;
  canvas: () => HTMLCanvasElement;
}

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // File management state
  const [files, setFiles] = useState<UserFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [filesLoading, setFilesLoading] = useState(true);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false); // Prevent renders during file switch
  const isLoadingRef = useRef(false); // Prevent save during load
  
  // Pending file preview state for confirmation flow
  interface FilePreview {
    fileName: string;
    rows: Row[];
    columns: string[];
  }
  const [pendingFile, setPendingFile] = useState<FilePreview | null>(null);
  const [_analysisComplete, setAnalysisComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldStartAnalysis, setShouldStartAnalysis] = useState(false);

  // Article state and handlers
  const {
    rows,
    articles,
    scraping,
    progress,
    handleFileLoaded,
    scrapeAll,
    setRows,
    setArticles,
    resetProgress,
  } = useArticles();

  // Keyword state and handlers
  const {
    selected,
    query,
    docTfs,
    filteredRanked,
    graph,
    histogramData,
    setQuery,
    addKeyword,
    removeKeyword,
    resetKeywords,
    setSelected,
  } = useKeywords(articles);

  // Chat history state (for persistence)
  const [chatHistory, setChatHistory] = React.useState<ChatMsg[]>([]);

  // Graph ref for export
  const fgRef = useRef<ForceGraphMethods | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load user's files
  const loadFiles = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setFilesLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      loadFiles();
    }
  }, [session?.user?.id, loadFiles]);

  // Start analysis when rows are loaded and flag is set (but not when loading existing file)
  useEffect(() => {
    if (shouldStartAnalysis && rows.length > 0 && !isLoadingRef.current) {
      setShouldStartAnalysis(false);
      handleScrapeWithSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartAnalysis, rows.length]);

  // Load specific file
  async function loadFile(fileId: string) {
    // Prevent multiple simultaneous loads (spam clicking)
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true; // Prevent auto-save during load
    
    // Force synchronous state update and DOM repaint before heavy operations
    // Set activeFileId early so the ghost view condition (isFileLoading && activeFileId) is met
    flushSync(() => {
      setActiveFileId(fileId);
      setIsFileLoading(true);
    });
    
    // Clear all data first to ensure clean state during transition
    resetKeywords();
    setArticles([]);
    setRows([]);
    setChatHistory([]);
    
    try {
      const res = await fetch(`/api/files/${fileId}`);
      const data = await res.json();
      
      if (data.file) {
        // Parse CSV data and load
        const csvData = JSON.parse(data.file.csvData);
        if (csvData.rows) {
          setRows(csvData.rows);
        }
        if (csvData.articles) {
          setArticles(csvData.articles);
        }
        // Load saved keywords
        if (csvData.selectedKeywords) {
          setSelected(csvData.selectedKeywords);
        } else {
          resetKeywords();
        }
        // Load saved chat history
        if (csvData.chatHistory) {
          setChatHistory(csvData.chatHistory);
        } else {
          setChatHistory([]);
        }
      }
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      // Allow auto-save and rendering after a delay to let state settle
      setTimeout(() => { 
        isLoadingRef.current = false;
        setIsFileLoading(false);
      }, 200);
    }
  }

  // Create new file (reset state)
  function createNewFile() {
    setActiveFileId(null);
    setRows([]);
    setArticles([]);
    setPendingFile(null);
    setAnalysisComplete(false);
    setPendingFileName(null);
    setIsProcessing(false);
    resetProgress();
    resetKeywords();
    setChatHistory([]);
  }

  // Save current file
  async function saveCurrentFile(name: string, csvData: string) {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, csvData }),
      });
      
      const data = await res.json();
      if (data.file) {
        setActiveFileId(data.file.id);
        loadFiles();
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  }

  // Delete file
  async function deleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;

    try {
      await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      if (activeFileId === fileId) {
        createNewFile();
      }
      loadFiles();
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  }

  // Save chat history and current keywords with file
  async function saveChatHistory(chat: ChatMsg[]) {
    setChatHistory(chat); // Update local state
    
    if (!activeFileId) return;

    try {
      // Get current file data to merge with new chat/keywords
      const res = await fetch(`/api/files/${activeFileId}`);
      const data = await res.json();
      
      if (data.file) {
        const existingData = JSON.parse(data.file.csvData || '{}');
        const newData = {
          ...existingData,
          chatHistory: chat,
          selectedKeywords: selected,
        };
        
        await fetch(`/api/files/${activeFileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData: JSON.stringify(newData) }),
        });
      }
    } catch (error) {
      console.error("Failed to save chat:", error);
    }
  }

  // Keywords auto save
  useEffect(() => {

    if (!activeFileId || isFileLoading) return;
  
    const timer = setTimeout(() => {
      saveKeywordSelection();
    }, 1000);

    return () => clearTimeout(timer);
  }, [selected, activeFileId, isFileLoading]);

  // Save keyword selections to file (internal helper)
  async function saveKeywordSelection() {
    if (!activeFileId) return;

    try {
      const res = await fetch(`/api/files/${activeFileId}`);
      const data = await res.json();
      
      if (data.file) {
        const existingData = JSON.parse(data.file.csvData || '{}');
        
        // Check if actually different to minimize writes
        const currentSaved = JSON.stringify(existingData.selectedKeywords || []);
        const newSelection = JSON.stringify(selected);
        
        if (currentSaved === newSelection) return;

        const newData = {
          ...existingData,
          selectedKeywords: selected,
        };
        
        await fetch(`/api/files/${activeFileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData: JSON.stringify(newData) }),
        });
      }
    } catch (error) {
      console.error("Failed to save keywords:", error);
    }
  }

  // Extended file loaded handler - store filename for later save
  function handleFileLoadedWithSave(
    loadedRows: Row[],
    guessedTitle: string,
    guessedUrl: string
  ) {
    handleFileLoaded(loadedRows, guessedTitle, guessedUrl);
    setAnalysisComplete(false);
  }

  // Handle file preview for confirmation
  function handleFilePreview(preview: FilePreview | null) {
    setPendingFile(preview);
  }

  // Handle file confirmation - load file and start analysis
  async function handleConfirmFile() {
    if (!pendingFile) return;
    
    // Set processing state BEFORE clearing pendingFile to prevent home screen flash
    setIsProcessing(true);
    
    // Use original filename
    const fullName = pendingFile.fileName;
    setPendingFileName(fullName);
    
    const sample = pendingFile.rows[0] || {};
    const { guessTitleKey, guessUrlKey } = await import("./lib/columnHelpers");
    handleFileLoadedWithSave(pendingFile.rows, guessTitleKey(sample), guessUrlKey(sample));
    setPendingFile(null);
    
    // Flag to start analysis - will be picked up by useEffect when rows are updated
    setShouldStartAnalysis(true);
  }

  // Handle file cancel - clear pending file
  function handleCancelFile() {
    setPendingFile(null);
  }

  // Save file after analysis completes
  async function handleScrapeWithSave() {
    await scrapeAll(async (completedArticles) => {
      setAnalysisComplete(true);
      
      // Save new file after analysis completes
      if (pendingFileName && !activeFileId) {
        await saveCurrentFile(pendingFileName, JSON.stringify({ 
          rows, 
          articles: completedArticles 
        }));
        setPendingFileName(null);
      } else if (activeFileId) {
        // Update existing file
        try {
          await fetch(`/api/files/${activeFileId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              csvData: JSON.stringify({ rows, articles: completedArticles })
            }),
          });
        } catch (error) {
          console.error("Failed to update file:", error);
        }
      }
      
      // Set isProcessing to false AFTER file is saved and activeFileId is set
      setIsProcessing(false);
    });
  }

  // Export PNG
  function exportPNG() {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      alert("Could not find graph canvas to export.");
      return;
    }

    try {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        const computedStyle = getComputedStyle(document.body);
        const bg = computedStyle.backgroundColor || "#171717";
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);

        const url = tempCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "research_map.png";
        a.click();
      }
    } catch (err) {
      console.error("Export failed", err);
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  // Not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      {/* Sidebar */}
      <Sidebar
        files={files}
        activeFileId={activeFileId}
        onSelectFile={loadFile}
        onCreateFile={createNewFile}
        onDeleteFile={deleteFile}
        isLoading={filesLoading}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <main className="h-full overflow-y-auto">
          {/* Home View: Clean centered Data Import (no active file selected) */}
          {!activeFileId && !scraping && !isProcessing && progress.done === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                    Research Explorer
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    Upload a CSV file to analyze research publications
                  </p>
                </div>
                <CsvUploadSection
                  rowCount={rows.length}
                  onFileLoaded={handleFileLoadedWithSave}
                  onScrape={handleScrapeWithSave}
                  scraping={scraping}
                  progress={progress}
                  pendingFile={pendingFile}
                  onFilePreview={handleFilePreview}
                  onConfirmFile={handleConfirmFile}
                  onCancelFile={handleCancelFile}
                  activeFileName={pendingFileName}
                  analysisComplete={false}
                />
              </div>
            </div>
          ) : !activeFileId && (scraping || isProcessing || progress.done > 0) ? (
            /* Processing View: Show progress while analyzing */
            <div className="h-full flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                    Analyzing Research
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    Processing articles and extracting keywords...
                  </p>
                </div>
                <CsvUploadSection
                  rowCount={rows.length}
                  onFileLoaded={handleFileLoadedWithSave}
                  onScrape={handleScrapeWithSave}
                  scraping={scraping}
                  progress={progress}
                  pendingFile={null}
                  onFilePreview={handleFilePreview}
                  onConfirmFile={handleConfirmFile}
                  onCancelFile={handleCancelFile}
                  activeFileName={pendingFileName}
                  analysisComplete={false}
                />
              </div>
            </div>
          ) : isFileLoading ? (
            /* Ghost Loading View */
            <GhostAnalysisView />
          ) : (
            /* Analysis View: Full layout with file selected */
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
              {/* Controls Column */}
              <section className="lg:col-span-2 space-y-4">
                {/* File Info Header */}
                <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Analysis</h3>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">File</span>
                      <span className="text-[var(--foreground)] font-medium truncate max-w-[180px]" title={files.find(f => f.id === activeFileId)?.name}>
                        {(files.find(f => f.id === activeFileId)?.name || "Analysis").replace(/ - \d{1,2}\/\d{1,2}\/\d{4}.*$/, "")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Date Created</span>
                      <span className="text-[var(--foreground)] font-medium">
                        {files.find(f => f.id === activeFileId)?.createdAt 
                          ? new Date(files.find(f => f.id === activeFileId)!.createdAt).toLocaleDateString() 
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Records</span>
                      <span className="text-[var(--foreground)] font-medium">{rows.length}</span>
                    </div>
                  </div>
                </div>

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

                {articles.length > 0 && (
                  <GeminiChatSection
                    selected={selected}
                    articles={articles}
                    docTfs={docTfs}
                    onChatUpdate={saveChatHistory}
                    chatKey={activeFileId || 'new'}
                    initialChat={chatHistory}
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
