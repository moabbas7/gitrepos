import { placeholderAvatar } from "@/lib/avatar";
import type { RepoCardData, SponsorCardData } from "@/lib/types";

// Fictional repos only — never real projects with made-up numbers.
const base: Omit<RepoCardData, "rank" | "avatarUrl">[] = [
  {
    id: 1,
    owner: "orbitlabs",
    name: "nebula-db",
    description: "Embedded vector + graph database in a single file, with a SQL dialect for hybrid queries.",
    language: "Rust",
    topics: ["database", "vector-search", "embedded", "rust"],
    stars: 18420,
    forks: 612,
    createdAt: "2026-09-02T00:00:00Z",
    gained: 1834,
    spark: [120, 180, 260, 410, 690, 1220, 1834],
    isNew: true,
    isHot: true,
  },
  {
    id: 2,
    owner: "quietfox",
    name: "termstream",
    description: "Record, replay and share terminal sessions as tiny text files that render anywhere.",
    language: "Go",
    topics: ["cli", "terminal", "devtools"],
    stars: 7310,
    forks: 201,
    createdAt: "2025-04-11T00:00:00Z",
    gained: 942,
    spark: [80, 75, 120, 300, 520, 700, 942],
  },
  {
    id: 3,
    owner: "paperplane-ai",
    name: "agent-kit",
    description: "Typed building blocks for tool-using LLM agents, with replayable traces and evals.",
    language: "TypeScript",
    topics: ["ai-agents", "llm", "typescript", "evals"],
    stars: 25110,
    forks: 1904,
    createdAt: "2025-11-20T00:00:00Z",
    gained: 611,
    spark: [400, 520, 480, 560, 590, 600, 611],
  },
  {
    id: 4,
    owner: "mossgarden",
    name: "pixelforge",
    description: "Procedural pixel-art sprite generator with a palette-aware style transfer model.",
    language: "Python",
    topics: ["generative-art", "gamedev", "pytorch"],
    stars: 3420,
    forks: 98,
    createdAt: "2026-10-28T00:00:00Z",
    gained: 377,
    spark: [0, 10, 40, 90, 150, 260, 377],
    isNew: true,
  },
];

export const SAMPLE_REPOS: RepoCardData[] = base.map((r, i) => ({
  ...r,
  rank: i + 1,
  avatarUrl: placeholderAvatar(r.owner),
}));

export const SAMPLE_SPONSORS: SponsorCardData[] = [
  { id: "s1", company: "Cometlog", tagline: "Structured logs for edge functions. Free for open-source projects.", url: "https://example.com" },
  { id: "s2", company: "Lumen CI", tagline: "Fast CI runners with cached Docker layers and flat pricing.", url: "https://example.com" },
];

export const SAMPLE_STAR_HISTORY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 25 + i));
  const stars = Math.round(9000 + i * 180 + Math.max(0, i - 18) ** 2.4 * 12);
  return { date: d.toISOString().slice(0, 10), stars };
});
