/**
 * PUBLIC read-only queries — the only DB module page code / the build snapshot may use.
 * Touches only repos, repo_daily, rankings, topics and digests. No writes, no commerce tables.
 * (Replaces Supabase "public read" RLS: everything else lives in lib/db/server-only.ts.)
 */
import type { ListType, RankPeriod, RepoCardData } from "@/lib/types";
import { inClauseChunks, placeholders } from "./limits";
import type { Db } from "./types";

export interface RepoRow {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string;
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  licence: string | null;
  homepage: string | null;
  avatar_url: string | null;
  created_at: string | null;
  pushed_at: string | null;
  summary: string | null;
  summary_source: "ai" | "template" | null;
  readme_excerpt: string | null;
  is_archived: number;
  is_fork: number;
  is_spam: number;
  gained_24h: number;
  gained_7d: number;
  gained_30d: number;
  rank_today: number | null;
  updated_at: string;
}

export interface Ranking {
  listType: ListType;
  period: RankPeriod;
  language: string;
  items: RepoCardData[];
  source: string;
  computedAt: string;
}

export interface Topic {
  topic: string;
  repoCount: number;
  gained7d: number;
}

export interface Digest {
  id: string;
  kind: "weekly" | "monthly";
  periodKey: string;
  title: string;
  intro: string | null;
  items: RepoCardData[];
  publishedAt: string;
}

const PUBLIC_REPO_COLUMNS = `id, owner, name, full_name, description, language, topics, stars, forks, issues,
  watchers, licence, homepage, avatar_url, created_at, pushed_at, summary, summary_source, readme_excerpt,
  is_archived, is_fork, is_spam, gained_24h, gained_7d, gained_30d, rank_today, updated_at`;

export function parseJsonArray<T>(s: string | null | undefined, fallback: T[] = []): T[] {
  if (!s) return fallback;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export async function getRanking(
  db: Db,
  listType: ListType,
  period: RankPeriod,
  language = "all",
): Promise<Ranking | null> {
  const row = await db.first<{ payload: string; source: string; computed_at: string }>(
    "SELECT payload, source, computed_at FROM rankings WHERE list_type = ? AND period = ? AND language = ?",
    [listType, period, language],
  );
  if (!row) return null;
  return {
    listType,
    period,
    language,
    items: parseJsonArray<RepoCardData>(row.payload),
    source: row.source,
    computedAt: row.computed_at,
  };
}

export async function listRankings(db: Db): Promise<Ranking[]> {
  const rows = await db.all<{
    list_type: ListType;
    period: RankPeriod;
    language: string;
    payload: string;
    source: string;
    computed_at: string;
  }>("SELECT list_type, period, language, payload, source, computed_at FROM rankings");
  return rows.map((r) => ({
    listType: r.list_type,
    period: r.period,
    language: r.language,
    items: parseJsonArray<RepoCardData>(r.payload),
    source: r.source,
    computedAt: r.computed_at,
  }));
}

export async function getRepoByFullName(db: Db, owner: string, name: string): Promise<RepoRow | null> {
  return db.first<RepoRow>(`SELECT ${PUBLIC_REPO_COLUMNS} FROM repos WHERE full_name = ?`, [
    `${owner}/${name}`.toLowerCase(),
  ]);
}

/** Repos to prerender, best first (capped by MAX_PREBUILT_REPOS at build). Excludes spam. */
export async function listPublishedRepos(db: Db, limit: number): Promise<RepoRow[]> {
  return db.all<RepoRow>(
    `SELECT ${PUBLIC_REPO_COLUMNS} FROM repos WHERE is_spam = 0
     ORDER BY gained_7d DESC, stars DESC LIMIT ?`,
    [limit],
  );
}

export async function getRepoDaily(
  db: Db,
  repoId: number,
  sinceDate: string,
): Promise<{ date: string; gained: number; stars: number | null }[]> {
  return db.all("SELECT date, gained, stars FROM repo_daily WHERE repo_id = ? AND date >= ? ORDER BY date", [
    repoId,
    sinceDate,
  ]);
}

/** Daily history for many repos, chunked to D1's 100-parameter limit (1 slot reserved for `since`). */
export async function getRepoHistory(
  db: Db,
  repoIds: readonly number[],
  sinceDate: string,
): Promise<Map<number, [string, number, number | null][]>> {
  const out = new Map<number, [string, number, number | null][]>();
  for (const id of repoIds) out.set(id, []);
  for (const chunk of inClauseChunks(repoIds, 1)) {
    const rows = await db.all<{ repo_id: number; date: string; gained: number; stars: number | null }>(
      `SELECT repo_id, date, gained, stars FROM repo_daily
       WHERE repo_id IN (${placeholders(chunk)}) AND date >= ? ORDER BY repo_id, date`,
      [...chunk, sinceDate],
    );
    for (const r of rows) out.get(r.repo_id)!.push([r.date, r.gained, r.stars]);
  }
  return out;
}

export async function listTopics(db: Db, limit = 200): Promise<Topic[]> {
  const rows = await db.all<{ topic: string; repo_count: number; gained_7d: number }>(
    "SELECT topic, repo_count, gained_7d FROM topics ORDER BY gained_7d DESC LIMIT ?",
    [limit],
  );
  return rows.map((r) => ({ topic: r.topic, repoCount: r.repo_count, gained7d: r.gained_7d }));
}

export async function listDigests(db: Db): Promise<Digest[]> {
  const rows = await db.all<{
    id: string;
    kind: "weekly" | "monthly";
    period_key: string;
    title: string;
    intro: string | null;
    payload: string;
    published_at: string;
  }>("SELECT id, kind, period_key, title, intro, payload, published_at FROM digests ORDER BY published_at DESC");
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    periodKey: r.period_key,
    title: r.title,
    intro: r.intro,
    items: parseJsonArray<RepoCardData>(r.payload),
    publishedAt: r.published_at,
  }));
}

export async function countPublishedRepos(db: Db): Promise<number> {
  const r = await db.first<{ n: number }>("SELECT COUNT(*) AS n FROM repos WHERE is_spam = 0");
  return r?.n ?? 0;
}
