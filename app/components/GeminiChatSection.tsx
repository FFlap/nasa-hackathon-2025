"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Article, ChatMsg, SummarizeResponse } from "@/app/types";
import { getErrorMessage } from "@/app/types";

interface GeminiChatSectionProps {
  selected: string[];
  articles: Article[];
  docTfs: Map<string, Map<string, number>>;
  onChatUpdate?: (chat: ChatMsg[]) => void;
  chatKey?: string; // Used to reset chat when switching files
  initialChat?: ChatMsg[]; // Saved chat history to load
}

export function GeminiChatSection({
  selected,
  articles,
  docTfs,
  onChatUpdate,
  chatKey,
  initialChat = [],
}: GeminiChatSectionProps) {
  const [chat, setChat] = React.useState<ChatMsg[]>(initialChat);
  const [userInput, setUserInput] = React.useState("");
  const [includeSelectedArticles, setIncludeSelectedArticles] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const prevChatKeyRef = React.useRef<string | undefined>(chatKey);

  // Reset chat when chatKey changes (switching files) - load initialChat
  React.useEffect(() => {
    // Only reset if chatKey actually changed (not just on re-renders)
    if (chatKey !== prevChatKeyRef.current) {
      prevChatKeyRef.current = chatKey;
      setChat(initialChat);
      setUserInput("");
    }
  }, [chatKey, initialChat]);

  const relevantArticles = React.useMemo(() => {
    if (!selected.length) return [];
    return articles.filter((a) => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some((t) => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, sending, isExpanded]);

  // Persist chat changes
  React.useEffect(() => {
    if (chat.length > 0 && onChatUpdate) {
      onChatUpdate(chat);
    }
  }, [chat, onChatUpdate]);

  async function sendMessage() {
    const text = userInput.trim();
    if (!text || sending) return;
    setUserInput("");
    setSending(true);

    setChat((prev) => [...prev, { role: "user", content: text }]);

    try {
      const items = includeSelectedArticles
        ? relevantArticles.map((a) => ({
            title: a.title,
            url: a.url,
            text: (a.text || "").slice(0, 2000),
          }))
        : [];

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          queryKeywords: selected,
          userPrompt: text,
          history: chat,
        }),
      });

      const raw = await res.text();
      let data: SummarizeResponse | null = null;
      try {
        data = raw ? JSON.parse(raw) as SummarizeResponse : null;
      } catch {
        throw new Error(raw || `HTTP ${res.status} ${res.statusText}`);
      }

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(msg);
      }

      const assistantText = data.summary || "(No response)";
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: assistantText, usedArticles: items.length },
      ]);
    } catch (err: unknown) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: `**Error:** ${getErrorMessage(err)}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  const containerClasses = isExpanded
    ? "fixed inset-4 z-50 flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl p-6"
    : "card p-5 flex flex-col h-[600px]";

  const backdrop = isExpanded ? (
    <div 
      className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      onClick={() => setIsExpanded(false)}
    />
  ) : null;

  return (
    <>
      {backdrop}
      <div className={containerClasses}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[var(--foreground)]/5 text-[var(--foreground)]">
              <span className="font-bold text-xs">AI</span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Research Assistant</h3>
            {isExpanded && (
              <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded-full font-medium ml-2 border border-[var(--accent)]/20">
                FOCUSED VIEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
             <div className="text-xs text-[var(--muted)]">
                Articles: {relevantArticles.length}
             </div>
             <button
               onClick={() => setIsExpanded(!isExpanded)}
               className="p-1.5 hover:bg-[var(--foreground)]/10 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
               title={isExpanded ? "Minimize" : "Maximize"}
             >
               {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
             </button>
          </div>
        </div>

        {/* Chat history */}
        <div
          ref={scrollRef}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)]/50 p-4 overflow-auto space-y-4 mb-4"
        >
          {chat.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] text-center px-6">
              <p className="text-sm mb-1 font-medium text-[var(--foreground)]">Ready to assist</p>
              <p className="text-xs">Ask questions about your selected topics to gain cross-paper insights.</p>
            </div>
          )}

          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--foreground)]"
                }`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider font-semibold opacity-60">
                  {m.role === "user" ? "User" : "Gemini 2.0"}
                  {m.role === "assistant" && typeof m.usedArticles === "number" && (
                    <span className="ml-2 opacity-100 font-mono">
                      [{m.usedArticles} REFS]
                    </span>
                  )}
                </div>

                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-code:text-[11px] prose-code:bg-[var(--foreground)]/10 prose-code:px-1 prose-code:rounded">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] select-none cursor-pointer hover:text-[var(--foreground)] transition-colors">
            <input
              type="checkbox"
              className="rounded border-[var(--border)] bg-[var(--card-bg)] accent-[var(--foreground)] w-3.5 h-3.5"
              checked={includeSelectedArticles}
              onChange={(e) => setIncludeSelectedArticles(e.target.checked)}
            />
            Include {relevantArticles.length} selected articles in context
          </label>
          
          <div className="flex items-center gap-2">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your query..."
              className="flex-1 input-base bg-[var(--card-bg)] py-2.5"
              autoFocus={isExpanded}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !userInput.trim()}
              className="btn-primary py-2.5 px-5 disabled:opacity-50 shadow-sm"
            >
              {sending ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
