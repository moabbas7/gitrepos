/**
 * Page selection against the database: which repo pages the next build prerenders. Shared by
 * scripts/build-snapshot.ts (what to build) and rollup-and-prune (what must not be deleted), so
 * both always agree. The pure logic and its tests live in lib/site-data/select-pages.ts.
 */
import { listPageCandidates, listPinnedRepoIds, listRankings, type Ranking } from "@/lib/db/public";
import { inClauseChunks, placeholders } from "@/lib/db/limits";
import type { Db } from "@/lib/db/types";
import { pageBudget, selectPages, type PageSelection } from "@/lib/site-data/select-pages";
import type { WriteBudget } from "./budget";

export interface DbPageSelection {
  selection: PageSelection;
  rankings: Ranking[];
  rankedIds: Set<number>;
  budget: number;
  trackedRepos: number;
}

export function rankedIdsOf(rankings: readonly Ranking[]): Set<number> {
  const ids = new Set<number>();
  for (const r of rankings) for (const i of r.items) ids.add(i.id);
  return ids;
}

export async function computePageSelection(
  db: Db,
  now: Date,
  opts: { maxFiles: number; maxPrebuilt: number },
): Promise<DbPageSelection> {
  const [rankings, rows, pinned] = await Promise.all([listRankings(db), listPageCandidates(db), listPinnedRepoIds(db, now.toISOString())]);
  const rankedIds = rankedIdsOf(rankings);
  const budget = pageBudget({ maxFiles: opts.maxFiles, maxPrebuilt: opts.maxPrebuilt, rankedBadges: rankedIds.size });
  const selection = selectPages({
    candidates: rows.map((r) => ({
      id: r.id,
      firstPublishedAt: r.first_published_at,
      gained30d: r.gained_30d,
      gained7d: r.gained_7d,
      stars: r.stars,
    })),
    rankedIds,
    pinnedIds: pinned,
    budget,
  });
  return { selection, rankings, rankedIds, budget, trackedRepos: rows.length };
}

/**
 * Records first publication for newly built repos (one write each, once ever). Skips quietly
 * when the D1 write budget is too low: they're simply marked on a later build.
 */
export async function markPublished(db: Db, ids: readonly number[], nowIso: string, budget?: WriteBudget): Promise<number> {
  let marked = 0;
  for (const chunk of inClauseChunks(ids, 1)) {
    if (budget && !budget.canAfford(chunk.length)) break;
    const r = await db.run(
      `UPDATE repos SET first_published_at = ? WHERE first_published_at IS NULL AND id IN (${placeholders(chunk)})`,
      [nowIso, ...chunk],
    );
    marked += r.changes;
  }
  return marked;
}
