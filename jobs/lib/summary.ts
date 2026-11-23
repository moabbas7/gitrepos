/**
 * Original 2–3 sentence repo summaries (spec §3.2). Gemini free tier first; a deterministic
 * template if Gemini is unavailable, rate-limited or returns junk. Never throws.
 */
import { compactNumber } from "@/lib/format";
import { config } from "./config";

export interface SummaryInput {
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  gained7d: number;
  readmeExcerpt: string | null;
  createdAt: string | null;
}

export interface SummaryResult {
  text: string;
  source: "ai" | "template";
  /** Why AI wasn't used (for job logs). */
  fallbackReason?: string;
  /** True when the provider signalled a quota/rate limit — callers should stop calling it this run. */
  rateLimited?: boolean;
}

// ---------------------------------------------------------------------------
// README -> plain-text excerpt (stored in repos.readme_excerpt; rendered as text, so no XSS/links)
// ---------------------------------------------------------------------------

export function readmeToExcerpt(md: string, maxWords = 300): string {
  const text = md
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, " ") // linked badges
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/[*_`~>|]/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const words = text.split(/\s+/);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : text;
}

// ---------------------------------------------------------------------------
// Template fallback
// ---------------------------------------------------------------------------

export function templateSummary(r: SummaryInput, now = new Date()): string {
  const lang = r.language ? `${/^[AEIOU]/i.test(r.language) ? "an" : "a"} ${r.language}` : "an open-source";
  const desc = r.description?.trim().replace(/\s+/g, " ").replace(/\.*$/, "");
  const first = desc
    ? `${r.owner}/${r.name} is ${lang} project: ${desc.charAt(0).toLowerCase()}${desc.slice(1)}.`
    : `${r.owner}/${r.name} is ${lang} project on GitHub.`;
  const topics = r.topics.slice(0, 3);
  const second = topics.length
    ? `It is tagged ${topics.map((t) => `#${t}`).join(", ")}, so it should interest developers working on ${topics[0].replace(/-/g, " ")}.`
    : `It is worth a look for developers exploring ${r.language ?? "new"} tooling.`;
  const ageDays = r.createdAt ? (now.getTime() - Date.parse(r.createdAt)) / 86_400_000 : Infinity;
  const third =
    r.gained7d > 0
      ? `It has ${compactNumber(r.stars)} stars, ${compactNumber(r.gained7d)} of them gained in the last week${ageDays < 60 ? " since its recent launch" : ""}.`
      : `It has ${compactNumber(r.stars)} stars on GitHub.`;
  return `${first} ${second} ${third}`;
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const SYSTEM = [
  "You write short, original summaries of GitHub repositories for a developer discovery site.",
  "Write 2 or 3 plain sentences: what the project is, what problem it solves, and who it is for.",
  "Use your own words; do not copy sentences from the README. No marketing hype, no emojis,",
  "no markdown, no links, no star counts. Do not invent features that are not in the input.",
].join(" ");

function promptFor(r: SummaryInput): string {
  return [
    `Repository: ${r.owner}/${r.name}`,
    `Description: ${r.description ?? "(none)"}`,
    `Primary language: ${r.language ?? "(unknown)"}`,
    `Topics: ${r.topics.join(", ") || "(none)"}`,
    `README excerpt:\n${(r.readmeExcerpt ?? "(none)").slice(0, 2500)}`,
  ].join("\n");
}

/** Pulls text out of either the Interactions API or the generateContent response shape. */
export function extractText(json: unknown): string | null {
  const j = json as Record<string, unknown> | null;
  if (!j) return null;
  if (typeof j.output_text === "string") return j.output_text;
  const steps = j.steps as { content?: { text?: string }[] }[] | undefined;
  if (Array.isArray(steps) && steps.length) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const t = steps[i]?.content?.map((c) => c?.text ?? "").join("").trim();
      if (t) return t;
    }
  }
  const outputs = j.outputs as { text?: string }[] | undefined;
  if (Array.isArray(outputs)) {
    const t = outputs.map((o) => o?.text ?? "").join("").trim();
    if (t) return t;
  }
  const cands = j.candidates as { content?: { parts?: { text?: string; thought?: boolean }[] } }[] | undefined;
  if (Array.isArray(cands) && cands[0]?.content?.parts) {
    const t = cands[0].content.parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    if (t) return t;
  }
  return null;
}

/** Cleans model output; returns null if it doesn't look like a usable summary. */
export function cleanSummary(raw: string): string | null {
  let t = raw.replace(/[*_#`>]/g, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  const sentences = t.match(/[^.!?]+[.!?]+/g) ?? [t];
  t = sentences.slice(0, 3).map((x) => x.trim()).join(" ");
  if (t.length < 60 || t.length > 700) return null;
  return t;
}

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export async function geminiSummary(r: SummaryInput, opts: GeminiOptions = {}): Promise<SummaryResult> {
  const apiKey = opts.apiKey ?? config.geminiApiKey;
  const model = opts.model ?? config.geminiModel;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const fallback = (reason: string, rateLimited = false): SummaryResult => ({
    text: templateSummary(r),
    source: "template",
    fallbackReason: reason,
    rateLimited,
  });
  if (!apiKey) return fallback("no GEMINI_API_KEY");

  const headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };
  const attempts: { url: string; body: unknown }[] = [
    // Current docs: Interactions API.
    {
      url: "https://generativelanguage.googleapis.com/v1beta/interactions",
      body: {
        model,
        input: promptFor(r),
        system_instruction: SYSTEM,
        store: false,
        generation_config: { max_output_tokens: 1024 },
      },
    },
    // Long-standing generateContent endpoint.
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      body: {
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: promptFor(r) }] }],
        generationConfig: { maxOutputTokens: 1024 },
      },
    },
  ];

  let lastReason = "unknown";
  for (const a of attempts) {
    try {
      const res = await fetchImpl(a.url, { method: "POST", headers, body: JSON.stringify(a.body) });
      if (res.status === 429) return fallback("gemini 429 (rate/quota limited)", true);
      if (res.status === 404 || res.status === 400) {
        lastReason = `gemini HTTP ${res.status} at ${new URL(a.url).pathname}`;
        continue; // try the other API surface
      }
      if (!res.ok) return fallback(`gemini HTTP ${res.status}`);
      const text = extractText(await res.json());
      const clean = text ? cleanSummary(text) : null;
      if (!clean) return fallback("gemini returned no usable text");
      return { text: clean, source: "ai" };
    } catch (e) {
      lastReason = `gemini error: ${(e as Error).message}`;
    }
  }
  return fallback(lastReason);
}
