import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getReposByIds, listPageCandidates, listPinnedRepoIds, trackingSince } from "@/lib/db/public";
import { applyMigrations, sqliteDb } from "@/lib/db/sqlite";
import { buildSite } from "@/lib/site-data/load";
import { EMPTY_SNAPSHOT, type SiteSnapshot } from "@/lib/site-data/types";
import { toSnapshotRepo } from "@/lib/site-data/snapshot-repo";
import { emitStatic, sitemapGroups } from "../scripts/emit-static";
import { WriteBudget } from "../jobs/lib/budget";
import {
  cleanIntro,
  digestTitle,
  firstDigestDates,
  isoWeekKey,
  lastCompletePeriods,
  periodCovered,
  pickDigestRows,
  templateIntro,
} from "../jobs/lib/digest";
import { pruneStaleRepos } from "../jobs/lib/maintenance";
import { computePageSelection, markPublished } from "../jobs/lib/pages";

const NOW = new Date("2026-11-27T10:00:00Z");

function db() {
  const d = sqliteDb();
  applyMigrations(d);
  return d;
}

async function addRepo(d: ReturnType<typeof db>, id: number, over: Record<string, string | number | null> = {}) {
  const row: Record<string, string | number | null> = {
    id,
    owner: `o${id}`,
    name: `r${id}`,
    full_name: `o${id}/r${id}`,
    topics: '["ai"]',
    stars: 100,
    gained_7d: 0,
    gained_30d: 0,
    readme_excerpt: "SECRET README TEXT that must never be published",
    meta_refreshed_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...over,
  };
  const cols = Object.keys(row);
  await d.run(`INSERT INTO repos (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, Object.values(row));
}

async function rank(d: ReturnType<typeof db>, ids: number[]) {
  await d.run(
    "INSERT INTO rankings (list_type, period, language, payload, item_count, computed_at) VALUES ('trending','today','all',?,?,?)",
    [JSON.stringify(ids.map((id, i) => ({ id, rank: i + 1, owner: `o${id}`, name: `r${id}`, topics: [], language: null }))), ids.length, NOW.toISOString()],
  );
}

describe("migration 0002 (stable pages)", () => {
  it("adds first_published_at and page_pins", async () => {
    const d = db();
    await addRepo(d, 1);
    expect((await d.first<{ first_published_at: string | null }>("SELECT first_published_at FROM repos"))!.first_published_at).toBeNull();
    await d.run("INSERT INTO page_pins (repo_id, reason, until, created_at) VALUES (1, 'promo', ?, ?)", ["2026-12-01T00:00:00Z", NOW.toISOString()]);
    await expect(d.run("INSERT INTO page_pins (repo_id, reason, created_at) VALUES (2, 'bribe', 'x')")).rejects.toThrow();
  });

  it("only returns unexpired pins", async () => {
    const d = db();
    await d.run("INSERT INTO page_pins (repo_id, reason, until, created_at) VALUES (1, 'promo', '2026-12-01T00:00:00Z', 'x'), (2, 'promo', '2026-11-01T00:00:00Z', 'x'), (3, 'manual', NULL, 'x')");
    expect((await listPinnedRepoIds(d, NOW.toISOString())).sort()).toEqual([1, 3]);
  });
});

describe("stable pages against the database", () => {
  it("selects ranked + previously published repos, excludes spam, and marks new ones once", async () => {
    const d = db();
    await addRepo(d, 1); // ranked
    await addRepo(d, 2, { first_published_at: "2026-11-24T00:00:00Z" }); // dropped out of the lists
    await addRepo(d, 3, { is_spam: 1, first_published_at: "2026-11-24T00:00:00Z" });
    await rank(d, [1]);
    const { selection } = await computePageSelection(d, NOW, { maxFiles: 18_000, maxPrebuilt: 5000 });
    expect(selection.build.sort()).toEqual([1, 2]);
    expect(selection.newlyPublished).toEqual([1]);

    expect(await markPublished(d, selection.newlyPublished, NOW.toISOString())).toBe(1);
    expect(await markPublished(d, selection.newlyPublished, "2030-01-01T00:00:00Z")).toBe(0); // never rewritten
    const cands = await listPageCandidates(d);
    expect(cands.find((c) => c.id === 1)!.first_published_at).toBe(NOW.toISOString());
  });

  it("skips marking when the D1 write budget is exhausted (retried next build)", async () => {
    const d = db();
    await addRepo(d, 1);
    expect(await markPublished(d, [1], NOW.toISOString(), new WriteBudget(10, 10))).toBe(0);
  });

  it("prune never deletes a stale repo whose page is still built", async () => {
    const d = db();
    const old = "2026-01-01T00:00:00Z";
    await addRepo(d, 1, { meta_refreshed_at: old, first_published_at: "2026-02-01T00:00:00Z" }); // published, unranked
    await addRepo(d, 2, { meta_refreshed_at: old }); // never published -> fill tier
    await addRepo(d, 3, { meta_refreshed_at: old }); // retired by a tiny budget
    const { selection } = await computePageSelection(d, NOW, { maxFiles: 18_000, maxPrebuilt: 2 });
    expect(selection.build).toContain(1);
    const deleted = await pruneStaleRepos(d, "2026-06-01T00:00:00Z", undefined, 2000, new Set(selection.build));
    expect(deleted).toBe(1);
    expect((await d.all<{ id: number }>("SELECT id FROM repos ORDER BY id")).map((r) => r.id)).toEqual(selection.build.sort());
  });

  it("reads tracking start from the first successful rank run", async () => {
    const d = db();
    expect(await trackingSince(d)).toBeNull();
    await d.run("INSERT INTO job_runs (job, started_at, status) VALUES ('rank', '2026-11-23T23:20:00Z', 'failed'), ('rank', '2026-11-23T23:40:00Z', 'success'), ('ingest-gharchive', '2026-11-20T00:00:00Z', 'success')");
    expect(await trackingSince(d)).toBe("2026-11-23T23:40:00Z");
  });
});

describe("snapshot and emitted artifacts never contain README text", () => {
  const out = mkdtempSync(join(tmpdir(), "gr-emit-"));
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it("public repo rows have no readme column and the emitted files stay clean", async () => {
    const d = db();
    await addRepo(d, 1, { description: "Short GitHub description", topics: '["ai","cli"]' });
    await rank(d, [1]);
    const [row] = await getReposByIds(d, [1]);
    expect(row).not.toHaveProperty("readme_excerpt");
    const repo = toSnapshotRepo(row, "ranked", NOW.toISOString());
    const snap: SiteSnapshot = {
      ...EMPTY_SNAPSHOT,
      generatedAt: NOW.toISOString(),
      repos: [repo],
      rankings: [
        {
          listType: "trending",
          period: "today",
          language: "all",
          items: [{ id: 1, owner: "o1", name: "r1", description: "Short GitHub description", language: null, topics: ["ai"], stars: 100, forks: 0, avatarUrl: "", createdAt: "", gained: 9, spark: [], rank: 1 }],
          source: "gharchive",
          computedAt: NOW.toISOString(),
        },
      ],
    };
    expect(JSON.stringify(snap)).not.toContain("SECRET README");
    const stats = await emitStatic(buildSite(snap, NOW), { og: false, out });
    expect(stats.badges).toBe(1);

    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else files.push(p);
      }
    };
    walk(out);
    expect(files.map((f) => f.slice(out.length))).toEqual(
      expect.arrayContaining([
        "/lists/trending-today-all.json",
        "/search-index.json",
        "/sitemap.xml",
        "/sitemaps/repos.xml",
        "/data/latest.json",
        "/data/latest.csv",
        "/badge/featured.svg",
        "/badge/o1/r1.svg",
      ]),
    );
    for (const f of files) expect(readFileSync(f, "utf8")).not.toContain("SECRET README");
  });

  it("emits valid empty artifacts for an empty snapshot (first deploy)", async () => {
    const site = buildSite(EMPTY_SNAPSHOT, NOW);
    const stats = await emitStatic(site, { og: false, out });
    expect(stats).toMatchObject({ lists: 0, searchRepos: 0, badges: 0 });
    expect(JSON.parse(readFileSync(join(out, "search-index.json"), "utf8"))).toEqual({ v: 1, r: [], t: [], l: [] });
    expect(readFileSync(join(out, "sitemap.xml"), "utf8")).toContain("/sitemaps/pages.xml");
    expect(sitemapGroups(site).repos).toEqual([]);
  });

  it("sitemap repo URLs are exactly the built repos (retired pages drop out)", () => {
    const site = buildSite({ ...EMPTY_SNAPSHOT, repos: [{ ...toSnapshotRepoStub(5) }] }, NOW);
    expect(sitemapGroups(site).repos.map((u) => u.path)).toEqual(["/repo/o5/r5"]);
  });
});

function toSnapshotRepoStub(id: number) {
  return toSnapshotRepo(
    {
      id, owner: `o${id}`, name: `r${id}`, full_name: `o${id}/r${id}`, description: null, language: null, topics: "[]", stars: 1, forks: 0, issues: 0,
      watchers: 0, licence: null, homepage: null, avatar_url: null, created_at: null, pushed_at: null, summary: null, summary_source: null,
      is_archived: 0, is_fork: 0, is_spam: 0, gained_24h: 0, gained_7d: 0, gained_30d: 0, rank_today: null, first_published_at: "2026-11-24T00:00:00Z",
      updated_at: "x",
    },
    "published",
    NOW.toISOString(),
  );
}

describe("digests", () => {
  it("computes ISO week keys, including year boundaries", () => {
    expect(isoWeekKey(new Date("2026-11-23T00:00:00Z"))).toBe("2026-W48");
    expect(isoWeekKey(new Date("2026-11-29T23:00:00Z"))).toBe("2026-W48");
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
    expect(isoWeekKey(new Date("2024-12-30T00:00:00Z"))).toBe("2025-W01");
  });

  it("finds the last complete week and month", () => {
    const { weekly, monthly } = lastCompletePeriods(new Date("2026-11-30T01:20:00Z")); // Monday
    expect(weekly).toEqual({ kind: "weekly", key: "2026-W48", start: "2026-11-23", end: "2026-11-29" });
    expect(monthly).toEqual({ kind: "monthly", key: "2026-10", start: "2026-10-01", end: "2026-10-31" });
  });

  it("only publishes periods tracking fully covered", () => {
    const { weekly, monthly } = lastCompletePeriods(new Date("2026-11-30T01:20:00Z"));
    expect(periodCovered(weekly, "2026-11-23T23:40:00Z")).toBe(true); // within a day of Monday
    expect(periodCovered(monthly, "2026-11-23T23:40:00Z")).toBe(false); // October not tracked
    expect(periodCovered(weekly, null)).toBe(false);
  });

  it("tells the empty archive when the first digests appear", () => {
    expect(firstDigestDates("2026-11-23T23:40:00Z")).toEqual({ weekly: "2026-11-30", monthly: "2027-01-01" });
    expect(firstDigestDates("2026-11-25T08:00:00Z")).toEqual({ weekly: "2026-12-07", monthly: "2027-01-01" });
    expect(firstDigestDates(null)).toEqual({ weekly: null, monthly: null });
  });

  it("uses the last day's list inside the period, positive gains only", () => {
    const p = { kind: "weekly" as const, key: "2026-W48", start: "2026-11-23", end: "2026-11-29" };
    const rows = [
      { date: "2026-11-28", rank: 1, repo_id: 9, gained: 50 },
      { date: "2026-11-29", rank: 2, repo_id: 2, gained: 40 },
      { date: "2026-11-29", rank: 1, repo_id: 1, gained: 80 },
      { date: "2026-11-29", rank: 3, repo_id: 3, gained: 0 },
      { date: "2026-11-30", rank: 1, repo_id: 7, gained: 999 },
    ];
    expect(pickDigestRows(rows, p).map((r) => r.repo_id)).toEqual([1, 2]);
    expect(pickDigestRows([], p)).toEqual([]);
  });

  it("writes an original template intro and titles", () => {
    const p = { kind: "weekly" as const, key: "2026-W48", start: "2026-11-23", end: "2026-11-29" };
    const items = [1, 2, 3].map((i) => ({
      id: i, owner: `o${i}`, name: `r${i}`, description: null, language: i < 3 ? "Rust" : "Go", topics: ["ai"], stars: 1, forks: 0,
      avatarUrl: "", createdAt: "", gained: 1000 * (4 - i), spark: [], rank: i,
    }));
    const intro = templateIntro(p, items);
    expect(intro).toContain("The top repository of week 48, 2026 (2026-11-23 to 2026-11-29) was o1/r1, which gained 3,000 stars.");
    expect(intro).toContain("o2/r2 (+2,000) and o3/r3 (+1,000)");
    expect(intro).toContain("Rust and Go were the most common languages in the top 3, and #ai the most frequent topic.");
    expect(digestTitle(p)).toBe("Top trending repositories of week 48, 2026");
    expect(cleanIntro("**Short.**")).toBeNull();
  });
});
