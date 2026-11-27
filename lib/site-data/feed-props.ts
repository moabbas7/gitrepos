/** Server-side: initial Feed props for a list from the snapshot (first page only; the rest is static JSON). */
import { PAGE_SIZE, type FeedProps, type FeedReadiness } from "@/lib/feed";
import { ADS_ENABLED } from "@/lib/site";
import type { ListType, RankPeriod } from "@/lib/types";
import type { Site } from "./load";
import { readinessNote } from "./readiness";

export function feedReadiness(site: Site): Record<RankPeriod, FeedReadiness> {
  const out = {} as Record<RankPeriod, FeedReadiness>;
  for (const [p, r] of Object.entries(site.readiness) as [RankPeriod, Site["readiness"][RankPeriod]][]) {
    out[p] = { note: readinessNote(r), progress: r.daysNeeded ? r.daysCovered / r.daysNeeded : 1 };
  }
  return out;
}

export function feedProps(
  site: Site,
  { listType, period = "today", language = "all", listTabs = true, languageFilter = true }: { listType: ListType; period?: RankPeriod; language?: string; listTabs?: boolean; languageFilter?: boolean },
): FeedProps {
  const ranking = site.ranking(listType, period, language);
  const items = ranking?.items ?? [];
  return {
    listType,
    period,
    language,
    initialItems: items.slice(0, PAGE_SIZE),
    initialTotal: items.length,
    computedAt: site.snap.rankingsComputedAt,
    languages: site.languages.map((l) => ({ slug: l.slug, name: l.name })),
    topicPages: site.topics.map((t) => t.topic),
    readiness: feedReadiness(site),
    listTabs,
    languageFilter,
    adsEnabled: ADS_ENABLED,
  };
}
