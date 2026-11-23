/**
 * GH Archive sample helpers. Since GH Archive is now a sample of public events, these counts are
 * used as a *discovery signal* (which repos are getting attention), not as star totals.
 */
import type { HourFile } from "./types";
import { recentCompleteHours } from "./time";

/** Sampled WatchEvent counts per repo over the last `hoursBack` complete hours. */
export function sampleCounts(
  hours: Map<string, HourFile>,
  now: Date,
  hoursBack = 24,
): Map<number, { name: string; count: number }> {
  const out = new Map<number, { name: string; count: number }>();
  for (const h of recentCompleteHours(now, hoursBack)) {
    const f = hours.get(h);
    if (!f) continue;
    for (const [id, [name, n]] of Object.entries(f.repos)) {
      const cur = out.get(Number(id));
      if (cur) {
        cur.count += n;
        cur.name = name;
      } else out.set(Number(id), { name, count: n });
    }
  }
  return out;
}

export function hourFileFromCounts(
  hour: string,
  counts: Map<number, { name: string; count: number }>,
  source: HourFile["source"],
): HourFile {
  const repos: Record<string, [string, number]> = {};
  for (const [id, { name, count }] of counts) repos[id] = [name, count];
  return { v: 1, hour, source, repos };
}

/** Top ids by sampled count (ties by id for determinism). */
export function topSampled(counts: Map<number, { name: string; count: number }>, k: number): number[] {
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0] - b[0])
    .slice(0, k)
    .map(([id]) => id);
}
