/**
 * Pure ranking logic (spec §4.3). No I/O — fully unit-tested.
 *  - Trending (Today / Week / Month): stars gained in the window.
 *  - Rising: gained ÷ stars at window start, for repos that started with 50–5,000 stars.
 *  - New: created in the last 30 days, sorted by stars gained in the window.
 *  - HOT badge: top 1% of 24h velocity (with a small absolute floor).
 *  - Exclusions: archived, forks, empty, missing, and spam-flagged repos.
 */
import { languageSlug } from "@/lib/languages";
import type { ListType, RankPeriod, RepoCardData } from "@/lib/types";
import type { Gains, RepoMeta } from "./types";

export const PERIODS: RankPeriod[] = ["today", "week", "month"];
export const LIST_TYPES: ListType[] = ["trending", "rising", "new"];

export interface RankConfig {
  listSize: number; // items per list
  maxLanguages: number; // per-language lists for the top-N languages
  risingMinStars: number;
  risingMaxStars: number;
  risingMinGained: Record<RankPeriod, number>;
  newMaxAgeDays: number;
  hotPercentile: number; // 0.99 => top 1%
  hotMinToday: number;
  minGained: Record<RankPeriod, number>;
}

export const DEFAULT_RANK_CONFIG: RankConfig = {
  listSize: 100,
  maxLanguages: 25,
  risingMinStars: 50,
  risingMaxStars: 5000,
  risingMinGained: { today: 5, week: 15, month: 30 },
  newMaxAgeDays: 30,
  hotPercentile: 0.99,
  hotMinToday: 20,
  minGained: { today: 1, week: 1, month: 1 },
};

export interface Candidate {
  meta: RepoMeta;
  gains: Gains;
  spark: number[];
}

export interface RankedList {
  listType: ListType;
  period: RankPeriod;
  language: string; // 'all' or language slug
  items: RepoCardData[];
}

export function isEligible(m: RepoMeta): boolean {
  return !m.missing && !m.isArchived && !m.isFork && !m.isEmpty && !m.spam?.isSpam;
}

const DAY = 86_400_000;

/** Value at the given percentile (nearest-rank) of a list of numbers. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

/** Threshold for the HOT badge: top 1% of positive 24h gains, never below hotMinToday. */
export function hotThreshold(cands: Candidate[], cfg: RankConfig = DEFAULT_RANK_CONFIG): number {
  const vals = cands.map((c) => c.gains.today).filter((v) => v > 0);
  return Math.max(cfg.hotMinToday, percentile(vals, cfg.hotPercentile));
}

export function risingScore(c: Candidate, period: RankPeriod, cfg: RankConfig = DEFAULT_RANK_CONFIG): number | null {
  const gained = c.gains[period];
  const start = c.meta.stars - gained;
  if (start < cfg.risingMinStars || start > cfg.risingMaxStars) return null;
  if (gained < cfg.risingMinGained[period]) return null;
  return gained / start;
}

export function isNewRepo(m: RepoMeta, now: Date, maxAgeDays: number): boolean {
  if (!m.createdAt) return false;
  const age = now.getTime() - new Date(m.createdAt).getTime();
  return age >= 0 && age <= maxAgeDays * DAY;
}

/** NEW badge = created this calendar year (spec §3.1). */
export function createdThisYear(m: RepoMeta, now: Date): boolean {
  return !!m.createdAt && new Date(m.createdAt).getUTCFullYear() === now.getUTCFullYear();
}

function byGainedThenStars(period: RankPeriod) {
  return (a: Candidate, b: Candidate) =>
    b.gains[period] - a.gains[period] || b.meta.stars - a.meta.stars || a.meta.id - b.meta.id;
}

export function toCard(c: Candidate, rank: number, period: RankPeriod, now: Date, hotMin: number): RepoCardData {
  const m = c.meta;
  return {
    id: m.id,
    owner: m.owner,
    name: m.name,
    description: m.description ? truncate(m.description, 180) : null,
    language: m.language,
    topics: m.topics.slice(0, 4),
    stars: m.stars,
    forks: m.forks,
    avatarUrl: m.avatarUrl ?? `https://github.com/${m.owner}.png?size=64`,
    createdAt: m.createdAt ?? "",
    gained: c.gains[period],
    spark: c.spark,
    rank,
    isNew: createdThisYear(m, now) || undefined,
    isHot: c.gains.today >= hotMin || undefined,
  };
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n - 1).trimEnd()}…` : clean;
}

/** Orders one list. Returns candidates (not cards) so callers can reuse it per language. */
export function orderList(
  cands: Candidate[],
  listType: ListType,
  period: RankPeriod,
  now: Date,
  cfg: RankConfig = DEFAULT_RANK_CONFIG,
): Candidate[] {
  const eligible = cands.filter((c) => isEligible(c.meta));
  switch (listType) {
    case "trending":
      return eligible.filter((c) => c.gains[period] >= cfg.minGained[period]).sort(byGainedThenStars(period));
    case "new":
      return eligible
        .filter((c) => isNewRepo(c.meta, now, cfg.newMaxAgeDays) && c.gains[period] >= cfg.minGained[period])
        .sort(byGainedThenStars(period));
    case "rising":
      return eligible
        .map((c) => ({ c, s: risingScore(c, period, cfg) }))
        .filter((x): x is { c: Candidate; s: number } => x.s !== null)
        .sort((a, b) => b.s - a.s || b.c.gains[period] - a.c.gains[period] || a.c.meta.id - b.c.meta.id)
        .map((x) => x.c);
  }
}

/** Languages that get their own lists: most represented among repos trending this week. */
export function topLanguages(cands: Candidate[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const c of cands) {
    if (!c.meta.language || !isEligible(c.meta) || c.gains.week <= 0) continue;
    counts.set(c.meta.language, (counts.get(c.meta.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([l]) => l);
}

/** Computes every list: 3 list types × 3 periods × ('all' + top languages). */
export function rankAll(cands: Candidate[], now: Date, cfg: RankConfig = DEFAULT_RANK_CONFIG): RankedList[] {
  const hotMin = hotThreshold(cands.filter((c) => isEligible(c.meta)), cfg);
  const languages = topLanguages(cands, cfg.maxLanguages);
  const out: RankedList[] = [];
  for (const listType of LIST_TYPES) {
    for (const period of PERIODS) {
      const ordered = orderList(cands, listType, period, now, cfg);
      const mk = (lst: Candidate[]) => lst.slice(0, cfg.listSize).map((c, i) => toCard(c, i + 1, period, now, hotMin));
      out.push({ listType, period, language: "all", items: mk(ordered) });
      for (const lang of languages) {
        const items = mk(ordered.filter((c) => c.meta.language === lang));
        if (items.length) out.push({ listType, period, language: languageSlug(lang), items });
      }
    }
  }
  return out;
}
