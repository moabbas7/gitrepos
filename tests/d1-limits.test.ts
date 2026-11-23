import { describe, expect, it } from "vitest";
import { assertD1Limits, D1LimitError, inClauseChunks, placeholders } from "@/lib/db/limits";
import { getRepoHistory } from "@/lib/db/public";
import { applyMigrations, sqliteDb } from "@/lib/db/sqlite";
import { pruneStaleRepos, recomputeTopics } from "../jobs/lib/maintenance";
import { syncRepos } from "../jobs/lib/repo-sync";
import { meta, NOW } from "./helpers";

function db() {
  const d = sqliteDb();
  applyMigrations(d);
  return d;
}

describe("D1 statement limits", () => {
  it("rejects more than 100 bound parameters and SQL over 100 KB", () => {
    expect(() => assertD1Limits("SELECT 1", Array(100).fill(1))).not.toThrow();
    expect(() => assertD1Limits("SELECT 1", Array(101).fill(1))).toThrow(D1LimitError);
    expect(() => assertD1Limits(`SELECT '${"x".repeat(100_001)}'`)).toThrow(/100000/);
  });

  it("inClauseChunks leaves room for the statement's other parameters", () => {
    const ids = Array.from({ length: 250 }, (_, i) => i);
    expect(inClauseChunks(ids).map((c) => c.length)).toEqual([100, 100, 50]);
    expect(inClauseChunks(ids, 1).map((c) => c.length)).toEqual([99, 99, 52]);
    expect(() => inClauseChunks(ids, 100)).toThrow();
    expect(placeholders([1, 2, 3])).toBe("?,?,?");
  });

  it("the test database enforces D1's limit, so the original bug (100 ids + 1 date) is caught", async () => {
    const d = db();
    const ids = Array.from({ length: 100 }, (_, i) => i);
    await expect(
      d.all(`SELECT * FROM repo_daily WHERE repo_id IN (${placeholders(ids)}) AND date >= ?`, [...ids, "2026-01-01"]),
    ).rejects.toThrow(/101 bound parameters/);
  });
});

describe("queries over many repos stay within D1 limits", () => {
  it("getRepoHistory works for 250 repos (regression: hourly run #1 failed here)", async () => {
    const d = db();
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    for (const id of ids) {
      await d.run("INSERT INTO repo_daily (repo_id, date, gained, stars) VALUES (?, '2026-11-20', ?, ?)", [id, id, id * 10]);
      await d.run("INSERT INTO repo_daily (repo_id, date, gained, stars) VALUES (?, '2026-08-01', 1, 1)", [id]);
    }
    const h = await getRepoHistory(d, ids, "2026-10-01");
    expect(h.size).toBe(250);
    expect(h.get(250)).toEqual([["2026-11-20", 250, 2500]]);
    expect(h.get(1)).toEqual([["2026-11-20", 1, 10]]);
  });

  it("syncRepos handles 250 repos (insert, then update path reads existing rows in chunks)", async () => {
    const d = db();
    const gains = { today: 1, week: 2, month: 3 };
    const items = Array.from({ length: 250 }, (_, i) => ({ meta: meta(i + 1), gains }));
    expect(await syncRepos(d, items, NOW)).toMatchObject({ inserted: 250 });
    const changed = items.map((u, i) => (i % 2 ? { ...u, meta: { ...u.meta, stars: 5 } } : u));
    expect(await syncRepos(d, changed, NOW)).toMatchObject({ inserted: 0, updated: 125, unchanged: 125 });
  });

  it("pruneStaleRepos and recomputeTopics handle more than 100 rows", async () => {
    const d = db();
    for (let i = 1; i <= 250; i++) {
      await d.run(
        "INSERT INTO repos (id, owner, name, full_name, topics, gained_7d, meta_refreshed_at, updated_at) VALUES (?, 'o', ?, ?, ?, 1, '2025-01-01', '2025-01-01')",
        [i, `r${i}`, `o/r${i}`, JSON.stringify([`t${i % 120}`])],
      );
    }
    expect((await recomputeTopics(d, NOW)).written).toBe(120);
    expect(await pruneStaleRepos(d, "2026-01-01T00:00:00Z")).toBe(250);
    // all repos gone -> every topic now has < 2 repos and is dropped in chunks
    expect((await recomputeTopics(d, NOW)).dropped).toBe(120);
  });
});
