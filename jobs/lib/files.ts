/** Typed accessors for the data-branch files. */
import type { DataStore } from "./data-store";
import { DAY_MS, HOUR_MS, parseHourKey } from "./time";
import type { StarHistory } from "./star-history";
import type { DailyFile, HourFile, MetaCache } from "./types";

export const HOURLY_DIR = "raw/hourly";
export const DAILY_DIR = "daily";
export const META_FILE = "meta/repos.json.gz";
export const STARS_FILE = "meta/stars.json.gz";

export const hourPath = (hour: string) => `${HOURLY_DIR}/${hour}.json.gz`;
export const dayPath = (day: string) => `${DAILY_DIR}/${day}.json.gz`;

export function listHourKeys(store: DataStore): string[] {
  return store
    .list(HOURLY_DIR)
    .filter((f) => f.endsWith(".json.gz"))
    .map((f) => f.slice(0, -".json.gz".length));
}

export function listDayKeys(store: DataStore): string[] {
  return store
    .list(DAILY_DIR)
    .filter((f) => f.endsWith(".json.gz"))
    .map((f) => f.slice(0, -".json.gz".length));
}

export function loadHours(store: DataStore, keys = listHourKeys(store)): Map<string, HourFile> {
  const m = new Map<string, HourFile>();
  for (const k of keys) {
    const f = store.readJson<HourFile>(hourPath(k));
    if (f) m.set(k, f);
  }
  return m;
}

export function loadDays(store: DataStore, keys = listDayKeys(store)): Map<string, DailyFile> {
  const m = new Map<string, DailyFile>();
  for (const k of keys) {
    const f = store.readJson<DailyFile>(dayPath(k));
    if (f) m.set(k, f);
  }
  return m;
}

export function loadMeta(store: DataStore): MetaCache {
  return store.readJson<MetaCache>(META_FILE) ?? {};
}

export function saveMeta(store: DataStore, meta: MetaCache) {
  store.writeJson(META_FILE, meta);
}

export function loadStars(store: DataStore): StarHistory {
  return store.readJson<StarHistory>(STARS_FILE) ?? {};
}

export function saveStars(store: DataStore, hist: StarHistory) {
  store.writeJson(STARS_FILE, hist);
}

/** Retention plan (pure): which hour/day files are older than the retention window. */
export function expiredFiles(
  hourKeys: string[],
  dayKeys: string[],
  now: Date,
  hourlyRetentionHours: number,
  dailyRetentionDays: number,
): { hours: string[]; days: string[] } {
  const hourCutoff = now.getTime() - hourlyRetentionHours * HOUR_MS;
  const dayCutoff = new Date(now.getTime() - dailyRetentionDays * DAY_MS).toISOString().slice(0, 10);
  return {
    hours: hourKeys.filter((k) => parseHourKey(k).getTime() < hourCutoff),
    days: dayKeys.filter((k) => k < dayCutoff), // whole days: keep the cutoff date itself
  };
}

/** Removes expired files from the store. Returns what was removed. */
export function pruneFiles(store: DataStore, now: Date, hourlyRetentionHours: number, dailyRetentionDays: number) {
  const exp = expiredFiles(listHourKeys(store), listDayKeys(store), now, hourlyRetentionHours, dailyRetentionDays);
  for (const h of exp.hours) store.remove(hourPath(h));
  for (const d of exp.days) store.remove(dayPath(d));
  return exp;
}
