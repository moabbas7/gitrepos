/** "Similar repos" for a repo page (pure; unit-tested): shared topics first, then same language. */
export interface RelatedInput {
  id: number;
  language: string | null;
  topics: string[];
  gained7d: number;
  stars: number;
}

export function relatedRepos<T extends RelatedInput>(repo: RelatedInput, all: readonly T[], limit = 6): T[] {
  const topics = new Set(repo.topics);
  const scored: { r: T; score: number }[] = [];
  for (const r of all) {
    if (r.id === repo.id) continue;
    let score = 0;
    for (const t of r.topics) if (topics.has(t)) score += 3;
    if (repo.language && r.language === repo.language) score += 1;
    if (score > 0) scored.push({ r, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.r.gained7d - a.r.gained7d || b.r.stars - a.r.stars || a.r.id - b.r.id)
    .slice(0, limit)
    .map((x) => x.r);
}
