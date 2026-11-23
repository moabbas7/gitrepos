/** Shared pipeline types. */

export interface Gains {
  today: number; // last 24 complete hours
  week: number; // last 7 days (6 complete days + today so far)
  month: number; // last 30 days (29 complete days + today so far)
}

export interface SpamVerdict {
  isSpam: boolean;
  ratio: number; // share of sampled stargazers that were young accounts
  sampled: number;
  checkedAt: string;
}

/** Repo metadata as cached in the data branch (meta/repos.json.gz) and mirrored into D1 `repos`. */
export interface RepoMeta {
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
  avatarUrl: string | null;
  createdAt: string | null;
  pushedAt: string | null;
  isArchived: boolean;
  isFork: boolean;
  isEmpty: boolean;
  fetchedAt: string;
  /** Repo is gone / private / renamed beyond recognition — skip until it reappears. */
  missing?: boolean;
  spam?: SpamVerdict;
}

/** Per-hour sampled WatchEvent counts (GH Archive): repo id -> [full name, events]. */
export type HourCounts = Map<number, { name: string; count: number }>;

export interface HourFile {
  v: 1;
  hour: string; // YYYY-MM-DDTHH (UTC)
  source: "gharchive" | "search";
  repos: Record<string, [string, number]>;
}

/** True daily star gains (from star history) for tracked repos with >= minStars that day. */
export interface DailyFile {
  v: 2;
  date: string; // YYYY-MM-DD
  minStars: number;
  /** Repos whose history covered the day (whether or not they reached minStars). */
  reposCovered: number;
  /** id -> [full name, stars gained that day, total stars at end of day] */
  repos: Record<string, [string, number, number]>;
}

export type MetaCache = Record<string, RepoMeta>;
