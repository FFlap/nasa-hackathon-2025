// app/api/summarize/route.ts
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
    try {
        const { items, queryKeywords, userPrompt, history, modelName } = await req.json();

        if (!userPrompt || typeof userPrompt !== "string") {
            return Response.json({ ok: false, error: "Missing userPrompt" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return Response.json({ ok: false, error: "Missing GOOGLE_API_KEY" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        // ---- Build context from selected articles (if provided) ----
        // Keep it compact so the QUESTION stays central.
        const contextList: string[] = Array.isArray(items)
            ? items.slice(0, 25).map((it: any, idx: number) => {
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
        const contents: any[] = [];

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
        const model = modelName || "gemini-2.0-flash";
        const response = await ai.models.generateContent({
            model,
            systemInstruction,
            contents,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1200,
            },
        });

        // SDK returns a rich object; surface plain text back to the client
        const summary = (response as any)?.text ?? (response as any)?.output_text ?? "";
        return Response.json({ ok: true, summary });
    } catch (err: any) {
        return Response.json(
            { ok: false, error: err?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
