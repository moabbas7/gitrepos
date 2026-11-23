import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { countWatchEvents, fetchHour } from "../jobs/lib/gharchive";
import { ghArchiveUrl, recentCompleteHours } from "../jobs/lib/time";

const ev = (type: string, id: number | undefined, name: string | undefined, action?: string) =>
  JSON.stringify({ id: "1", type, actor: { login: "x" }, repo: { id, name, url: "" }, payload: action ? { action } : {} });

function gz(lines: string[]) {
  return Readable.from(gzipSync(Buffer.from(lines.join("\n") + "\n")));
}

describe("GH Archive parser", () => {
  it("counts WatchEvents per repo id and ignores other events", async () => {
    const { counts, stats } = await countWatchEvents(
      gz([
        ev("WatchEvent", 1, "a/one", "started"),
        ev("WatchEvent", 1, "a/one", "started"),
        ev("PushEvent", 1, "a/one"),
        ev("WatchEvent", 2, "b/two", "started"),
        ev("ForkEvent", 2, "b/two"),
        ev("IssuesEvent", 3, "c/three"),
      ]),
    );
    expect(counts.get(1)).toEqual({ name: "a/one", count: 2 });
    expect(counts.get(2)).toEqual({ name: "b/two", count: 1 });
    expect(counts.has(3)).toBe(false);
    expect(stats).toMatchObject({ lines: 6, watchEvents: 3, malformed: 0 });
  });

  it("skips malformed lines and events without a usable repo", async () => {
    const { counts, stats } = await countWatchEvents(
      gz([
        '{"type":"WatchEvent", broken json',
        ev("WatchEvent", undefined, "x/y", "started"),
        ev("WatchEvent", 5, "noslash", "started"),
        ev("WatchEvent", 6, "ok/repo", "started"),
        "",
      ]),
    );
    expect([...counts.keys()]).toEqual([6]);
    expect(stats.malformed).toBe(3);
  });

  it("ignores non-'started' watch actions and tracks renames within the hour", async () => {
    const { counts } = await countWatchEvents(
      gz([ev("WatchEvent", 7, "old/name", "started"), ev("WatchEvent", 7, "new/name", "started"), ev("WatchEvent", 7, "new/name", "deleted")]),
    );
    expect(counts.get(7)).toEqual({ name: "new/name", count: 2 });
  });

  it("does not JSON-parse lines that can't be WatchEvents (pre-filter)", async () => {
    // A malformed non-watch line must not count as malformed: it is skipped before parsing.
    const { stats } = await countWatchEvents(gz(['{"type":"PushEvent", broken']));
    expect(stats.malformed).toBe(0);
  });

  it("builds unpadded GH Archive URLs", () => {
    expect(ghArchiveUrl("2026-11-23T05")).toBe("https://data.gharchive.org/2026-11-23-5.json.gz");
    expect(ghArchiveUrl("2026-11-23T15")).toBe("https://data.gharchive.org/2026-11-23-15.json.gz");
  });

  it("lists recent complete hours newest first", () => {
    expect(recentCompleteHours(new Date("2026-11-23T10:20:00Z"), 3)).toEqual(["2026-11-23T09", "2026-11-23T08", "2026-11-23T07"]);
  });

  it("fetchHour maps 404 to not_found and network errors to error", async () => {
    const notFound = (async () => new Response("nope", { status: 404 })) as unknown as typeof fetch;
    expect(await fetchHour("2026-11-23T05", notFound)).toEqual({ status: "not_found" });
    const boom = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    expect(await fetchHour("2026-11-23T05", boom)).toEqual({ status: "error", error: "ECONNRESET" });
  });

  it("fetchHour streams and parses a gzipped body", async () => {
    const body = gzipSync(Buffer.from([ev("WatchEvent", 9, "z/z", "started")].join("\n")));
    const ok = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
    const r = await fetchHour("2026-11-23T05", ok);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.counts.get(9)?.count).toBe(1);
  });
});
