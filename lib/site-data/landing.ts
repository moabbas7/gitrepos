/** Which SEO landing pages exist (pure; unit-tested). Same templates, data from the snapshot. */
import type { Ranking } from "@/lib/db/public";

export interface LanguagePage {
  slug: string;
  name: string;
  /** Repos in this language's weekly Trending list. */
  count: number;
}

/** One page per language that has its own ranking lists (the pipeline ranks the top 25). */
export function languagePages(rankings: readonly Ranking[]): LanguagePage[] {
  const out = new Map<string, LanguagePage>();
  for (const r of rankings) {
    if (r.language === "all" || !r.items.length) continue;
    const prev = out.get(r.language);
    const count = r.listType === "trending" && r.period === "week" ? r.items.length : 0;
    if (!prev) out.set(r.language, { slug: r.language, name: r.items[0].language ?? r.language, count });
    else prev.count = Math.max(prev.count, count);
  }
  return [...out.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface TopicPage {
  topic: string;
  count: number;
  gained7d: number;
}

export const TOPIC_MIN_REPOS = 3;
export const TOPIC_MAX_PAGES = 300;

/** Topic slugs are GitHub topics: lowercase letters, digits and hyphens only. */
export const isTopicSlug = (t: string) => /^[a-z0-9][a-z0-9-]{0,49}$/.test(t);

/**
 * Topic pages come from the repos in this build (so every listed repo has a page), keeping topics
 * with at least TOPIC_MIN_REPOS repos (avoids thin pages). Works before the topics table fills in.
 */
export function topicPages(
  repos: readonly { topics: string[]; gained7d: number }[],
  { min = TOPIC_MIN_REPOS, max = TOPIC_MAX_PAGES } = {},
): TopicPage[] {
  const agg = new Map<string, TopicPage>();
  for (const r of repos) {
    for (const t of r.topics) {
      if (!isTopicSlug(t)) continue;
      const a = agg.get(t) ?? { topic: t, count: 0, gained7d: 0 };
      a.count++;
      a.gained7d += Math.max(0, r.gained7d);
      agg.set(t, a);
    }
  }
  return [...agg.values()]
    .filter((t) => t.count >= min)
    .sort((a, b) => b.gained7d - a.gained7d || b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, max);
}
