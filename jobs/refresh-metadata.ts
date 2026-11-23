/**
 * refresh-metadata (every 6h):
 *  1. Discovery via GitHub Search (new + recently pushed repos, by language).
 *  2. GraphQL metadata (100/query) for the tracked pool: top TRACKED_LIMIT by real weekly gains,
 *     topped up with GH Archive sample hits. Each fetch adds a star-history point.
 *  3. Spam guard on the biggest movers without a fresh verdict.
 *  4. Write-minimal sync into D1 `repos` (unchanged rows skipped) + README excerpts.
 *  5. Compact star history / metadata cache to the tracked pool.
 */
import { parseJsonArray } from "@/lib/db/public";
import type { Statement } from "@/lib/db/types";
import type { RepoCardData } from "@/lib/types";
import { config } from "./lib/config";
import { DataStore } from "./lib/data-store";
import { discoverViaSearch } from "./lib/discovery";
import { loadMeta, loadStars, saveMeta, saveStars } from "./lib/files";
import { GitHub } from "./lib/github";
import { main } from "./lib/job-run";
import { buildCandidates, fetchAndRecord, gainsFor, isStale, loadSample, trackedPool } from "./lib/pipeline";
import { syncRepos } from "./lib/repo-sync";
import { evaluateStargazers, verdictIsFresh } from "./lib/spam";
import { compactHistory } from "./lib/star-history";
import { readmeToExcerpt } from "./lib/summary";
import { DAY_MS } from "./lib/time";

main("refresh-metadata", async (ctx) => {
  const now = new Date();
  const gh = new GitHub({ log: ctx.log });
  if (!gh.enabled) {
    ctx.setStatus("skipped");
    ctx.log("no GitHub token — skipping");
    return;
  }
  const store = new DataStore();
  const cache = loadMeta(store);
  const hist = loadStars(store);
  const sample = loadSample(store, now, 48);

  // 1. Discovery
  const discovery = await discoverViaSearch(gh, cache, hist, now);

  // 2. Tracked pool + metadata
  const pool = trackedPool(gainsFor(hist, cache, now), sample, config.trackedLimit);
  const toFetch = pool.filter((id) => isStale(cache[id], now, 1));
  const fetched = await fetchAndRecord(gh, cache, hist, sample, toFetch, now);

  // 3. Spam guard
  const gained = gainsFor(hist, cache, now);
  const toCheck = pool
    .filter((id) => cache[id] && !cache[id].missing && !verdictIsFresh(cache[id].spam, now))
    .sort((a, b) => (gained.get(b)?.gains.today ?? 0) - (gained.get(a)?.gains.today ?? 0))
    .slice(0, config.spamCheckLimit);
  const samples = await gh.stargazerSamples(toCheck.map((id) => ({ id, fullName: `${cache[id].owner}/${cache[id].name}` })));
  let flagged = 0;
  for (const [id, s] of samples) {
    cache[id].spam = evaluateStargazers(s, now);
    if (cache[id].spam!.isSpam) flagged++;
  }

  // 4. D1 sync (rank_today from the current Today list)
  const todayRow = await ctx.db.first<{ payload: string }>(
    "SELECT payload FROM rankings WHERE list_type = 'trending' AND period = 'today' AND language = 'all'",
  );
  const rankToday = new Map(parseJsonArray<RepoCardData>(todayRow?.payload).map((i) => [i.id, i.rank]));
  const cands = buildCandidates(gained, cache, pool);
  const sync = await syncRepos(
    ctx.db,
    cands.map((c) => ({ meta: c.meta, gains: c.gains, rankToday: rankToday.get(c.meta.id) ?? null })),
    now,
  );

  let readmes = 0;
  if (ctx.budget.canAfford(config.readmeLimit * 2)) {
    const need = await ctx.db.all<{ id: number; owner: string; name: string }>(
      "SELECT id, owner, name FROM repos WHERE readme_excerpt IS NULL AND is_spam = 0 ORDER BY gained_7d DESC LIMIT ?",
      [config.readmeLimit],
    );
    const updates: Statement[] = [];
    for (const r of need) {
      const md = await gh.readme(`${r.owner}/${r.name}`);
      updates.push({ sql: "UPDATE repos SET readme_excerpt = ? WHERE id = ?", params: [md ? readmeToExcerpt(md) : "", r.id] });
    }
    await ctx.db.batch(updates);
    readmes = updates.length;
  }

  // 5. Compact: keep history for the pool + anything currently ranked; drop long-stale metadata.
  const keep = new Set<number>([...pool, ...rankToday.keys()]);
  compactHistory(hist, now, keep);
  let prunedMeta = 0;
  for (const [id, m] of Object.entries(cache)) {
    if (!keep.has(Number(id)) && now.getTime() - Date.parse(m.fetchedAt) > 7 * DAY_MS) {
      delete cache[id];
      prunedMeta++;
    }
  }
  saveMeta(store, cache);
  saveStars(store, hist);

  Object.assign(ctx.meta, {
    discovery,
    pool: pool.length,
    fetched,
    spamChecked: samples.size,
    spamFlagged: flagged,
    ...sync,
    readmes,
    prunedMeta,
    historySeries: Object.keys(hist).length,
    githubPoints: gh.pointsUsed,
    githubRequests: gh.requests,
  });
  ctx.setSource("github");
});
