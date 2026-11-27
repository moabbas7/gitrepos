import { describe, expect, it } from "vitest";
import type { Ranking } from "@/lib/db/public";
import { badgeLabels, badgeMarkdown, badgeSvg, featuredBadgeSvg } from "@/lib/site-data/badge";
import { digestLabel } from "@/lib/site-data/copy";
import { CSV_HEADER, toCsv, toJsonExport } from "@/lib/site-data/export";
import { isTopicSlug, languagePages, topicPages } from "@/lib/site-data/landing";
import { periodReadiness, readinessNote } from "@/lib/site-data/readiness";
import { relatedRepos } from "@/lib/site-data/related";
import { buildSearchIndex, searchIndex } from "@/lib/site-data/search-index";
import { pageBudget, selectPages, type PageCandidate } from "@/lib/site-data/select-pages";
import { jsonLdString, pageMetadata, repoDescription, repoTitle } from "@/lib/site-data/seo";
import { absoluteUrl, buildSitemaps } from "@/lib/site-data/sitemap";
import type { RepoCardData } from "@/lib/types";

const pc = (id: number, over: Partial<PageCandidate> = {}): PageCandidate => ({
  id,
  firstPublishedAt: null,
  gained30d: 0,
  gained7d: 0,
  stars: 100,
  ...over,
});

const card = (id: number, rank: number, over: Partial<RepoCardData> = {}): RepoCardData => ({
  id,
  owner: `o${id}`,
  name: `r${id}`,
  description: null,
  language: "Rust",
  topics: [],
  stars: 100,
  forks: 1,
  avatarUrl: "",
  createdAt: "2024-01-01T00:00:00Z",
  gained: 10,
  spark: [],
  rank,
  ...over,
});

const ranking = (listType: Ranking["listType"], period: Ranking["period"], language: string, items: RepoCardData[]): Ranking => ({
  listType,
  period,
  language,
  items,
  source: "gharchive",
  computedAt: "2026-11-27T10:17:00Z",
});

describe("page selection (stable pages)", () => {
  it("orders pinned → ranked → previously published → fill, within the budget", () => {
    const sel = selectPages({
      candidates: [
        pc(1, { gained7d: 500 }), // fill (highest weekly gain)
        pc(2, { firstPublishedAt: "2026-11-24T00:00:00Z", gained30d: 50 }), // published, unranked
        pc(3, { gained7d: 10 }), // ranked
        pc(4), // pinned
        pc(5, { firstPublishedAt: "2026-11-24T00:00:00Z", gained30d: 900 }), // published, more recent stars
      ],
      rankedIds: [3],
      pinnedIds: [4],
      budget: 10,
    });
    expect(sel.build).toEqual([4, 3, 5, 2, 1]);
    expect(sel.reason.get(4)).toBe("pinned");
    expect(sel.reason.get(3)).toBe("ranked");
    expect(sel.reason.get(5)).toBe("published");
    expect(sel.reason.get(1)).toBe("fill");
    expect(sel.retired).toEqual([]);
    expect(sel.newlyPublished.sort()).toEqual([1, 3, 4]);
  });

  it("keeps a published page after its repo drops out of every list", () => {
    const sel = selectPages({
      candidates: [pc(7, { firstPublishedAt: "2026-11-01T00:00:00Z" }), pc(8, { gained7d: 99 })],
      rankedIds: [8],
      pinnedIds: [],
      budget: 5,
    });
    expect(sel.build).toContain(7);
    expect(sel.reason.get(7)).toBe("published");
  });

  it("retires the least-starred old pages first when the budget is full, never pins", () => {
    const sel = selectPages({
      candidates: [
        pc(1, { firstPublishedAt: "x", gained30d: 5 }),
        pc(2, { firstPublishedAt: "x", gained30d: 500 }),
        pc(3, { gained7d: 1 }),
        pc(9),
      ],
      rankedIds: [3],
      pinnedIds: [9],
      budget: 3,
    });
    expect(sel.build).toEqual([9, 3, 2]);
    expect(sel.retired).toEqual([1]);
  });

  it("builds paid pins even past the budget", () => {
    const sel = selectPages({ candidates: [pc(1), pc(2), pc(3)], rankedIds: [3], pinnedIds: [1, 2], budget: 1 });
    expect(sel.build.sort()).toEqual([1, 2]);
  });

  it("ignores ranked/pinned ids that aren't eligible candidates (e.g. spam)", () => {
    const sel = selectPages({ candidates: [pc(1)], rankedIds: [404], pinnedIds: [405], budget: 10 });
    expect(sel.build).toEqual([1]);
  });

  it("derives the budget from the asset-file cap", () => {
    expect(pageBudget({ maxFiles: 18_000, maxPrebuilt: 99_999, rankedBadges: 1000, fixedReserve: 3000, filesPerRepo: 2 })).toBe(7000);
    expect(pageBudget({ maxFiles: 18_000, maxPrebuilt: 5000 })).toBe(5000);
    expect(pageBudget({ maxFiles: 100, maxPrebuilt: 5000 })).toBe(0);
  });
});

describe("early-days readiness", () => {
  const since = "2026-11-23T23:00:00Z";
  it("marks each period ready only after its full window", () => {
    const r = periodReadiness(since, new Date("2026-11-27T11:00:00Z")); // 3.5 days in
    expect(r.today.ready).toBe(true);
    expect(r.week.ready).toBe(false);
    expect(r.month.ready).toBe(false);
    expect(r.week.daysCovered).toBeCloseTo(3.5, 1);
    expect(readinessNote(r.today)).toBeNull();
    expect(readinessNote(r.week)).toBe(
      "Collecting star history: Week fills in after 7 days (day 4 of 7). Gains are counted from when tracking began.",
    );
  });

  it("explains Today in hours during the first day", () => {
    const r = periodReadiness(since, new Date("2026-11-24T05:30:00Z"));
    expect(readinessNote(r.today)).toContain("Today fills in after 24 hours (6 h so far)");
  });

  it("treats a missing tracking start as nothing ready", () => {
    const r = periodReadiness(null, new Date());
    expect(Object.values(r).every((x) => !x.ready && x.readyAt === null)).toBe(true);
  });

  it("is fully ready after 30 days", () => {
    const r = periodReadiness(since, new Date("2026-12-24T00:00:00Z"));
    expect(Object.values(r).every((x) => x.ready)).toBe(true);
  });
});

describe("landing pages", () => {
  it("creates one page per ranked language with its display name", () => {
    const pages = languagePages([
      ranking("trending", "week", "all", [card(1, 1)]),
      ranking("trending", "week", "c-plus-plus", [card(1, 1, { language: "C++" }), card(2, 2, { language: "C++" })]),
      ranking("rising", "today", "rust", [card(3, 1)]),
      ranking("new", "today", "go", []),
    ]);
    expect(pages).toEqual([
      { slug: "c-plus-plus", name: "C++", count: 2 },
      { slug: "rust", name: "Rust", count: 0 },
    ]);
  });

  it("keeps topics with ≥ 3 repos, ordered by weekly gains, and only valid slugs", () => {
    const repos = [
      { topics: ["ai", "cli"], gained7d: 10 },
      { topics: ["ai", "cli"], gained7d: 10 },
      { topics: ["ai", "cli", "Bad Topic"], gained7d: 100 },
      { topics: ["cli"], gained7d: 1 },
    ];
    expect(topicPages(repos).map((t) => [t.topic, t.count])).toEqual([
      ["cli", 4],
      ["ai", 3],
    ]);
    expect(isTopicSlug("vector-search")).toBe(true);
    expect(isTopicSlug("../x")).toBe(false);
  });
});

describe("related repos", () => {
  it("prefers shared topics, then same language, and excludes itself", () => {
    const base = { id: 1, language: "Go", topics: ["db", "cli"], gained7d: 0, stars: 0 };
    const all = [
      base,
      { id: 2, language: "Rust", topics: ["db", "cli"], gained7d: 1, stars: 1 },
      { id: 3, language: "Go", topics: [], gained7d: 999, stars: 1 },
      { id: 4, language: "Go", topics: ["db"], gained7d: 5, stars: 1 },
      { id: 5, language: "Zig", topics: ["web"], gained7d: 999, stars: 1 },
    ];
    expect(relatedRepos(base, all).map((r) => r.id)).toEqual([2, 4, 3]);
  });
});

describe("search index", () => {
  const index = buildSearchIndex(
    [
      { owner: "acme", name: "vector-db", description: "A fast vector database for embeddings", stars: 900, language: "Rust" },
      { owner: "zeta", name: "db-tools", description: null, stars: 50, language: null },
      { owner: "other", name: "notes", description: "x".repeat(200), stars: 10, language: "Go" },
    ],
    [{ topic: "vector-search", count: 12 }],
    [{ slug: "rust", name: "Rust" }],
  );

  it("is compact: repos sorted by stars, descriptions clipped", () => {
    expect(index.v).toBe(1);
    expect(index.r[0][0]).toBe("acme");
    expect(index.r.find((r) => r[0] === "other")![2].length).toBeLessThanOrEqual(90);
    expect(index.r.find((r) => r[0] === "zeta")![4]).toBe("");
  });

  it("matches names before descriptions and links to built pages", () => {
    const hits = searchIndex(index, "db");
    expect(hits[0]).toMatchObject({ kind: "repo", owner: "zeta", name: "db-tools", href: "/repo/zeta/db-tools" });
    expect(hits.map((h) => h.href)).toContain("/repo/acme/vector-db");
  });

  it("finds topics (with or without #) and languages", () => {
    expect(searchIndex(index, "#vector search").some((h) => h.kind === "topic" && h.href === "/topic/vector-search")).toBe(true);
    expect(searchIndex(index, "rust")[0]).toMatchObject({ kind: "language", href: "/language/rust" });
    expect(searchIndex(index, "   ")).toEqual([]);
    expect(searchIndex(index, "nothing-matches-this")).toEqual([]);
  });
});

describe("sitemaps", () => {
  it("writes an index plus one file per group and encodes URLs", () => {
    const { index, files } = buildSitemaps(
      "https://example.com/",
      {
        pages: [{ path: "/", priority: 1 }],
        repos: [{ path: "/repo/a&b/next.js", lastmod: "2026-11-27T10:00:00Z" }],
        topics: [],
      },
      "2026-11-27T10:00:00Z",
    );
    expect(files.map((f) => f.path)).toEqual(["/sitemaps/pages.xml", "/sitemaps/repos.xml"]);
    expect(index.xml).toContain("<loc>https://example.com/sitemaps/repos.xml</loc>");
    expect(files[1].xml).toContain("<loc>https://example.com/repo/a%26b/next.js</loc>");
    expect(files[1].xml).toContain("<lastmod>2026-11-27</lastmod>");
    expect(files[0].xml).toContain("<priority>1.0</priority>");
  });

  it("splits large groups", () => {
    const urls = Array.from({ length: 25 }, (_, i) => ({ path: `/repo/o/r${i}` }));
    const { files } = buildSitemaps("https://x.dev", { repos: urls }, "2026-11-27", 10);
    expect(files.map((f) => f.path)).toEqual(["/sitemaps/repos-1.xml", "/sitemaps/repos-2.xml", "/sitemaps/repos-3.xml"]);
    expect(files[2].xml.match(/<url>/g)).toHaveLength(5);
  });

  it("builds absolute URLs without double slashes", () => {
    expect(absoluteUrl("https://x.dev/", "/")).toBe("https://x.dev/");
    expect(absoluteUrl("https://x.dev", "/topic/ai")).toBe("https://x.dev/topic/ai");
  });
});

describe("README badges", () => {
  const rankings = [
    ranking("trending", "today", "all", [card(1, 3)]),
    ranking("trending", "week", "all", [card(1, 1), card(2, 7)]),
    ranking("rising", "today", "rust", [card(3, 2)]),
    ranking("trending", "today", "rust", [card(2, 1)]),
  ];

  it("labels each ranked repo with its best placement", () => {
    const labels = badgeLabels(rankings);
    expect(labels.get(1)).toBe("#3 trending today"); // all-language today beats week
    expect(labels.get(2)).toBe("#7 trending this week"); // all-language beats per-language
    expect(labels.get(3)).toBe("#2 rising in Rust today");
    expect(labels.has(99)).toBe(false);
  });

  it("renders a valid, escaped SVG using only the three colours", () => {
    const svg = badgeSvg("#1 <trending> today");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("&lt;trending&gt;");
    const hexes = new Set(svg.match(/#[0-9A-Fa-f]{6}/g));
    expect([...hexes].every((h) => ["#049DFF", "#612BFB", "#FD26FE", "#07070B", "#FAFAFA"].includes(h.toUpperCase()))).toBe(true);
    expect(featuredBadgeSvg()).toContain("Featured");
  });

  it("uses the per-repo URL only for ranked repos", () => {
    expect(badgeMarkdown("https://s.dev", "a", "b", true)).toBe("[![Featured on GitRepos](https://s.dev/badge/a/b.svg)](https://s.dev/repo/a/b)");
    expect(badgeMarkdown("https://s.dev", "a", "b", false)).toContain("https://s.dev/badge/featured.svg");
  });
});

describe("CC0 export", () => {
  it("writes CSV with a header and quotes awkward cells", () => {
    const csv = toCsv([{ date: "2026-11-26", list: "trending", period: "today", language: "all", rank: 1, repo: 'a/"b,c"', stars: null, gained: 5 }]);
    const [head, row] = csv.trim().split("\n");
    expect(head).toBe(CSV_HEADER.join(","));
    expect(row).toBe('2026-11-26,trending,today,all,1,"a/""b,c""",,5');
  });

  it("labels JSON exports CC0", () => {
    const j = toJsonExport({ date: "d", generatedAt: "g", source: "s" }, []);
    expect(j.license).toBe("CC0-1.0");
  });
});

describe("SEO helpers", () => {
  it("builds canonical, OG and Twitter metadata", () => {
    const m = pageMetadata({ title: "T", description: "D ".repeat(200), path: "/topic/ai", og: "/og/page/topic-ai.png" });
    expect(String(m.alternates?.canonical)).toMatch(/\/topic\/ai$/);
    expect((m.description ?? "").length).toBeLessThanOrEqual(160);
    expect(JSON.stringify(m.openGraph)).toContain("/og/page/topic-ai.png");
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
    expect(m.robots).toBeUndefined();
  });

  it("clips repo titles and prefers our summary for the description", () => {
    expect(repoTitle({ owner: "o", name: "n", description: "x".repeat(200) }).length).toBeLessThanOrEqual(70);
    expect(repoDescription({ owner: "o", name: "n", description: "Desc.", summary: null, stars: 1500, gained7d: 20 })).toBe(
      "o/n: Desc. 1.5k stars, +20 this week. Star history and similar repositories on GitRepos.",
    );
    expect(repoDescription({ owner: "o", name: "n", description: "Desc.", summary: "Ours.", stars: 1, gained7d: 0 })).toBe("Ours.");
  });

  it("escapes </script> in JSON-LD", () => {
    expect(jsonLdString({ a: "</script><b>" })).not.toContain("</script>");
  });

  it("formats digest labels", () => {
    expect(digestLabel("weekly", "2026-W48")).toBe("Week 48, 2026");
    expect(digestLabel("monthly", "2026-11")).toBe("November 2026");
  });
});
