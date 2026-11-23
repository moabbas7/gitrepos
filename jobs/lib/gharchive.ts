import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import type { HourCounts } from "./types";
import { ghArchiveUrl } from "./time";

export interface ParseStats {
  lines: number;
  watchEvents: number;
  malformed: number;
}

/**
 * Streams a gzipped GH Archive hour (newline-delimited JSON events) and counts WatchEvents
 * (= a star; payload.action "started") per repo id. Never buffers the whole file: hourly
 * files are ~100–300 MB uncompressed. Malformed lines are counted and skipped.
 */
export async function countWatchEvents(gz: Readable): Promise<{ counts: HourCounts; stats: ParseStats }> {
  const counts: HourCounts = new Map();
  const stats: ParseStats = { lines: 0, watchEvents: 0, malformed: 0 };
  const rl = createInterface({ input: gz.pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    stats.lines++;
    // Cheap pre-filter: >95% of events are not stars, skip JSON.parse for them.
    if (!line.includes('"WatchEvent"')) continue;
    let ev: { type?: string; repo?: { id?: number; name?: string }; payload?: { action?: string } };
    try {
      ev = JSON.parse(line);
    } catch {
      stats.malformed++;
      continue;
    }
    if (ev.type !== "WatchEvent") continue;
    if (ev.payload?.action && ev.payload.action !== "started") continue;
    const id = ev.repo?.id;
    const name = ev.repo?.name;
    if (typeof id !== "number" || !name || !name.includes("/")) {
      stats.malformed++;
      continue;
    }
    stats.watchEvents++;
    const cur = counts.get(id);
    if (cur) {
      cur.count++;
      cur.name = name; // keep the most recent name (handles renames within the hour)
    } else counts.set(id, { name, count: 1 });
  }
  return { counts, stats };
}

export type FetchHourResult =
  | { status: "ok"; counts: HourCounts; stats: ParseStats }
  | { status: "not_found" }
  | { status: "error"; error: string };

/** Downloads + parses one hour from data.gharchive.org. 404 = not published yet. */
export async function fetchHour(hour: string, fetchImpl: typeof fetch = fetch): Promise<FetchHourResult> {
  const url = ghArchiveUrl(hour);
  try {
    const res = await fetchImpl(url, { headers: { "User-Agent": "gitrepos-pipeline (+https://github.com/moabbas7/gitrepos)" } });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok || !res.body) return { status: "error", error: `HTTP ${res.status} for ${url}` };
    const { counts, stats } = await countWatchEvents(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream));
    return { status: "ok", counts, stats };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}
