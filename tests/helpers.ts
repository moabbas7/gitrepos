import type { Candidate } from "../jobs/lib/rank-core";
import type { RepoMeta } from "../jobs/lib/types";

export const NOW = new Date("2026-11-23T12:00:00Z");

export function meta(id: number, over: Partial<RepoMeta> = {}): RepoMeta {
  return {
    id,
    owner: `owner${id}`,
    name: `repo${id}`,
    description: `Repo ${id}`,
    language: "TypeScript",
    topics: ["t"],
    stars: 1000,
    forks: 10,
    issues: 1,
    watchers: 5,
    licence: "MIT",
    homepage: null,
    avatarUrl: `https://avatars.githubusercontent.com/u/${id}`,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2026-11-22T00:00:00Z",
    isArchived: false,
    isFork: false,
    isEmpty: false,
    fetchedAt: NOW.toISOString(),
    ...over,
  };
}

export function cand(
  id: number,
  gains: Partial<Candidate["gains"]> = {},
  over: Partial<RepoMeta> = {},
): Candidate {
  return {
    meta: meta(id, over),
    gains: { today: 0, week: 0, month: 0, ...gains },
    spark: [0, 0, 0, 0, 0, 0, gains.today ?? 0],
  };
}
