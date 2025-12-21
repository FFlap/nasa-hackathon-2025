import * as cheerio from "cheerio";
import { getErrorMessage } from "@/app/types";
import type { ScrapeResponse } from "@/app/types";

export const dynamic = "force-dynamic"; // ensure runtime on server

export async function POST(req: Request): Promise<Response> {
    try {
        const { url } = await req.json() as { url: unknown };
        if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
            const response: ScrapeResponse = { ok: false, error: "Invalid URL" };
            return Response.json(response, { status: 400 });
        }

        // Fetch HTML on the server (avoids CORS)
        const res = await fetch(url, {
            headers: {
                "user-agent":
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
                accept: "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });

        if (!res.ok) {
            const response: ScrapeResponse = { ok: false, error: `Fetch ${res.status}` };
            return Response.json(response, { status: 502 });
        }

        // Require HTML-ish content
        const ct = res.headers.get("content-type") || "";
        if (!/text\/html|application\/xhtml\+xml/i.test(ct)) {
            const response: ScrapeResponse = { ok: false, error: "Not an HTML page" };
            return Response.json(response, { status: 415 });
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        // Remove noise
        $("script,noscript,style,svg,header,footer,nav,form,aside").remove();

        // Prefer article/main, fallback to body paragraphs
        const main =
            $("article").first().text() ||
            $("main").first().text() ||
            $("body")
                .find("p")
                .map((_, el) => $(el).text())
                .get()
                .join("\n");

        // Basic clean
        const text = clean(main).slice(0, 200_000); // cap to 200k chars for safety
        const title =
            $('meta[property="og:title"]').attr("content") ||
            $("title").first().text() ||
            $("h1").first().text();

        const response: ScrapeResponse = { ok: true, title: trim(title), text: trim(text) };
        return Response.json(response);
    } catch (err: unknown) {
        const response: ScrapeResponse = { ok: false, error: getErrorMessage(err) };
        return Response.json(response, { status: 500 });
    }
}

function clean(s: string): string {
    return s
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "");
}

function trim(s?: string): string {
    return (s || "").trim();
}
