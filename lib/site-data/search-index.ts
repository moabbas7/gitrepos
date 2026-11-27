/**
 * Static search index (built at build time into /search-index.json) and the matcher the command
 * palette uses in the browser. No runtime queries. Pure; unit-tested.
 */
export interface SearchIndex {
  v: 1;
  /** [owner, name, description (≤ 90 chars), stars, language] */
  r: [string, string, string, number, string][];
  /** [topic, repo count] */
  t: [string, number][];
  /** [slug, display name] */
  l: [string, string][];
}

export type SearchHit =
  | { kind: "repo"; owner: string; name: string; description: string; stars: number; language: string; href: string }
  | { kind: "topic"; topic: string; count: number; href: string }
  | { kind: "language"; slug: string; name: string; href: string };

const clip = (s: string | null, n: number) => {
  const c = (s ?? "").replace(/\s+/g, " ").trim();
  return c.length > n ? `${c.slice(0, n - 1).trimEnd()}…` : c;
};

export function buildSearchIndex(
  repos: readonly { owner: string; name: string; description: string | null; stars: number; language: string | null }[],
  topics: readonly { topic: string; count: number }[],
  languages: readonly { slug: string; name: string }[],
): SearchIndex {
  return {
    v: 1,
    r: [...repos]
      .sort((a, b) => b.stars - a.stars)
      .map((r) => [r.owner, r.name, clip(r.description, 90), r.stars, r.language ?? ""]),
    t: topics.map((t) => [t.topic, t.count]),
    l: languages.map((l) => [l.slug, l.name]),
  };
}

/** Lower score = better. null = no match. */
function score(hay: string, q: string): number | null {
  const i = hay.indexOf(q);
  if (i < 0) return null;
  if (hay === q) return 0;
  if (i === 0) return 1;
  return /[\s/._-]/.test(hay[i - 1]) ? 2 : 3;
}

export function searchIndex(index: SearchIndex, query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return [];
  const hits: { hit: SearchHit; s: number; stars: number }[] = [];
  for (const [slug, name] of index.l) {
    const s = score(name.toLowerCase(), q);
    if (s !== null) hits.push({ hit: { kind: "language", slug, name, href: `/language/${slug}` }, s: s - 0.5, stars: Infinity });
  }
  for (const [topic, count] of index.t) {
    const s = score(topic, q.replace(/\s+/g, "-"));
    if (s !== null) hits.push({ hit: { kind: "topic", topic, count, href: `/topic/${topic}` }, s: s + 0.25, stars: count });
  }
  for (const [owner, name, description, stars, language] of index.r) {
    const full = `${owner}/${name}`.toLowerCase();
    const sName = score(name.toLowerCase(), q);
    const sFull = score(full, q);
    const sDesc = score(description.toLowerCase(), q);
    const best = Math.min(sName ?? 9, sFull === null ? 9 : sFull + 0.5, sDesc === null ? 9 : sDesc + 4);
    if (best < 9) {
      hits.push({
        hit: { kind: "repo", owner, name, description, stars, language, href: `/repo/${owner}/${name}` },
        s: best,
        stars,
      });
    }
  }
  return hits
    .sort((a, b) => a.s - b.s || b.stars - a.stars)
    .slice(0, limit)
    .map((h) => h.hit);
}
