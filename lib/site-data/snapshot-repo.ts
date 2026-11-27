/** D1 public repo row -> snapshot repo (no README text: RepoRow has no readme column). */
import { parseJsonArray, type RepoRow } from "@/lib/db/public";
import type { PageReason, SnapshotRepo } from "./types";

export function toSnapshotRepo(r: RepoRow, reason: PageReason, publishedAt: string): SnapshotRepo {
  return {
    id: r.id,
    owner: r.owner,
    name: r.name,
    description: r.description,
    language: r.language,
    topics: parseJsonArray<string>(r.topics),
    stars: r.stars,
    forks: r.forks,
    issues: r.issues,
    watchers: r.watchers,
    licence: r.licence,
    homepage: r.homepage,
    avatarUrl: r.avatar_url ?? `https://github.com/${r.owner}.png?size=64`,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    summary: r.summary,
    summarySource: r.summary_source,
    gained24h: r.gained_24h,
    gained7d: r.gained_7d,
    gained30d: r.gained_30d,
    isArchived: !!r.is_archived,
    firstPublishedAt: r.first_published_at ?? publishedAt,
    reason,
  };
}
