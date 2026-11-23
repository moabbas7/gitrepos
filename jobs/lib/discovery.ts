/**
 * Repo discovery via GitHub Search (spec §4.2 fallback, now also a regular discovery source):
 * `stars:>50 pushed:>=…` and `stars:>50 created:>=…`, split by language to get past the
 * 1,000-results-per-query cap. Search results include stargazers_count, so each hit is also a
 * free star-history point. Bounded: ~42 calls (≈1.5 min at 30 req/min) per run.
 */
import { mapSearchRepo, type GitHub } from "./github";
import { addPoint, type StarHistory } from "./star-history";
import { DAY_MS } from "./time";
import type { MetaCache } from "./types";

export const DISCOVERY_LANGUAGES = [
  "TypeScript", "Python", "JavaScript", "Go", "Rust", "Java", "C++", "C", "C#", "Swift",
  "Kotlin", "PHP", "Ruby", "Shell", "Jupyter Notebook", "Dart", "Zig", "Lua", "HTML", "Vue",
];

export function discoveryQueries(now: Date): string[] {
  const pushedSince = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  const createdSince = new Date(now.getTime() - 30 * DAY_MS).toISOString().slice(0, 10);
  const out: string[] = [];
  for (const lang of [...DISCOVERY_LANGUAGES.map((l) => `language:"${l}"`), ""]) {
    out.push(`stars:>50 pushed:>=${pushedSince} ${lang}`.trim(), `stars:>50 created:>=${createdSince} ${lang}`.trim());
  }
  return out;
}

export async function discoverViaSearch(
  gh: GitHub,
  cache: MetaCache,
  hist: StarHistory,
  now: Date,
  { pagesPerQuery = 1 }: { pagesPerQuery?: number } = {},
): Promise<{ seen: number; added: number }> {
  if (!gh.enabled) return { seen: 0, added: 0 };
  const fetchedAt = now.toISOString();
  let seen = 0;
  let added = 0;
  for (const q of discoveryQueries(now)) {
    for (const r of await gh.searchRepos(q, pagesPerQuery)) {
      const m = mapSearchRepo(r, fetchedAt);
      seen++;
      if (!cache[m.id]) added++;
      cache[m.id] = { ...m, spam: cache[m.id]?.spam };
      addPoint(hist, m.id, now, m.stars);
    }
  }
  return { seen, added };
}
