// app/api/summarize/route.ts
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ChatMsg, SummarizeResponse, SummarizeRequest } from "@/app/types";
import { getErrorMessage } from "@/app/types";

export const dynamic = "force-dynamic";

// Gemini content types
interface GeminiContent {
    role: "user" | "model";
    parts: Array<{ text: string }>;
}

interface GeminiResponse {
    text?: string;
    output_text?: string;
}

interface ArticleItem {
    title?: string;
    url?: string;
    text?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
    try {
        const body = await req.json() as Partial<SummarizeRequest>;
        const { items, queryKeywords, userPrompt, history, modelName } = body;

        if (!userPrompt || typeof userPrompt !== "string") {
            const response: SummarizeResponse = { ok: false, error: "Missing userPrompt" };
            return Response.json(response, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            const response: SummarizeResponse = { ok: false, error: "Missing GOOGLE_API_KEY" };
            return Response.json(response, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        // ---- Build context from selected articles (if provided) ----
        // Keep it compact so the QUESTION stays central.
        const contextList: string[] = Array.isArray(items)
            ? items.slice(0, 25).map((it: ArticleItem, idx: number) => {
                const title = (it?.title || "").toString().slice(0, 160);
                const url = (it?.url || "").toString().slice(0, 300);
                const text = (it?.text || "").toString().replace(/\s+/g, " ").slice(0, 1400);
                return `• ${idx + 1}. ${title}${url ? ` (${url})` : ""}\n   Excerpt: ${text}`;
            })
            : [];

        const contextBlock =
            contextList.length > 0
                ? `\n\nContext from ${contextList.length} selected articles:\n${contextList.join("\n")}\n\nUse this context to answer the question.`
                : "";

        const keywords = Array.isArray(queryKeywords) && queryKeywords.length
            ? `\n\nSelected keywords: ${queryKeywords.join(", ")}.`
            : "";

        // ---- System instruction to make the QUESTION primary ----
        const systemInstruction =
            "You are an expert research assistant. Answer the USER'S QUESTION directly and concisely first. " +
            "Then give brief evidence-based details referencing the provided article context where relevant. " +
            "If the answer is uncertain, say so and suggest what would clarify it. Use Markdown.";

        // ---- Turn chat history into Gemini format ----
        const contents: GeminiContent[] = [];

        // Convert prior turns (if any)
        if (Array.isArray(history)) {
            for (const m of history as ChatMsg[]) {
                if (!m?.content) continue;
                const role = m.role === "assistant" ? "model" : "user";
                contents.push({ role, parts: [{ text: m.content.toString() }] });
            }
        }

        // Current turn: put the USER QUESTION last (Gemini replies to the last user turn)
        const finalUserMsg =
            `QUESTION: ${userPrompt.trim()}\n${keywords}${contextBlock}\n\n` +
            "Please answer the question above. Start with a direct answer in 1–3 sentences. " +
            "Then add arepresentative citations with links to the provided article context (if used).";

        contents.push({ role: "user", parts: [{ text: finalUserMsg }] });

        // ---- Call Gemini ----
        const model = modelName || "gemini-2.5-flash-lite";
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                temperature: 0.3,
                maxOutputTokens: 1200,
            },
        });

        // SDK returns a rich object; surface plain text back to the client
        const geminiResponse = response as GeminiResponse;
        const summary = geminiResponse?.text ?? geminiResponse?.output_text ?? "";
        const result: SummarizeResponse = { ok: true, summary };
        return Response.json(result);
    } catch (err: unknown) {
        const errorMsg = getErrorMessage(err);
        
        // Log full error for debugging
        console.error("[Gemini API Error]", errorMsg);
        
        // Check for common API errors and provide helpful messages
        let userMessage = errorMsg;
        let status = 500;
        
        if (errorMsg.includes("429") || (errorMsg.toLowerCase().includes("quota") && errorMsg.toLowerCase().includes("exceeded"))) {
            userMessage = `API quota exceeded. Raw error: ${errorMsg}`;
            status = 429;
        } else if (errorMsg.includes("401") || errorMsg.toLowerCase().includes("invalid api key")) {
            userMessage = `Invalid API key. Raw error: ${errorMsg}`;
            status = 401;
        } else if (errorMsg.includes("503") || errorMsg.toLowerCase().includes("unavailable")) {
            userMessage = `Gemini API unavailable. Raw error: ${errorMsg}`;
            status = 503;
        } else if (errorMsg.includes("400") || errorMsg.toLowerCase().includes("bad request")) {
            userMessage = `Bad request. Raw error: ${errorMsg}`;
            status = 400;
        }
        
        const response: SummarizeResponse = { ok: false, error: userMessage };
        return Response.json(response, { status });
    }
}
