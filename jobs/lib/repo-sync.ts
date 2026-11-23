/**
 * Mirrors repo metadata into D1 `repos` while spending as few row-writes as possible:
 *  - reads current values first (reads are cheap: 5M/day) and skips rows that haven't changed;
 *  - never SETs full_name unless the repo was renamed (avoids touching the unique index);
 *  - inserts are multi-row and chunked to D1's 100-parameter limit.
 */
import type { Db, SqlValue, Statement } from "@/lib/db/types";
import { inClauseChunks, placeholders } from "@/lib/db/limits";
import { chunkedInsert } from "./sql";
import type { Gains, RepoMeta } from "./types";

export interface RepoUpsert {
  meta: RepoMeta;
  gains: Gains;
  rankToday?: number | null;
}

interface ExistingRow {
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
  is_archived: number;
  is_fork: number;
  is_empty: number;
  is_spam: number;
  spam_checked_at: string | null;
  gained_24h: number;
  gained_7d: number;
  gained_30d: number;
  rank_today: number | null;
}

const MUTABLE = [
  "owner", "name", "description", "language", "topics", "stars", "forks", "issues", "watchers", "licence",
  "homepage", "avatar_url", "created_at", "pushed_at", "is_archived", "is_fork", "is_empty", "is_spam",
  "spam_checked_at", "gained_24h", "gained_7d", "gained_30d", "rank_today",
] as const;
type Mutable = (typeof MUTABLE)[number];

export function rowValues(u: RepoUpsert): Record<Mutable, SqlValue> {
  const m = u.meta;
  return {
    owner: m.owner,
    name: m.name,
    description: m.description,
    language: m.language,
    topics: JSON.stringify(m.topics.slice(0, 20)),
    stars: m.stars,
    forks: m.forks,
    issues: m.issues,
    watchers: m.watchers,
    licence: m.licence,
    homepage: m.homepage,
    avatar_url: m.avatarUrl,
    created_at: m.createdAt,
    pushed_at: m.pushedAt,
    is_archived: m.isArchived ? 1 : 0,
    is_fork: m.isFork ? 1 : 0,
    is_empty: m.isEmpty ? 1 : 0,
    is_spam: m.spam?.isSpam ? 1 : 0,
    spam_checked_at: m.spam?.checkedAt ?? null,
    gained_24h: u.gains.today,
    gained_7d: u.gains.week,
    gained_30d: u.gains.month,
    rank_today: u.rankToday ?? null,
  };
}

/** Columns whose values differ (pure; exported for tests). */
export function changedColumns(existing: ExistingRow, next: Record<Mutable, SqlValue>): Mutable[] {
  return MUTABLE.filter((c) => (existing[c] ?? null) !== (next[c] ?? null));
}

export async function loadExisting(db: Db, ids: number[]): Promise<Map<number, ExistingRow>> {
  const out = new Map<number, ExistingRow>();
  for (const chunk of inClauseChunks(ids)) {
    const rows = await db.all<ExistingRow>(
      `SELECT id, full_name, ${MUTABLE.join(", ")} FROM repos WHERE id IN (${placeholders(chunk)})`,
      chunk,
    );
    for (const r of rows) out.set(r.id, r);
  }
  return out;
}

export interface SyncResult {
  inserted: number;
  updated: number;
  unchanged: number;
}

/**
 * @param insertOnly  only add repos that aren't in D1 yet (used by the hourly rank job);
 *                    existing rows are refreshed by refresh-metadata every 6h.
 */
export async function syncRepos(
  db: Db,
  items: RepoUpsert[],
  now: Date,
  { insertOnly = false }: { insertOnly?: boolean } = {},
): Promise<SyncResult> {
  const valid = items.filter((u) => !u.meta.missing);
  const existing = await loadExisting(db, valid.map((u) => u.meta.id));
  const nowIso = now.toISOString();
  const inserts: SqlValue[][] = [];
  const updates: Statement[] = [];
  let unchanged = 0;

  for (const u of valid) {
    const next = rowValues(u);
    const fullName = `${u.meta.owner}/${u.meta.name}`.toLowerCase();
    const ex = existing.get(u.meta.id);
    if (!ex) {
      inserts.push([u.meta.id, fullName, ...MUTABLE.map((c) => next[c]), nowIso, nowIso, nowIso]);
      continue;
    }
    if (insertOnly) {
      unchanged++;
      continue;
    }
    const cols = changedColumns(ex, next);
    const renamed = ex.full_name !== fullName;
    if (!cols.length && !renamed) {
      unchanged++;
      continue;
    }
    const sets = cols.map((c) => `${c} = ?`);
    const params: SqlValue[] = cols.map((c) => next[c]);
    if (renamed) {
      sets.push("full_name = ?");
      params.push(fullName);
    }
    sets.push("meta_refreshed_at = ?", "updated_at = ?");
    params.push(nowIso, nowIso, u.meta.id);
    updates.push({ sql: `UPDATE repos SET ${sets.join(", ")} WHERE id = ?`, params });
  }

  const insertStmts = chunkedInsert(
    `INSERT INTO repos (id, full_name, ${MUTABLE.join(", ")}, tracked_at, meta_refreshed_at, updated_at)`,
    inserts,
    // A rename collision (another id holds this full_name) must not abort the batch.
    "ON CONFLICT DO NOTHING",
  );
  await db.batch([...insertStmts, ...updates]);
  return { inserted: inserts.length, updated: updates.length, unchanged };
}
