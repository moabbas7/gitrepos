/** Shared steps used by several jobs. */
import type { Candidate } from "./rank-core";
import type { DataStore } from "./data-store";
import { listHourKeys, loadHours } from "./files";
import type { GitHub } from "./github";
import { addPoint, seriesGains, type StarHistory } from "./star-history";
import { HOUR_MS, recentCompleteHours } from "./time";
import type { MetaCache, RepoMeta } from "./types";
import { sampleCounts } from "./windows";

export type Sample = Map<number, { name: string; count: number }>;

/** GH Archive sampled WatchEvents over the last `hoursBack` hours (discovery signal). */
export function loadSample(store: DataStore, now: Date, hoursBack = 48): Sample {
  const wanted = new Set(recentCompleteHours(now, hoursBack));
  return sampleCounts(loadHours(store, listHourKeys(store).filter((h) => wanted.has(h))), now, hoursBack);
}

/** Hours since the newest GH Archive file (Infinity if none). */
export function archiveLagHours(store: DataStore, now: Date): number {
  const keys = listHourKeys(store);
  if (!keys.length) return Infinity;
  const newest = Date.parse(`${keys[keys.length - 1]}:00:00Z`) + HOUR_MS;
  return (now.getTime() - newest) / HOUR_MS;
}

export function isStale(m: RepoMeta | undefined, now: Date, maxAgeHours: number): boolean {
  return !m || now.getTime() - Date.parse(m.fetchedAt) > maxAgeHours * HOUR_MS;
}

export interface Gained {
  id: number;
  gains: { today: number; week: number; month: number };
  spark: number[];
}

/** Gains for every repo with history + metadata. */
export function gainsFor(hist: StarHistory, cache: MetaCache, now: Date): Map<number, Gained> {
  const out = new Map<number, Gained>();
  for (const [idStr, pts] of Object.entries(hist)) {
    const meta = cache[idStr];
    const g = seriesGains(pts, now, meta?.createdAt);
    if (g) out.set(Number(idStr), { id: Number(idStr), gains: g.gains, spark: g.spark });
  }
  return out;
}

/**
 * The tracked pool, best first: repos ordered by real weekly gains (then today), followed by
 * GH Archive sample hits we haven't measured yet. Capped at `limit`.
 */
export function trackedPool(gained: Map<number, Gained>, sample: Sample, limit: number): number[] {
  const measured = [...gained.values()]
    .sort((a, b) => b.gains.week - a.gains.week || b.gains.today - a.gains.today || a.id - b.id)
    .map((g) => g.id);
  const out = new Set<number>(measured.slice(0, limit));
  for (const [id] of [...sample.entries()].sort((a, b) => b[1].count - a[1].count || a[0] - b[0])) {
    if (out.size >= limit) break;
    out.add(id);
  }
  return [...out];
}

/**
 * Fetches metadata (GraphQL, 100/query) for `ids`, updates the cache (keeping spam verdicts) and
 * records a star-history point for each. Names come from the cache or the GH Archive sample.
 */
export async function fetchAndRecord(
  gh: GitHub,
  cache: MetaCache,
  hist: StarHistory,
  sample: Sample,
  ids: number[],
  now: Date,
): Promise<number> {
  if (!gh.enabled || !ids.length) return 0;
  const refs = ids
    .map((id) => {
      const c = cache[id];
      const name = c && !c.missing ? `${c.owner}/${c.name}` : sample.get(id)?.name;
      return name ? { id, fullName: name } : null;
    })
    .filter((r): r is { id: number; fullName: string } => !!r);
  const fetched = await gh.fetchRepos(refs);
  for (const [id, meta] of fetched) {
    cache[id] = { ...meta, spam: cache[id]?.spam };
    if (!meta.missing) addPoint(hist, id, now, meta.stars);
  }
  return fetched.size;
}

export function buildCandidates(gained: Map<number, Gained>, cache: MetaCache, ids?: Iterable<number>): Candidate[] {
  const out: Candidate[] = [];
  for (const id of ids ?? gained.keys()) {
    const g = gained.get(id);
    const meta = cache[id];
    if (!g || !meta || meta.missing) continue;
    out.push({ meta, gains: g.gains, spark: g.spark });
  }
  return out;
}
