/**
 * Build-time access to the snapshot for pages (server components only). Reads .data/site.json
 * once per build worker. A missing or unreadable file yields an empty snapshot, so every page
 * still renders (with its empty state) — e.g. CI builds without data, or a runtime 404 render.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Digest, Ranking } from "@/lib/db/public";
import type { ListType, RankPeriod, RepoCardData } from "@/lib/types";
import { badgeLabels } from "./badge";
import { languagePages, topicPages, type LanguagePage, type TopicPage } from "./landing";
import { periodReadiness, type PeriodReadiness } from "./readiness";
import { EMPTY_SNAPSHOT, type SiteSnapshot, type SnapshotRepo } from "./types";

export interface Site {
  snap: SiteSnapshot;
  repos: SnapshotRepo[];
  repoByPath: Map<string, SnapshotRepo>;
  repoById: Map<number, SnapshotRepo>;
  /** Current badge/placement label per ranked repo id. */
  placement: Map<number, string>;
  languages: LanguagePage[];
  topics: TopicPage[];
  readiness: Record<RankPeriod, PeriodReadiness>;
  ranking: (listType: ListType, period: RankPeriod, language?: string) => Ranking | null;
  digest: (kind: Digest["kind"], key: string) => Digest | null;
  /** Topic slugs used by `items` that have a /topic page (keeps card-list props small). */
  linkedTopics: (items: readonly { topics: string[] }[]) => string[];
  /** Card data for a built repo (for topic pages, related repos, digests). */
  card: (r: SnapshotRepo, gained: number, rank: number) => RepoCardData;
}

let cached: Site | null = null;

export const repoPath = (owner: string, name: string) => `${owner}/${name}`.toLowerCase();

function readSnapshot(): SiteSnapshot {
  try {
    const snap = JSON.parse(readFileSync(join(process.cwd(), ".data", "site.json"), "utf8")) as SiteSnapshot;
    if (snap.version !== 2) return EMPTY_SNAPSHOT;
    return snap;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export function buildSite(snap: SiteSnapshot, now = new Date(snap.generatedAt)): Site {
  const repoById = new Map(snap.repos.map((r) => [r.id, r]));
  const repoByPath = new Map(snap.repos.map((r) => [repoPath(r.owner, r.name), r]));
  const lists = new Map(snap.rankings.map((r) => [`${r.listType}:${r.period}:${r.language}`, r]));
  const digests = new Map(snap.digests.map((d) => [`${d.kind}:${d.periodKey}`, d]));
  const spark = (id: number) => (snap.history[id] ?? []).slice(-7).map((p) => p[1]);
  const thisYear = now.getUTCFullYear();
  const topics = topicPages(snap.repos);
  const topicSet = new Set(topics.map((t) => t.topic));
  return {
    snap,
    repos: snap.repos,
    repoByPath,
    repoById,
    placement: badgeLabels(snap.rankings),
    languages: languagePages(snap.rankings),
    topics,
    linkedTopics: (items) => [...new Set(items.flatMap((i) => i.topics.slice(0, 4)))].filter((t) => topicSet.has(t)),
    readiness: periodReadiness(snap.trackingSince, now),
    ranking: (t, p, l = "all") => lists.get(`${t}:${p}:${l}`) ?? null,
    digest: (k, key) => digests.get(`${k}:${key}`) ?? null,
    card: (r, gained, rank) => ({
      id: r.id,
      owner: r.owner,
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics.slice(0, 4),
      stars: r.stars,
      forks: r.forks,
      avatarUrl: r.avatarUrl,
      createdAt: r.createdAt ?? "",
      gained,
      spark: spark(r.id),
      rank,
      isNew: (r.createdAt && new Date(r.createdAt).getUTCFullYear() === thisYear) || undefined,
    }),
  };
}

export function getSite(): Site {
  if (!cached) cached = buildSite(readSnapshot());
  return cached;
}
