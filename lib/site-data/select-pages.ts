/**
 * Which repo pages go into this build (pure; unit-tested).
 *
 * Every public page is a static asset and Workers Free allows 20,000 files per version (we stop at
 * 18,000), so the number of repo pages is capped. Priority, highest first:
 *   1. pinned     — page_pins (paid promos in prompt 3, manual pins). Always built.
 *   2. ranked     — in any current ranking list (any type, period or language).
 *   3. published  — had a page before: pages stay up ("no longer trending") instead of 404ing.
 *                   Ordered by recent stars so the least-visited old pages retire first.
 *   4. fill       — other tracked repos, by weekly gains, while budget remains.
 * Published repos that don't fit are "retired": their URL shows the GitHub fallback 404 and the
 * stale-repo prune may delete them.
 */
import type { PageReason } from "./types";

export interface PageCandidate {
  id: number;
  firstPublishedAt: string | null;
  gained30d: number;
  gained7d: number;
  stars: number;
}

export interface PageSelection {
  /** Repo ids to prerender, in priority order. */
  build: number[];
  reason: Map<number, PageReason>;
  /** Previously published repos that no longer fit the budget. */
  retired: number[];
  /** Built now but never published before (first_published_at gets set). */
  newlyPublished: number[];
}

/** Asset files the build needs besides repo pages (list/landing pages, JSON, data, _next assets). */
export const FIXED_FILE_RESERVE = 3000;
/**
 * Static asset files per repo page, measured on a real build (see README "Page budget"):
 * the prerendered page in the OpenNext cache (1) + its pre-generated OG image (1).
 */
export const FILES_PER_REPO = 2;

export function pageBudget({
  maxFiles,
  maxPrebuilt,
  rankedBadges = 0,
  fixedReserve = FIXED_FILE_RESERVE,
  filesPerRepo = FILES_PER_REPO,
}: {
  maxFiles: number;
  maxPrebuilt: number;
  /** One rank-badge SVG per currently ranked repo. */
  rankedBadges?: number;
  fixedReserve?: number;
  filesPerRepo?: number;
}): number {
  const byFiles = Math.floor((maxFiles - fixedReserve - rankedBadges) / filesPerRepo);
  return Math.max(0, Math.min(maxPrebuilt, byFiles));
}

const byRecentStars = (a: PageCandidate, b: PageCandidate) =>
  b.gained30d - a.gained30d || b.gained7d - a.gained7d || b.stars - a.stars || a.id - b.id;
const byWeek = (a: PageCandidate, b: PageCandidate) => b.gained7d - a.gained7d || b.stars - a.stars || a.id - b.id;

export function selectPages({
  candidates,
  rankedIds,
  pinnedIds,
  budget,
}: {
  /** Every eligible (non-spam) repo row. Ids not in here are never built. */
  candidates: PageCandidate[];
  rankedIds: Iterable<number>;
  pinnedIds: Iterable<number>;
  budget: number;
}): PageSelection {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const pinned = new Set([...pinnedIds].filter((id) => byId.has(id)));
  const ranked = new Set([...rankedIds].filter((id) => byId.has(id) && !pinned.has(id)));
  const tiers: [PageReason, PageCandidate[]][] = [
    ["pinned", [...pinned].map((id) => byId.get(id)!).sort(byRecentStars)],
    ["ranked", [...ranked].map((id) => byId.get(id)!).sort(byWeek)],
    ["published", candidates.filter((c) => c.firstPublishedAt && !pinned.has(c.id) && !ranked.has(c.id)).sort(byRecentStars)],
    ["fill", candidates.filter((c) => !c.firstPublishedAt && !pinned.has(c.id) && !ranked.has(c.id)).sort(byWeek)],
  ];

  const build: number[] = [];
  const reason = new Map<number, PageReason>();
  for (const [r, list] of tiers) {
    for (const c of list) {
      // Pins are paid for: they are built even past the budget.
      if (build.length >= budget && r !== "pinned") break;
      build.push(c.id);
      reason.set(c.id, r);
    }
  }
  const retired = candidates.filter((c) => c.firstPublishedAt && !reason.has(c.id)).map((c) => c.id);
  const newlyPublished = build.filter((id) => !byId.get(id)!.firstPublishedAt);
  return { build, reason, retired, newlyPublished };
}
