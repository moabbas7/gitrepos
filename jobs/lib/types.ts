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

/** Per-hour star counts: repo id -> [full name, stars in that hour]. */
export type HourCounts = Map<number, { name: string; count: number }>;

export interface HourFile {
  v: 1;
  hour: string; // YYYY-MM-DDTHH (UTC)
  source: "gharchive" | "search";
  repos: Record<string, [string, number]>;
}

export interface DailyFile {
  v: 1;
  date: string; // YYYY-MM-DD
  minStars: number;
  hoursCovered: number; // 24 when complete
  repos: Record<string, [string, number]>;
}

export type MetaCache = Record<string, RepoMeta>;
