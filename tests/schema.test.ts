import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRanking, getRepoByFullName, listDigests, listPublishedRepos, listTopics } from "@/lib/db/public";
import { applyMigrations, sqliteDb } from "@/lib/db/sqlite";

describe("schema + seed", () => {
  it("migrations create every table from spec §10.1 plus job_runs", async () => {
    const d = sqliteDb();
    applyMigrations(d);
    const tables = (await d.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).map((t) => t.name);
    for (const t of [
      "repos", "repo_daily", "rankings", "ranking_history", "topics", "digests", "campaigns", "promo_orders",
      "clicks", "impressions", "ig_media", "ig_media_insights", "ig_account_insights", "admin_audit", "job_runs",
      "logos", "webhook_events", "app_state",
    ]) expect(tables).toContain(t);
  });

  it("enforces tagline length and status values", async () => {
    const d = sqliteDb();
    applyMigrations(d);
    const now = new Date().toISOString();
    await expect(
      d.run(
        "INSERT INTO campaigns (id,type,placement,package,company,tagline,url,email,stats_token,created_at,updated_at) VALUES ('c','sponsor','feed','p','Co',?,'u','e','t',?,?)",
        ["x".repeat(91), now, now],
      ),
    ).rejects.toThrow();
    await expect(
      d.run("INSERT INTO job_runs (job, started_at, status) VALUES ('x', ?, 'weird')", [now]),
    ).rejects.toThrow();
  });

  it("seed SQL loads into the real schema and public queries read it back", async () => {
    execFileSync("npx", ["tsx", "scripts/seed.ts", "--sql-only"], { stdio: "pipe" });
    const d = sqliteDb();
    applyMigrations(d);
    d.raw.exec(readFileSync(".data/seed.sql", "utf8"));
    const ranking = await getRanking(d, "trending", "today");
    expect(ranking?.items.length).toBeGreaterThan(10);
    expect(ranking?.items[0].rank).toBe(1);
    const top = ranking!.items[0];
    const repo = await getRepoByFullName(d, top.owner.toUpperCase(), top.name);
    expect(repo?.id).toBe(top.id);
    expect((await listPublishedRepos(d, 1000)).length).toBe(80);
    expect((await listTopics(d)).length).toBeGreaterThan(5);
    expect((await listDigests(d)).map((x) => x.kind).sort()).toEqual(["monthly", "weekly"]);
  }, 60_000);
});
