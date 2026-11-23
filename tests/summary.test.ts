import { describe, expect, it, vi } from "vitest";
import { cleanSummary, extractText, geminiSummary, readmeToExcerpt, templateSummary, type SummaryInput } from "../jobs/lib/summary";

const input: SummaryInput = {
  owner: "acme",
  name: "rocket",
  description: "A fast build tool for monorepos.",
  language: "Rust",
  topics: ["build-tool", "monorepo"],
  stars: 12_400,
  gained7d: 1800,
  readmeExcerpt: "Rocket builds monorepos quickly.",
  createdAt: "2026-01-01T00:00:00Z",
};

const AI_TEXT =
  "Rocket is a build system written in Rust that speeds up large monorepos by caching work across machines. It suits teams whose CI times have grown painful. Setup is a single config file.";

describe("template summary", () => {
  it("is deterministic, original and mentions language, topics and stars", () => {
    const t = templateSummary(input, new Date("2026-11-23T00:00:00Z"));
    expect(t).toContain("acme/rocket is a Rust project");
    expect(t).toContain("#build-tool");
    expect(t).toContain("12.4k stars");
    expect(t).toBe(templateSummary(input, new Date("2026-11-23T00:00:00Z")));
  });

  it("handles missing description/topics/language", () => {
    const t = templateSummary({ ...input, description: null, topics: [], language: null, gained7d: 0 });
    expect(t).toMatch(/^acme\/rocket is an open-source project on GitHub\./);
  });
});

describe("geminiSummary fallback", () => {
  it("uses the template when no API key is configured (and never calls the network)", async () => {
    const fetchImpl = vi.fn();
    const r = await geminiSummary(input, { apiKey: "", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.source).toBe("template");
    expect(r.fallbackReason).toBe("no GEMINI_API_KEY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("falls back and flags rate limiting on 429", async () => {
    const fetchImpl = async () => new Response("{}", { status: 429 });
    const r = await geminiSummary(input, { apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toMatchObject({ source: "template", rateLimited: true });
  });

  it("falls back on server errors and network failures", async () => {
    const r1 = await geminiSummary(input, { apiKey: "k", fetchImpl: (async () => new Response("", { status: 500 })) as unknown as typeof fetch });
    expect(r1.source).toBe("template");
    const r2 = await geminiSummary(input, {
      apiKey: "k",
      fetchImpl: (async () => {
        throw new Error("ETIMEDOUT");
      }) as unknown as typeof fetch,
    });
    expect(r2.source).toBe("template");
    expect(r2.fallbackReason).toContain("ETIMEDOUT");
  });

  it("uses the Interactions API response when available", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "x", steps: [{ content: [{ text: AI_TEXT }] }] })));
    const r = await geminiSummary(input, { apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r).toEqual({ text: AI_TEXT, source: "ai" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1beta/interactions");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
  });

  it("falls through to generateContent when the Interactions API is unavailable", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("interactions")
        ? new Response("", { status: 404 })
        : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: AI_TEXT }] } }] })),
    );
    const r = await geminiSummary(input, { apiKey: "k", model: "gemini-test", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.source).toBe("ai");
    expect(r.text).toBe(AI_TEXT);
    expect(fetchImpl.mock.calls[1][0]).toContain("/models/gemini-test:generateContent");
  });

  it("rejects junk output", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ steps: [{ content: [{ text: "ok" }] }] }));
    const r = await geminiSummary(input, { apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.source).toBe("template");
  });
});

describe("helpers", () => {
  it("extractText handles both response shapes", () => {
    expect(extractText({ output_text: "a" })).toBe("a");
    expect(extractText({ steps: [{ content: [{ text: "x" }] }, { content: [] }] })).toBe("x");
    expect(extractText({ candidates: [{ content: { parts: [{ text: "y" }] } }] })).toBe("y");
    expect(extractText({})).toBeNull();
  });

  it("cleanSummary strips markdown/links and keeps at most 3 sentences", () => {
    const t = cleanSummary(`**Rocket** builds things fast, see https://x.y. ${"It is great. ".repeat(5)}`)!;
    expect(t).not.toContain("**");
    expect(t).not.toContain("https://");
    expect(t.match(/\./g)!.length).toBeLessThanOrEqual(3);
  });

  it("readmeToExcerpt produces plain text without links, images, badges or HTML", () => {
    const md = `# Rocket\n\n[![CI](https://b/badge.svg)](https://ci) <img src="x.png"/>\n\nFast **builds** with [docs](https://docs).\n\n\`\`\`sh\nnpm i rocket\n\`\`\`\n\n- one\n- two`;
    const ex = readmeToExcerpt(md);
    expect(ex).toContain("Rocket");
    expect(ex).toContain("Fast builds with docs.");
    expect(ex).not.toMatch(/https?:|<img|\]\(|npm i/);
    expect(readmeToExcerpt("word ".repeat(400)).split(/\s+/).length).toBeLessThanOrEqual(301);
  });
});
