/** Shared (server + client) feed constants and types. Kept out of the "use client" module. */
import type { ListType, RankPeriod, RepoCardData } from "@/lib/types";

export const PAGE_SIZE = 25;

export interface FeedReadiness {
  note: string | null;
  progress: number;
}

export interface FeedProps {
  listType: ListType;
  period: RankPeriod;
  language: string; // "all" or a slug
  initialItems: RepoCardData[];
  initialTotal: number;
  computedAt: string | null;
  languages: { slug: string; name: string }[];
  topicPages: string[];
  readiness: Record<RankPeriod, FeedReadiness>;
  /** Show the Trending / Rising / New tabs. */
  listTabs?: boolean;
  /** Show the language filter. */
  languageFilter?: boolean;
  adsEnabled?: boolean;
  /** id of the heading that labels the feed section. */
  labelledBy?: string;
}
