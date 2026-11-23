/**
 * Star history for tracked repos, stored on the data branch (meta/stars.json.gz).
 *
 * Why: GH Archive in 2026 only carries a small sample of public events (an hour is ~3–8 MB,
 * down from ~65 MB in 2025), so WatchEvent counts are no longer true star totals. Real gains come
 * from GitHub's stargazerCount, sampled every time we fetch metadata (hourly for top movers, every
 * 6h for the tracked set). Gains = stars now − stars at (now − window), linearly interpolated.
 *
 * Retention: every point from the last 48h, then the last point of each UTC day for 35 days.
 */
import { DAY_MS, HOUR_MS } from "./time";
import type { Gains } from "./types";

/** [epoch seconds, stargazerCount] ascending by time. */
export type StarPoint = [number, number];
export type StarHistory = Record<string, StarPoint[]>;

export const RECENT_KEEP_MS = 48 * HOUR_MS;
export const DAILY_KEEP_DAYS = 35;

export function addPoint(hist: StarHistory, id: number, at: Date, stars: number) {
  const ts = Math.floor(at.getTime() / 1000);
  const pts = (hist[id] ??= []);
  const last = pts[pts.length - 1];
  if (last && last[0] >= ts) {
    if (last[0] === ts) last[1] = stars;
    return; // ignore out-of-order points
  }
  pts.push([ts, stars]);
}

/** Drops points beyond retention: keep all in the last 48h, then one (the last) per UTC day. */
export function compactSeries(pts: StarPoint[], now: Date): StarPoint[] {
  const nowS = now.getTime() / 1000;
  const recentCut = nowS - RECENT_KEEP_MS / 1000;
  const oldestCut = nowS - DAILY_KEEP_DAYS * (DAY_MS / 1000);
  const out: StarPoint[] = [];
  const lastPerDay = new Map<number, StarPoint>();
  for (const p of pts) {
    if (p[0] < oldestCut) continue;
    if (p[0] >= recentCut) out.push(p);
    else lastPerDay.set(Math.floor(p[0] / 86400), p);
  }
  return [...lastPerDay.values(), ...out].sort((a, b) => a[0] - b[0]);
}

export function compactHistory(hist: StarHistory, now: Date, keepIds?: Set<number>) {
  for (const id of Object.keys(hist)) {
    if (keepIds && !keepIds.has(Number(id))) {
      delete hist[id];
      continue;
    }
    const c = compactSeries(hist[id], now);
    if (c.length) hist[id] = c;
    else delete hist[id];
  }
}

/**
 * Stars at time t (seconds). Interpolates between points. Before the first point: 0 if the repo
 * was created after t, otherwise the first point (conservative: under-counts rather than inventing).
 */
export function starsAt(pts: StarPoint[], t: number, createdAt?: string | null): number | null {
  if (!pts.length) return null;
  if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  if (t <= pts[0][0]) {
    const created = createdAt ? Date.parse(createdAt) / 1000 : NaN;
    if (Number.isFinite(created) && created >= t) return 0;
    return pts[0][1];
  }
  // binary search for the segment containing t
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid][0] <= t) lo = mid;
    else hi = mid;
  }
  const [t0, s0] = pts[lo];
  const [t1, s1] = pts[hi];
  return s0 + ((s1 - s0) * (t - t0)) / (t1 - t0);
}

export interface SeriesGains {
  gains: Gains;
  /** 7 points: gains on each of the 6 complete days before today, then the rolling 24h gain. */
  spark: number[];
  stars: number;
  /** Seconds of history covered (helps flag repos we only just started tracking). */
  coverage: number;
}

const clamp = (n: number) => Math.max(0, Math.round(n));

export function seriesGains(pts: StarPoint[], now: Date, createdAt?: string | null): SeriesGains | null {
  if (!pts.length) return null;
  const nowS = now.getTime() / 1000;
  const cur = pts[pts.length - 1][1];
  const at = (secAgo: number) => starsAt(pts, nowS - secAgo, createdAt) ?? cur;
  const day = 86400;
  const gains: Gains = {
    today: clamp(cur - at(day)),
    week: clamp(cur - at(7 * day)),
    month: clamp(cur - at(30 * day)),
  };
  const todayStart = Math.floor(nowS / day) * day;
  const spark: number[] = [];
  for (let i = 6; i >= 1; i--) {
    const start = todayStart - i * day;
    spark.push(clamp((starsAt(pts, start + day, createdAt) ?? cur) - (starsAt(pts, start, createdAt) ?? cur)));
  }
  spark.push(gains.today);
  return { gains, spark, stars: cur, coverage: nowS - pts[0][0] };
}

/** True gains for one complete UTC day (YYYY-MM-DD), or null if the series doesn't cover it. */
export function dayGain(pts: StarPoint[], day: string, createdAt?: string | null): number | null {
  const start = Date.parse(`${day}T00:00:00Z`) / 1000;
  const end = start + 86400;
  if (!pts.length || pts[pts.length - 1][0] < end - 3 * 3600) return null; // need a point near day end
  const a = starsAt(pts, start, createdAt);
  const b = starsAt(pts, end, createdAt);
  if (a === null || b === null) return null;
  return clamp(b - a);
}
