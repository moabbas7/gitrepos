/**
 * summaries (daily): original 2–3 sentence summaries for top repos.
 *  - AI pass: up to SUMMARY_LIMIT repos without an AI summary (top-ranked first) via Gemini's free
 *    tier, paced conservatively; on 429 the rest of the run uses templates.
 *  - Template pass: every other published repo without any summary gets a template one, so every
 *    repo page has original text. Template summaries are retried with AI after 7 days.
 * Never fails the job on summary errors.
 */
import { parseJsonArray } from "@/lib/db/public";
import type { Statement } from "@/lib/db/types";
import { config } from "./lib/config";
import { main } from "./lib/job-run";
import { geminiSummary, templateSummary, type SummaryInput } from "./lib/summary";
import { DAY_MS } from "./lib/time";

interface Row {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string;
  stars: number;
  gained_7d: number;
  readme_excerpt: string | null;
  created_at: string | null;
}

const toInput = (r: Row): SummaryInput => ({
  owner: r.owner,
  name: r.name,
  description: r.description,
  language: r.language,
  topics: parseJsonArray<string>(r.topics),
  stars: r.stars,
  gained7d: r.gained_7d,
  readmeExcerpt: r.readme_excerpt,
  createdAt: r.created_at,
});

const PACE_MS = Number(process.env.GEMINI_PACE_MS ?? 4500); // ~13 requests/min, under free-tier RPM

main("summaries", async (ctx) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const cols = "id, owner, name, description, language, topics, stars, gained_7d, readme_excerpt, created_at";
  const aiQueue = await ctx.db.all<Row>(
    `SELECT ${cols} FROM repos
     WHERE is_spam = 0 AND (summary IS NULL OR (summary_source = 'template' AND (summary_at IS NULL OR summary_at < ?)))
     ORDER BY (rank_today IS NULL), rank_today, gained_7d DESC LIMIT ?`,
    [new Date(now.getTime() - 7 * DAY_MS).toISOString(), config.summaryLimit],
  );

  const updates: Statement[] = [];
  let ai = 0;
  let template = 0;
  let rateLimited = false;
  const reasons: Record<string, number> = {};
  for (const r of aiQueue) {
    let res;
    if (rateLimited || !config.geminiApiKey) {
      res = { text: templateSummary(toInput(r), now), source: "template" as const, fallbackReason: rateLimited ? "rate limited earlier" : "no key" };
    } else {
      res = await geminiSummary(toInput(r));
      if (res.rateLimited) rateLimited = true;
      await new Promise((ok) => setTimeout(ok, PACE_MS));
    }
    if (res.source === "ai") ai++;
    else {
      template++;
      if (res.fallbackReason) reasons[res.fallbackReason] = (reasons[res.fallbackReason] ?? 0) + 1;
    }
    updates.push({
      sql: "UPDATE repos SET summary = ?, summary_source = ?, summary_at = ? WHERE id = ?",
      params: [res.text, res.source, nowIso, r.id],
    });
  }

  // Template pass for everything else that has no summary at all.
  const aiIds = new Set(aiQueue.map((r) => r.id));
  const rest = (
    await ctx.db.all<Row>(`SELECT ${cols} FROM repos WHERE is_spam = 0 AND summary IS NULL ORDER BY gained_7d DESC LIMIT 600`)
  ).filter((r) => !aiIds.has(r.id));
  for (const r of rest) {
    template++;
    updates.push({
      sql: "UPDATE repos SET summary = ?, summary_source = 'template', summary_at = ? WHERE id = ?",
      params: [templateSummary(toInput(r), now), nowIso, r.id],
    });
  }

  if (ctx.budget.canAfford(updates.length * 2)) await ctx.db.batch(updates);
  else {
    ctx.setStatus("throttled");
    ctx.log("write budget too low — summaries computed but not stored this run");
  }
  Object.assign(ctx.meta, { ai, template, rateLimited, fallbackReasons: reasons, model: config.geminiModel });
  ctx.setSource(ai ? "gemini" : "template");
  if (rateLimited) ctx.setStatus("partial");
});
