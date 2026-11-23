/** Card-ready repo data. Also the item shape stored in `rankings.payload` JSON. */
export interface RepoCardData {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  avatarUrl: string;
  createdAt: string; // ISO
  /** Stars gained in the list's period. */
  gained: number;
  /** Daily gains, oldest -> newest (7 points for cards). */
  spark: number[];
  rank: number;
  isNew?: boolean;
  isHot?: boolean;
}

export type ListType = "trending" | "rising" | "new";
export type RankPeriod = "today" | "week" | "month";

export interface SponsorCardData {
  id: string;
  company: string;
  tagline: string; // max 90 chars
  url: string; // goes through /go/[id] once the click tracker exists
  logoUrl?: string | null;
}
