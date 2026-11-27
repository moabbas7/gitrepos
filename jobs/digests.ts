/**
 * digests (daily, after snapshot): builds the weekly digest for the last complete ISO week and
 * the monthly digest for the last complete month, if they don't exist yet. Idempotent, so a
 * missed day is caught up on the next run. Skips periods that tracking didn't fully cover (early
 * days) rather than publishing a misleading digest.
 * Intro: Gemini (free tier) with an original data-driven template fallback. Never fails on AI errors.
 */
import { getReposByIds, getRepoHistory, parseJsonArray, trackingSince, type RepoRow } from "@/lib/db/public";
import type { RepoCardData } from "@/lib/types";
import { config } from "./lib/config";
import {
  cleanIntro,
  DIGEST_SYSTEM,
  digestPrompt,
  digestTitle,
  lastCompletePeriods,
  periodCovered,
  pickDigestRows,
  templateIntro,
  type DigestPeriod,
  type HistoryRow,
} from "./lib/digest";
import { main } from "./lib/job-run";
import { geminiText } from "./lib/summary";

function toCard(r: RepoRow, h: HistoryRow, spark: number[], period: DigestPeriod): RepoCardData {
  return {
    id: r.id,
    owner: r.owner,
    name: r.name,
    description: r.description,
    language: r.language,
    topics: parseJsonArray<string>(r.topics).slice(0, 4),
    stars: r.stars,
    forks: r.forks,
    avatarUrl: r.avatar_url ?? `https://github.com/${r.owner}.png?size=64`,
    createdAt: r.created_at ?? "",
    gained: h.gained,
    spark,
    rank: h.rank,
    isNew: (r.created_at && r.created_at.slice(0, 4) === period.end.slice(0, 4)) || undefined,
  };
}

main("digests", async (ctx) => {
  const now = new Date();
  const since = await trackingSince(ctx.db);
  const { weekly, monthly } = lastCompletePeriods(now);
  const built: string[] = [];
  const skipped: Record<string, string> = {};
  let ai = 0;

  for (const p of [weekly, monthly]) {
    const id = `${p.kind}-${p.key}`;
    if (await ctx.db.first("SELECT id FROM digests WHERE id = ?", [id])) {
      skipped[id] = "exists";
      continue;
    }
    if (!periodCovered(p, since)) {
      skipped[id] = `tracking began ${since ?? "never"}; period not fully covered`;
      continue;
    }
    const rows = pickDigestRows(
      await ctx.db.all<HistoryRow>(
        "SELECT date, rank, repo_id, gained FROM ranking_history WHERE date >= ? AND date <= ? AND list_type = 'trending' AND period = ?",
        [p.start, p.end, p.kind === "weekly" ? "week" : "month"],
      ),
      p,
    );
    if (!rows.length) {
      skipped[id] = "no ranking history in period";
      continue;
    }
    const repos = new Map((await getReposByIds(ctx.db, rows.map((r) => r.repo_id))).map((r) => [r.id, r]));
    const sparkFrom = new Date(Date.parse(`${p.end}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    const hist = await getRepoHistory(ctx.db, [...repos.keys()], sparkFrom);
    const items = rows
      .filter((h) => repos.has(h.repo_id))
      .map((h) => toCard(repos.get(h.repo_id)!, h, (hist.get(h.repo_id) ?? []).filter(([d]) => d <= p.end).map(([, g]) => g), p))
      .map((c, i) => ({ ...c, rank: i + 1 }));

    let intro = templateIntro(p, items);
    if (config.geminiApiKey && items.length) {
      const res = await geminiText(DIGEST_SYSTEM, digestPrompt(p, items));
      const clean = res.text ? cleanIntro(res.text) : null;
      if (clean) {
        intro = clean;
        ai++;
      } else ctx.log(`intro for ${id}: template (${res.reason ?? "unusable AI text"})`);
    }

    ctx.budget.check(1);
    await ctx.db.run(
      "INSERT INTO digests (id, kind, period_key, title, intro, payload, published_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
      [id, p.kind, p.key, digestTitle(p), intro, JSON.stringify(items), now.toISOString()],
    );
    built.push(id);
  }

  Object.assign(ctx.meta, { built, skipped, ai, trackingSince: since });
  ctx.setSource(ai ? "gemini" : "template");
  ctx.log(`built ${built.join(", ") || "none"}; skipped ${JSON.stringify(skipped)}`);
});
