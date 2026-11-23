/**
 * Spam guard (spec §4.3): flag a repo when more than 80% of a sample of its recent stargazers
 * are accounts created less than 7 days before they starred. Pure function; the sample is
 * fetched by refresh-metadata via GraphQL (stargazers, newest first).
 */
import type { SpamVerdict } from "./types";

export interface StargazerSample {
  starredAt: string;
  userCreatedAt: string;
}

export interface SpamConfig {
  youngAccountDays: number;
  threshold: number; // ratio strictly above which the repo is flagged
  minSample: number; // below this, never flag (not enough evidence)
}

export const DEFAULT_SPAM_CONFIG: SpamConfig = { youngAccountDays: 7, threshold: 0.8, minSample: 20 };

const DAY = 86_400_000;

export function evaluateStargazers(
  sample: StargazerSample[],
  now: Date,
  cfg: SpamConfig = DEFAULT_SPAM_CONFIG,
): SpamVerdict {
  const valid = sample.filter((s) => !Number.isNaN(Date.parse(s.starredAt)) && !Number.isNaN(Date.parse(s.userCreatedAt)));
  const young = valid.filter((s) => Date.parse(s.starredAt) - Date.parse(s.userCreatedAt) < cfg.youngAccountDays * DAY);
  const ratio = valid.length ? young.length / valid.length : 0;
  return {
    isSpam: valid.length >= cfg.minSample && ratio > cfg.threshold,
    ratio: Math.round(ratio * 1000) / 1000,
    sampled: valid.length,
    checkedAt: now.toISOString(),
  };
}

/** A verdict is reused for 7 days before re-checking. */
export function verdictIsFresh(v: SpamVerdict | undefined, now: Date, maxAgeDays = 7): boolean {
  return !!v && now.getTime() - Date.parse(v.checkedAt) < maxAgeDays * DAY;
}
