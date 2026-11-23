import type { DailyFile, Gains, HourFile } from "./types";
import { dayKey, dayStart, HOUR_MS, hourKey, hourStart, recentCompleteDays, recentCompleteHours } from "./time";

export interface RepoWindow {
  name: string;
  gains: Gains;
  /** 7 points: the 6 complete days before today, then the rolling last-24h count. */
  spark: number[];
}

/** Hours of the current UTC day that are complete (00..now-1h). */
function todayPartialHours(now: Date): string[] {
  const out: string[] = [];
  for (let t = dayStart(now).getTime(); t < hourStart(now).getTime(); t += HOUR_MS) out.push(hourKey(new Date(t)));
  return out;
}

/**
 * Builds Today/Week/Month star gains per repo from hourly files (last 48h) and daily files (last 30d).
 * A complete day uses its daily file; if that's missing (snapshot hasn't run yet) it falls back to the
 * hourly files for that day when they are still retained.
 */
export function computeWindows(
  hours: Map<string, HourFile>,
  days: Map<string, DailyFile>,
  now: Date,
): Map<number, RepoWindow> {
  const out = new Map<number, RepoWindow>();
  const get = (id: number, name: string) => {
    let w = out.get(id);
    if (!w) {
      w = { name, gains: { today: 0, week: 0, month: 0 }, spark: [0, 0, 0, 0, 0, 0, 0] };
      out.set(id, w);
    }
    return w;
  };

  // Rolling 24h
  for (const h of recentCompleteHours(now, 24)) {
    const f = hours.get(h);
    if (!f) continue;
    for (const [id, [name, n]] of Object.entries(f.repos)) {
      const w = get(Number(id), name);
      w.gains.today += n;
      w.spark[6] += n;
    }
  }

  // Today so far (for week/month)
  for (const h of todayPartialHours(now)) {
    const f = hours.get(h);
    if (!f) continue;
    for (const [id, [name, n]] of Object.entries(f.repos)) {
      const w = get(Number(id), name);
      w.gains.week += n;
      w.gains.month += n;
    }
  }

  // Complete days, newest first: index 0 = yesterday
  const completeDays = recentCompleteDays(now, 29);
  completeDays.forEach((d, i) => {
    const totals = dayTotals(d, hours, days);
    for (const [id, { name, count }] of totals) {
      const w = get(id, name);
      w.gains.month += count;
      if (i < 6) {
        w.gains.week += count;
        w.spark[5 - i] += count;
      }
    }
  });

  return out;
}

/** Totals for one complete day: daily file if present, else summed hourly files. */
export function dayTotals(
  day: string,
  hours: Map<string, HourFile>,
  days: Map<string, DailyFile>,
): Map<number, { name: string; count: number }> {
  const m = new Map<number, { name: string; count: number }>();
  const df = days.get(day);
  if (df) {
    for (const [id, [name, n]] of Object.entries(df.repos)) m.set(Number(id), { name, count: n });
    return m;
  }
  for (let h = 0; h < 24; h++) {
    const f = hours.get(`${day}T${String(h).padStart(2, "0")}`);
    if (!f) continue;
    for (const [id, [name, n]] of Object.entries(f.repos)) {
      const cur = m.get(Number(id));
      if (cur) cur.count += n;
      else m.set(Number(id), { name, count: n });
    }
  }
  return m;
}

/** Rolls the 24 hourly files of `day` into a daily file, keeping repos with >= minStars. */
export function rollupDay(day: string, hours: Map<string, HourFile>, minStars: number): DailyFile {
  const totals = new Map<number, { name: string; count: number }>();
  let covered = 0;
  for (let h = 0; h < 24; h++) {
    const f = hours.get(`${day}T${String(h).padStart(2, "0")}`);
    if (!f) continue;
    covered++;
    for (const [id, [name, n]] of Object.entries(f.repos)) {
      const cur = totals.get(Number(id));
      if (cur) {
        cur.count += n;
        cur.name = name;
      } else totals.set(Number(id), { name, count: n });
    }
  }
  const repos: Record<string, [string, number]> = {};
  for (const [id, { name, count }] of totals) if (count >= minStars) repos[id] = [name, count];
  return { v: 1, date: day, minStars, hoursCovered: covered, repos };
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

export { dayKey };
