/**
 * rank (hourly, after ingest):
 *  1. Measure: fresh star counts (GraphQL, 100/query) for the top movers and for repos the GH
 *     Archive sample says are getting attention. Each fetch adds a star-history point.
 *  2. If GH Archive is stale (> FALLBACK_AFTER_HOURS), discover repos via GitHub Search instead.
 *  3. Rank Today / Week / Month × Trending / Rising / New for 'all' + top languages, from real gains.
 *  4. Upsert one D1 row per list (JSON payload); insert newly ranked repos into `repos`.
 * Never wipes: with no data, or an empty main list, existing rankings are left untouched.
 */
import type { Statement } from "@/lib/db/types";
import { config } from "./lib/config";
import { DataStore } from "./lib/data-store";
import { discoverViaSearch } from "./lib/discovery";
import { loadMeta, loadStars, saveMeta, saveStars } from "./lib/files";
import { GitHub } from "./lib/github";
import { main } from "./lib/job-run";
import { fitPayload } from "./lib/payload";
import { archiveLagHours, buildCandidates, fetchAndRecord, gainsFor, isStale, loadSample } from "./lib/pipeline";
import { DEFAULT_RANK_CONFIG, rankAll } from "./lib/rank-core";
import { syncRepos } from "./lib/repo-sync";
import { topSampled } from "./lib/windows";

const HOURLY_TOP_MOVERS = 800;
const HOURLY_SAMPLE_NEW = 400;

main("rank", async (ctx) => {
  const now = new Date();
  const store = new DataStore();
  const cache = loadMeta(store);
  const hist = loadStars(store);
  const sample = loadSample(store, now, 24);
  const gh = new GitHub({ log: ctx.log });

  // 1. Measure top movers (by last known gains) + sampled repos not measured in the last hour.
  const before = gainsFor(hist, cache, now);
  const movers = [...before.values()]
    .sort((a, b) => b.gains.today - a.gains.today || b.gains.week - a.gains.week)
    .slice(0, HOURLY_TOP_MOVERS)
    .map((g) => g.id);
  const sampled = topSampled(sample, HOURLY_SAMPLE_NEW * 2).filter((id) => isStale(cache[id], now, 1)).slice(0, HOURLY_SAMPLE_NEW);
  const toFetch = [...new Set([...movers, ...sampled])].filter((id) => isStale(cache[id], now, 0.75));
  const fetched = await fetchAndRecord(gh, cache, hist, sample, toFetch, now);

  // 2. Fallback discovery when GH Archive is behind.
  const lag = archiveLagHours(store, now);
  let discovery = null;
  if (lag > config.fallbackAfterHours && gh.enabled) discovery = await discoverViaSearch(gh, cache, hist, now);

  if (fetched || discovery) {
    saveMeta(store, cache);
    saveStars(store, hist);
  }

  // 3. Rank
  const gained = gainsFor(hist, cache, now);
  const cands = buildCandidates(gained, cache);
  const lists = rankAll(cands, now, DEFAULT_RANK_CONFIG);
  const primary = lists.find((l) => l.listType === "trending" && l.period === "today" && l.language === "all");
  Object.assign(ctx.meta, {
    measured: fetched,
    tracked: Object.keys(hist).length,
    candidates: cands.length,
    archiveLagHours: Number.isFinite(lag) ? Math.round(lag * 10) / 10 : null,
    discovery,
    githubPoints: gh.pointsUsed,
  });
  if (!primary?.items.length) {
    ctx.setStatus(gh.enabled ? "partial" : "skipped");
    ctx.log(`no rankable candidates yet (tracked=${Object.keys(hist).length}) — keeping existing rankings`);
    return;
  }

  // 4. Write
  const source = discovery ? "search" : "gharchive";
  const computedAt = now.toISOString();
  const stmts: Statement[] = lists.map((l) => {
    const { json, count } = fitPayload(l);
    return {
      sql: `INSERT INTO rankings (list_type, period, language, payload, item_count, source, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (list_type, period, language) DO UPDATE SET
              payload = excluded.payload, item_count = excluded.item_count,
              source = excluded.source, computed_at = excluded.computed_at`,
      params: [l.listType, l.period, l.language, json, count, source, computedAt],
    };
  });
  await ctx.db.batch(stmts);

  const rankToday = new Map(primary.items.map((i) => [i.id, i.rank]));
  const byId = new Map(cands.map((c) => [c.meta.id, c]));
  const rankedIds = [...new Set(lists.flatMap((l) => l.items.map((i) => i.id)))];
  const sync = await syncRepos(
    ctx.db,
    rankedIds.map((id) => ({ meta: byId.get(id)!.meta, gains: byId.get(id)!.gains, rankToday: rankToday.get(id) ?? null })),
    now,
    { insertOnly: true },
  );
  Object.assign(ctx.meta, { lists: lists.length, reposInserted: sync.inserted });
  ctx.setSource(source);
  if (!gh.enabled) ctx.setStatus("partial");
});
