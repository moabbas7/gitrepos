import { dayGain, starsAt, type StarHistory } from "./star-history";
import type { DailyFile, MetaCache } from "./types";

/**
 * Pure: builds the daily file for `day` from star history. `all` holds every covered repo
 * (for repo_daily snapshots); the file keeps only repos with >= minStars gained that day.
 */
export function buildDailyFile(
  day: string,
  hist: StarHistory,
  cache: MetaCache,
  minStars: number,
): { file: DailyFile; all: Map<number, { gained: number; stars: number }> } {
  const end = Date.parse(`${day}T00:00:00Z`) / 1000 + 86400;
  const all = new Map<number, { gained: number; stars: number }>();
  const repos: DailyFile["repos"] = {};
  for (const [idStr, pts] of Object.entries(hist)) {
    const meta = cache[idStr];
    const gained = dayGain(pts, day, meta?.createdAt);
    if (gained === null) continue;
    const stars = Math.round(starsAt(pts, end, meta?.createdAt) ?? 0);
    all.set(Number(idStr), { gained, stars });
    if (gained >= minStars) repos[idStr] = [meta ? `${meta.owner}/${meta.name}` : idStr, gained, stars];
  }
  return { file: { v: 2, date: day, minStars, reposCovered: all.size, repos }, all };
}
