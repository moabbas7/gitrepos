import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations, sqliteDb } from "@/lib/db/sqlite";
import { BudgetExceededError, WriteBudget } from "../jobs/lib/budget";
import { DataStore } from "../jobs/lib/data-store";
import { dayPath, expiredFiles, hourPath, listDayKeys, listHourKeys, pruneFiles } from "../jobs/lib/files";
import { pruneRepoDaily, pruneStaleRepos, recomputeTopics } from "../jobs/lib/maintenance";
import { syncRepos } from "../jobs/lib/repo-sync";
import { meta, NOW } from "./helpers";

describe("data-branch file retention", () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "gr-data-"))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("plans deletion of hourly files older than 48h and daily files older than 35d", () => {
    const exp = expiredFiles(
      ["2026-11-21T11", "2026-11-21T12", "2026-11-23T11"],
      ["2026-10-18", "2026-10-19", "2026-11-22"],
      NOW,
      48,
      35,
    );
    expect(exp.hours).toEqual(["2026-11-21T11"]);
    expect(exp.days).toEqual(["2026-10-18"]);
  });

  it("removes only expired files from the store", () => {
    const store = new DataStore(dir);
    for (const h of ["2026-11-20T00", "2026-11-23T10"]) store.writeJson(hourPath(h), { v: 1, hour: h, source: "gharchive", repos: {} });
    for (const d of ["2026-10-01", "2026-11-22"]) store.writeJson(dayPath(d), { v: 2, date: d, minStars: 3, reposCovered: 0, repos: {} });
    pruneFiles(store, NOW, 48, 35);
    expect(listHourKeys(store)).toEqual(["2026-11-23T10"]);
    expect(listDayKeys(store)).toEqual(["2026-11-22"]);
  });

  it("round-trips gzipped JSON", () => {
    const store = new DataStore(dir);
    store.writeJson("meta/x.json.gz", { a: [1, 2] });
    expect(store.readJson("meta/x.json.gz")).toEqual({ a: [1, 2] });
    expect(store.readJson("meta/missing.json.gz")).toBeNull();
  });
});

describe("D1 maintenance (on the real schema via node:sqlite)", () => {
  function db() {
    const d = sqliteDb();
    applyMigrations(d);
    return d;
  }

  async function seedRepos(d: ReturnType<typeof db>, n: number, refreshedAt: string) {
    for (let i = 1; i <= n; i++) {
      await d.run(
        `INSERT INTO repos (id, owner, name, full_name, topics, gained_7d, meta_refreshed_at, updated_at)
         VALUES (?, 'o', ?, ?, ?, ?, ?, ?)`,
        [i, `r${i}`, `o/r${i}`, JSON.stringify(i % 2 ? ["ai", "cli"] : ["ai"]), i * 10, refreshedAt, refreshedAt],
      );
    }
  }

  it("prunes repo_daily rows older than the cutoff only", async () => {
    const d = db();
    for (const date of ["2025-10-01", "2025-10-20", "2026-11-22"]) {
      await d.run("INSERT INTO repo_daily (repo_id, date, gained, stars) VALUES (1, ?, 1, 1)", [date]);
    }
    expect(await pruneRepoDaily(d, "2025-10-19")).toBe(1);
    const left = await d.all<{ date: string }>("SELECT date FROM repo_daily ORDER BY date");
    expect(left.map((r) => r.date)).toEqual(["2025-10-20", "2026-11-22"]);
  });

  it("bounds deletes per run", async () => {
    const d = db();
    for (let i = 0; i < 10; i++) await d.run("INSERT INTO repo_daily (repo_id, date, gained) VALUES (?, '2020-01-01', 1)", [i]);
    expect(await pruneRepoDaily(d, "2021-01-01", undefined, 4)).toBe(4);
    expect((await d.first<{ n: number }>("SELECT COUNT(*) n FROM repo_daily"))!.n).toBe(6);
  });

  it("never deletes when the write budget would be exceeded", async () => {
    const d = db();
    for (let i = 0; i < 5; i++) await d.run("INSERT INTO repo_daily (repo_id, date, gained) VALUES (?, '2020-01-01', 1)", [i]);
    const budget = new WriteBudget(100, 98);
    await expect(pruneRepoDaily(d, "2021-01-01", budget)).rejects.toBeInstanceOf(BudgetExceededError);
    expect((await d.first<{ n: number }>("SELECT COUNT(*) n FROM repo_daily"))!.n).toBe(5);
  });

  it("deletes stale repos but keeps anything that is currently ranked", async () => {
    const d = db();
    await seedRepos(d, 3, "2026-01-01T00:00:00Z");
    await d.run(
      "INSERT INTO rankings (list_type, period, language, payload, item_count, computed_at) VALUES ('trending','today','all',?,1,?)",
      [JSON.stringify([{ id: 2, rank: 1 }]), NOW.toISOString()],
    );
    expect(await pruneStaleRepos(d, "2026-08-01T00:00:00Z")).toBe(2);
    expect((await d.all<{ id: number }>("SELECT id FROM repos")).map((r) => r.id)).toEqual([2]);
  });

  it("recomputes topics and only rewrites changed rows", async () => {
    const d = db();
    await seedRepos(d, 4, NOW.toISOString());
    const first = await recomputeTopics(d, NOW);
    expect(first.written).toBe(2); // ai (4 repos), cli (2 repos)
    const ai = await d.first<{ repo_count: number; gained_7d: number }>("SELECT repo_count, gained_7d FROM topics WHERE topic='ai'");
    expect(ai).toEqual({ repo_count: 4, gained_7d: 100 });
    const second = await recomputeTopics(d, NOW);
    expect(second.written).toBe(0);
  });

  it("syncRepos inserts new rows, skips unchanged ones and updates only changed columns", async () => {
    const d = db();
    const gains = { today: 1, week: 2, month: 3 };
    const r1 = await syncRepos(d, [{ meta: meta(1), gains }, { meta: meta(2), gains }], NOW);
    expect(r1).toEqual({ inserted: 2, updated: 0, unchanged: 0 });
    const r2 = await syncRepos(d, [{ meta: meta(1), gains }, { meta: meta(2, { stars: 1234 }), gains }], NOW);
    expect(r2).toEqual({ inserted: 0, updated: 1, unchanged: 1 });
    expect((await d.first<{ stars: number }>("SELECT stars FROM repos WHERE id=2"))!.stars).toBe(1234);
    // insertOnly never touches existing rows
    const r3 = await syncRepos(d, [{ meta: meta(1, { stars: 1 }), gains }], NOW, { insertOnly: true });
    expect(r3).toEqual({ inserted: 0, updated: 0, unchanged: 1 });
    expect((await d.first<{ stars: number }>("SELECT stars FROM repos WHERE id=1"))!.stars).toBe(1000);
  });

  it("syncRepos handles renames by updating full_name and skips missing repos", async () => {
    const d = db();
    const gains = { today: 0, week: 0, month: 0 };
    await syncRepos(d, [{ meta: meta(1), gains }], NOW);
    await syncRepos(d, [{ meta: meta(1, { name: "renamed" }), gains }, { meta: meta(9, { missing: true }), gains }], NOW);
    expect(await d.all("SELECT id, full_name FROM repos")).toEqual([{ id: 1, full_name: "owner1/renamed" }]);
  });
});
