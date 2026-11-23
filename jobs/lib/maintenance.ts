/** D1 maintenance used by rollup-and-prune (kept here so tests can run it on node:sqlite). */
import { parseJsonArray } from "@/lib/db/public";
import type { Db, SqlValue } from "@/lib/db/types";
import type { RepoCardData } from "@/lib/types";
import type { WriteBudget } from "./budget";
import { chunkedInsert } from "./sql";

export const MAX_DELETES_PER_RUN = 10_000;

/** Deletes repo_daily rows older than `cutoffDate` (YYYY-MM-DD), at most `max` per run. */
export async function pruneRepoDaily(db: Db, cutoffDate: string, budget?: WriteBudget, max = MAX_DELETES_PER_RUN) {
  const old = await db.first<{ n: number }>("SELECT COUNT(*) AS n FROM repo_daily WHERE date < ?", [cutoffDate]);
  if (!old?.n) return 0;
  const n = Math.min(old.n, max);
  budget?.check(n);
  const r = await db.run(
    "DELETE FROM repo_daily WHERE (repo_id, date) IN (SELECT repo_id, date FROM repo_daily WHERE date < ? LIMIT ?)",
    [cutoffDate, n],
  );
  return r.changes;
}

export async function rankedRepoIds(db: Db): Promise<Set<number>> {
  const ids = new Set<number>();
  for (const r of await db.all<{ payload: string }>("SELECT payload FROM rankings")) {
    for (const i of parseJsonArray<RepoCardData>(r.payload)) ids.add(i.id);
  }
  return ids;
}

/** Removes repos not refreshed since `cutoffIso` that aren't in any current ranking. */
export async function pruneStaleRepos(db: Db, cutoffIso: string, budget?: WriteBudget, max = 2000): Promise<number> {
  const ranked = await rankedRepoIds(db);
  const stale = await db.all<{ id: number }>(
    "SELECT id FROM repos WHERE COALESCE(meta_refreshed_at, updated_at) < ? LIMIT ?",
    [cutoffIso, max],
  );
  const ids = stale.map((r) => r.id).filter((id) => !ranked.has(id));
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    budget?.check(chunk.length * 2);
    await db.run(`DELETE FROM repos WHERE id IN (${chunk.map(() => "?").join(",")})`, chunk);
  }
  return ids.length;
}

/** Recomputes the topics table (top 500 by weekly gains, >= 2 repos); writes only changed rows. */
export async function recomputeTopics(db: Db, now: Date): Promise<{ written: number; dropped: number }> {
  const repos = await db.all<{ topics: string; gained_7d: number }>("SELECT topics, gained_7d FROM repos WHERE is_spam = 0");
  const agg = new Map<string, { n: number; g: number }>();
  for (const r of repos) {
    for (const t of new Set(parseJsonArray<string>(r.topics))) {
      const a = agg.get(t) ?? { n: 0, g: 0 };
      a.n++;
      a.g += r.gained_7d;
      agg.set(t, a);
    }
  }
  const top = [...agg.entries()]
    .filter(([, a]) => a.n >= 2)
    .sort((a, b) => b[1].g - a[1].g || a[0].localeCompare(b[0]))
    .slice(0, 500);
  const current = new Map(
    (await db.all<{ topic: string; repo_count: number; gained_7d: number }>("SELECT topic, repo_count, gained_7d FROM topics")).map(
      (t) => [t.topic, t],
    ),
  );
  const nowIso = now.toISOString();
  const changed: SqlValue[][] = top
    .filter(([t, a]) => current.get(t)?.repo_count !== a.n || current.get(t)?.gained_7d !== a.g)
    .map(([t, a]) => [t, a.n, a.g, nowIso]);
  await db.batch(
    chunkedInsert(
      "INSERT INTO topics (topic, repo_count, gained_7d, updated_at)",
      changed,
      "ON CONFLICT (topic) DO UPDATE SET repo_count = excluded.repo_count, gained_7d = excluded.gained_7d, updated_at = excluded.updated_at",
    ),
  );
  const keep = new Set(top.map(([t]) => t));
  const drop = [...current.keys()].filter((t) => !keep.has(t));
  for (let i = 0; i < drop.length; i += 100) {
    const chunk = drop.slice(i, i + 100);
    await db.run(`DELETE FROM topics WHERE topic IN (${chunk.map(() => "?").join(",")})`, chunk);
  }
  return { written: changed.length, dropped: drop.length };
}
