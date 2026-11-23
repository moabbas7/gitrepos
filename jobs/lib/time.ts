/** UTC time helpers. Hour keys look like "2026-11-23T14", day keys like "2026-11-23". */

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function hourKey(d: Date): string {
  return d.toISOString().slice(0, 13);
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function hourStart(d: Date): Date {
  return new Date(Math.floor(d.getTime() / HOUR_MS) * HOUR_MS);
}

export function dayStart(d: Date): Date {
  return new Date(Math.floor(d.getTime() / DAY_MS) * DAY_MS);
}

export function parseHourKey(k: string): Date {
  return new Date(`${k}:00:00.000Z`);
}

/** The N most recent *complete* hours before `now`, newest first. */
export function recentCompleteHours(now: Date, n: number): string[] {
  const start = hourStart(now).getTime();
  return Array.from({ length: n }, (_, i) => hourKey(new Date(start - (i + 1) * HOUR_MS)));
}

/** The N most recent *complete* UTC days before `now`, newest first. */
export function recentCompleteDays(now: Date, n: number): string[] {
  const start = dayStart(now).getTime();
  return Array.from({ length: n }, (_, i) => dayKey(new Date(start - (i + 1) * DAY_MS)));
}

/** GH Archive file name for an hour key. Hours are NOT zero-padded: 2026-11-23-5.json.gz */
export function ghArchiveUrl(hour: string): string {
  const [date, hh] = hour.split("T");
  return `https://data.gharchive.org/${date}-${Number(hh)}.json.gz`;
}

export function isoNow(): string {
  return new Date().toISOString();
}
