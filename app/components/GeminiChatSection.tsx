"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Article, ChatMsg, SummarizeResponse } from "@/app/types";
import { getErrorMessage } from "@/app/types";

interface GeminiChatSectionProps {
  selected: string[];
  articles: Article[];
  docTfs: Map<string, Map<string, number>>;
}

export function GeminiChatSection({
  selected,
  articles,
  docTfs,
}: GeminiChatSectionProps) {
  const [chat, setChat] = React.useState<ChatMsg[]>([]);
  const [userInput, setUserInput] = React.useState("");
  const [includeSelectedArticles, setIncludeSelectedArticles] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Relevant articles (match any selected keyword)
  const relevantArticles = React.useMemo(() => {
    if (!selected.length) return [];
    return articles.filter((a) => {
      const tf = docTfs.get(a.id);
      if (!tf) return false;
      return selected.some((t) => tf.has(t));
    });
  }, [articles, docTfs, selected]);

  // Auto-scroll to bottom on new message
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, sending]);

  async function sendMessage() {
    const text = userInput.trim();
    if (!text || sending) return;
    setUserInput("");
    setSending(true);

    // Optimistic user message
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

  return (
    <div className="p-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-medium">
          <span>Gemini Chat</span>
        </div>
        <div className="text-xs text-zinc-500">
          {selected.length} keyword{selected.length === 1 ? "" : "s"} ·{" "}
          {relevantArticles.length} matching article
          {relevantArticles.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Chat history */}
      <div
        ref={scrollRef}
        className="rounded-xl border bg-white dark:bg-zinc-950 p-3 max-h-72 overflow-auto space-y-3"
      >
        {chat.length === 0 && (
          <div className="text-sm text-zinc-500">
            Ask a question about your selected topics. Toggle &quot;Use selected
            articles&quot; to include context when sending.
          </div>
        )}

        {chat.map((m, i) => (
          <div
            key={i}
            className={`text-sm flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <div className="mb-1 text-[11px] opacity-80">
                {m.role === "user" ? "You" : "Gemini"}{" "}
                {m.role === "assistant" && typeof m.usedArticles === "number" && (
                  <span className="opacity-70">
                    · {m.usedArticles} article{m.usedArticles === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
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
      <div className="mt-3 flex items-center gap-2">
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask Gemini about the selected topics…"
          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !userInput.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Ask Gemini"}
        </button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 select-none">
        <input
          type="checkbox"
          className="rounded"
          checked={includeSelectedArticles}
          onChange={(e) => setIncludeSelectedArticles(e.target.checked)}
        />
        Use selected articles ({relevantArticles.length} will be included as
        context)
      </label>
    </div>
  );
}
