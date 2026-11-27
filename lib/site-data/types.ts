/**
 * Build snapshot shape (.data/site.json). Written by scripts/build-snapshot.ts, read by every
 * public page at build time (lib/site-data/load.ts) and by scripts/emit-static.ts.
 * Never contains README text: the only third-party text is name, short description and topics.
 */
import type { Digest, Ranking, Topic } from "@/lib/db/public";

export interface SnapshotRepo {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  licence: string | null;
  homepage: string | null;
  avatarUrl: string;
  createdAt: string | null;
  pushedAt: string | null;
  summary: string | null;
  summarySource: "ai" | "template" | null;
  gained24h: number;
  gained7d: number;
  gained30d: number;
  isArchived: boolean;
  /** When this repo's page was first prerendered (null = published by this build). */
  firstPublishedAt: string | null;
  /** Why the page is in this build (see select-pages.ts). */
  reason: PageReason;
}

export type PageReason = "pinned" | "ranked" | "published" | "fill";

/** [date, gained that day, total stars at end of day] — oldest first. */
export type HistoryPoint = [string, number, number | null];

/** One day of the all-language Trending lists, for the CC0 /data export. */
export interface DailyExport {
  date: string;
  rows: { period: string; rank: number; repoId: number; gained: number }[];
}

export interface SiteSnapshot {
  version: 2;
  generatedAt: string;
  /** First time the pipeline ranked anything (drives the early-days states). */
  trackingSince: string | null;
  /** computed_at of the newest ranking list. */
  rankingsComputedAt: string | null;
  stats: {
    trackedRepos: number;
    builtRepos: number;
    retiredRepos: number;
    rankedLists: number;
    pageBudget: number;
  };
  rankings: Ranking[];
  repos: SnapshotRepo[];
  topics: Topic[];
  digests: Digest[];
  history: Record<string, HistoryPoint[]>;
  dailyExports: DailyExport[];
}

export const EMPTY_SNAPSHOT: SiteSnapshot = {
  version: 2,
  generatedAt: new Date(0).toISOString(),
  trackingSince: null,
  rankingsComputedAt: null,
  stats: { trackedRepos: 0, builtRepos: 0, retiredRepos: 0, rankedLists: 0, pageBudget: 0 },
  rankings: [],
  repos: [],
  topics: [],
  digests: [],
  history: {},
  dailyExports: [],
};
