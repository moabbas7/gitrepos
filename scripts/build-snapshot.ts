/**
 * Build-time data snapshot -> .data/site.json. Public pages are prerendered from this file, so a
 * page view never touches D1. Runs before `build:static` and `opennextjs-cloudflare build`
 * (hourly in CI). Logged to job_runs as "build-snapshot".
 *
 * Which repo pages exist is decided by jobs/lib/pages.ts (pinned → ranked → previously published
 * → fill, within the asset-file budget). Newly built repos get repos.first_published_at, so their
 * pages stay up after they leave the lists.
 *
 * D1 reads per run: candidates (all non-spam repos, 5 lean columns) + built repos + rankings +
 * topics + digests. Star history (90 days × built repos) and the 30-day ranking history change
 * once a day, so they're cached in .data/ (persisted between CI runs with actions/cache) and only
 * re-read when the latest ranking_history date changes.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getRepoHistory,
  getReposByIds,
  latestRankingHistoryDate,
  listDigests,
  listRankingHistory,
  listTopics,
  trackingSince,
} from "@/lib/db/public";
import { toSnapshotRepo } from "@/lib/site-data/snapshot-repo";
import type { DailyExport, SiteSnapshot } from "@/lib/site-data/types";
import { config } from "../jobs/lib/config";
import { main } from "../jobs/lib/job-run";
import { computePageSelection, markPublished } from "../jobs/lib/pages";

const OUT_DIR = ".data";
const HISTORY_DAYS = 90;
const EXPORT_DAYS = 30;

/** Reads `.data/<prefix>-<key>.json` if present, else computes it; drops older keys. */
async function dailyCache<T>(prefix: string, key: string, compute: (prev: T | null) => Promise<T>): Promise<T> {
  const path = join(OUT_DIR, `${prefix}-${key}.json`);
  const prev = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : null;
  const value = await compute(prev);
  for (const f of readdirSync(OUT_DIR)) if (f.startsWith(`${prefix}-`) && f.endsWith(".json") && f !== `${prefix}-${key}.json`) rmSync(join(OUT_DIR, f));
  writeFileSync(path, JSON.stringify(value));
  return value;
}

main("build-snapshot", async (ctx) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const db = ctx.db;
  mkdirSync(OUT_DIR, { recursive: true });

  const pages = await computePageSelection(db, now, { maxFiles: config.maxAssetFiles, maxPrebuilt: config.maxPrebuiltRepos });
  const { selection } = pages;
  const [rows, topics, digests, since, latest] = await Promise.all([
    getReposByIds(db, selection.build),
    listTopics(db, 300),
    listDigests(db),
    trackingSince(db),
    latestRankingHistoryDate(db),
  ]);
  const order = new Map(selection.build.map((id, i) => [id, i]));
  const repos = rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((r) => toSnapshotRepo(r, selection.reason.get(r.id)!, nowIso));

  // Star history: cached per ranking_history date; only fetch repos not already cached.
  const key = latest ?? "none";
  const sinceDate = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  let fetched = 0;
  const history = await dailyCache<SiteSnapshot["history"]>("history", key, async (prev) => {
    const h = prev ?? {};
    const missing = repos.map((r) => r.id).filter((id) => !h[id]);
    fetched = missing.length;
    for (const [id, pts] of await getRepoHistory(db, missing, sinceDate)) h[id] = pts;
    return h;
  });

  // CC0 export: last 30 days of the all-language Trending lists.
  const dailyExports = await dailyCache<DailyExport[]>("exports", key, async (prev) => {
    if (prev) return prev;
    const from = new Date(now.getTime() - EXPORT_DAYS * 86_400_000).toISOString().slice(0, 10);
    const byDate = new Map<string, DailyExport>();
    for (const r of await listRankingHistory(db, from)) {
      const d = byDate.get(r.date) ?? { date: r.date, rows: [] };
      d.rows.push({ period: r.period, rank: r.rank, repoId: r.repo_id, gained: r.gained });
      byDate.set(r.date, d);
    }
    return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  });

  // Record first publication (a few writes per hour; budget-checked, retried next build if skipped).
  const marked = await markPublished(db, selection.newlyPublished, nowIso, ctx.budget);
  if (marked < selection.newlyPublished.length) ctx.setStatus("partial");

  const keep = new Set(repos.map((r) => String(r.id)));
  const computed = pages.rankings.map((r) => r.computedAt).sort();
  const snapshot: SiteSnapshot = {
    version: 2,
    generatedAt: nowIso,
    trackingSince: since,
    rankingsComputedAt: computed.at(-1) ?? null,
    stats: {
      trackedRepos: pages.trackedRepos,
      builtRepos: repos.length,
      retiredRepos: selection.retired.length,
      rankedLists: pages.rankings.length,
      pageBudget: pages.budget,
    },
    rankings: pages.rankings,
    repos,
    topics,
    digests,
    history: Object.fromEntries(Object.entries(history).filter(([id]) => keep.has(id))),
    dailyExports,
  };
  writeFileSync(join(OUT_DIR, "site.json"), JSON.stringify(snapshot));

  const reasons: Record<string, number> = {};
  for (const r of repos) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  Object.assign(ctx.meta, {
    built: repos.length,
    reasons,
    retired: selection.retired.length,
    newlyPublished: selection.newlyPublished.length,
    marked,
    budget: pages.budget,
    lists: pages.rankings.length,
    historyKey: key,
    historyFetched: fetched,
  });
  ctx.setSource(ctx.jobDb.mode);
  ctx.log(
    `${repos.length} repo pages (${JSON.stringify(reasons)}), ${selection.retired.length} retired, budget ${pages.budget}, ` +
      `${pages.rankings.length} lists, ${topics.length} topics, ${digests.length} digests, history ${key} (${fetched} fetched)`,
  );
});
