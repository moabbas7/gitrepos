/**
 * Emits the build's static artifacts into public/ (gitignored) from .data/site.json, so Workers
 * serves them as free static assets — no Worker CPU, no D1:
 *   /lists/<type>-<period>-<lang>.json   tab / language filter / load-more data
 *   /search-index.json                    command palette + /search
 *   /sitemap.xml + /sitemaps/*.xml        split sitemaps
 *   /data/latest.{json,csv}, /data/daily/<date>.{json,csv}   CC0 export
 *   /badge/featured.svg + /badge/<owner>/<name>.svg (ranked repos only)
 *   /og/repo/*.png + /og/page/*.png       pre-generated OG images (cached by content hash)
 * Runs after build-snapshot and before the Next build: `npm run build:static`.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ImageResponse } from "next/og";
import { compactNumber, PERIOD_LABEL } from "@/lib/format";
import { OG_SIZE, OG_TEMPLATE_VERSION, PageOg, RepoOg, type PageOgProps, type RepoOgProps } from "@/lib/og/templates";
import { SITE_URL } from "@/lib/site";
import { badgeSvg, featuredBadgeSvg } from "@/lib/site-data/badge";
import { DEFAULT_OG_COPY, digestCopy, languageCopy, STATIC_COPY, topicCopy } from "@/lib/site-data/copy";
import { toCsv, toJsonExport, type ExportRow } from "@/lib/site-data/export";
import { buildSite, getSite, type Site } from "@/lib/site-data/load";
import { buildSearchIndex } from "@/lib/site-data/search-index";
import { buildSitemaps, type SitemapUrl } from "@/lib/site-data/sitemap";
import { EMPTY_SNAPSHOT } from "@/lib/site-data/types";

const PUBLIC = "public";
/** Everything this script owns inside public/ — wiped and rewritten on every run. */
export const EMITTED = ["lists", "sitemaps", "data", "badge", "og", "search-index.json", "sitemap.xml"];
const OG_CACHE = ".data/og-cache";

let outDir = PUBLIC;
function write(path: string, body: string | Buffer) {
  const full = join(outDir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
}

/** Static page paths that go in the sitemap (repo/landing pages are added from the snapshot). */
export const STATIC_PATHS = ["/", "/rising", "/new", "/languages", "/topics", "/digests", "/methodology", "/about", "/data", "/privacy", "/terms"];

export function sitemapGroups(site: Site): Record<string, SitemapUrl[]> {
  const gen = site.snap.generatedAt;
  return {
    pages: STATIC_PATHS.map((path) => ({ path, lastmod: gen, priority: path === "/" ? 1 : 0.6 })),
    languages: site.languages.map((l) => ({ path: `/language/${l.slug}`, lastmod: gen, priority: 0.7 })),
    topics: site.topics.map((t) => ({ path: `/topic/${t.topic}`, lastmod: gen, priority: 0.6 })),
    digests: site.snap.digests.map((d) => ({ path: `/${d.kind}/${d.periodKey}`, lastmod: d.publishedAt, priority: 0.5 })),
    repos: site.repos.map((r) => ({
      path: `/repo/${r.owner}/${r.name}`,
      lastmod: r.reason === "ranked" || r.reason === "pinned" ? gen : (r.pushedAt ?? gen),
      priority: r.reason === "ranked" || r.reason === "pinned" ? 0.8 : 0.4,
    })),
  };
}

export function exportRows(site: Site, day: { date: string; rows: { period: string; rank: number; repoId: number; gained: number }[] }): ExportRow[] {
  return day.rows.map((r) => {
    const repo = site.repoById.get(r.repoId);
    return {
      date: day.date,
      list: "trending",
      period: r.period,
      language: "all",
      rank: r.rank,
      repo: repo ? `${repo.owner}/${repo.name}` : `id:${r.repoId}`,
      stars: repo?.stars ?? null,
      gained: r.gained,
    };
  });
}

/** Current all-language + per-language lists as export rows (the "latest" file). */
export function latestRows(site: Site): ExportRow[] {
  const date = (site.snap.rankingsComputedAt ?? site.snap.generatedAt).slice(0, 10);
  const rows: ExportRow[] = [];
  for (const r of site.snap.rankings) {
    for (const i of r.items) {
      rows.push({ date, list: r.listType, period: r.period, language: r.language, rank: i.rank, repo: `${i.owner}/${i.name}`, stars: i.stars, gained: i.gained });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// OG images
// ---------------------------------------------------------------------------

let fonts: { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[] | null = null;
function ogFonts() {
  if (!fonts) {
    const f = (p: string) => readFileSync(join("node_modules/@fontsource", p));
    fonts = [
      { name: "Geist", data: f("geist/files/geist-latin-400-normal.woff"), weight: 400, style: "normal" },
      { name: "Geist", data: f("geist/files/geist-latin-600-normal.woff"), weight: 600, style: "normal" },
      { name: "JetBrains Mono", data: f("jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff"), weight: 500, style: "normal" },
    ];
  }
  return fonts;
}
const LOGO = `data:image/png;base64,${readFileSync(join(PUBLIC, "logo.png")).toString("base64")}`;

type OgJob = { out: string; kind: "repo"; props: RepoOgProps } | { out: string; kind: "page"; props: PageOgProps };

async function renderOg(job: OgJob): Promise<Buffer> {
  const el = job.kind === "repo" ? <RepoOg logo={LOGO} p={job.props} /> : <PageOg logo={LOGO} p={job.props} />;
  const res = new ImageResponse(el, { ...OG_SIZE, fonts: ogFonts() });
  return Buffer.from(await res.arrayBuffer());
}

export function ogJobs(site: Site): OgJob[] {
  const jobs: OgJob[] = [];
  const page = (key: string, p: PageOgProps) => jobs.push({ out: `og/page/${key}.png`, kind: "page", props: p });
  page("default", { eyebrow: DEFAULT_OG_COPY.eyebrow, title: DEFAULT_OG_COPY.headline, lead: DEFAULT_OG_COPY.lead });
  const seen = new Set(["default"]);
  for (const c of Object.values(STATIC_COPY)) {
    if (seen.has(c.ogKey)) continue;
    seen.add(c.ogKey);
    page(c.ogKey, { eyebrow: c.eyebrow, title: c.headline, lead: c.lead });
  }
  for (const l of site.languages) {
    const c = languageCopy(l.name, l.slug);
    page(c.ogKey, { eyebrow: c.eyebrow, title: c.headline, lead: c.lead });
  }
  for (const t of site.topics) {
    const c = topicCopy(t.topic, t.count);
    page(c.ogKey, { eyebrow: c.eyebrow, title: c.headline, lead: c.lead });
  }
  for (const d of site.snap.digests) {
    const c = digestCopy(d.kind, d.periodKey);
    page(c.ogKey, { eyebrow: c.eyebrow, title: c.headline, lead: c.lead });
  }
  for (const r of site.repos) {
    const gained = r.gained7d > 0 ? `+${compactNumber(r.gained7d)} ${PERIOD_LABEL.week}` : null;
    jobs.push({
      out: `og/repo/${`${r.owner}__${r.name}`.toLowerCase()}.png`,
      kind: "repo",
      props: {
        owner: r.owner,
        name: r.name,
        description: r.description,
        language: r.language,
        stars: compactNumber(r.stars),
        gained,
        placement: site.placement.get(r.id) ?? null,
      },
    });
  }
  return jobs;
}

async function emitOg(site: Site) {
  mkdirSync(OG_CACHE, { recursive: true });
  const used = new Set<string>();
  let rendered = 0;
  const started = Date.now();
  for (const job of ogJobs(site)) {
    const hash = createHash("sha1").update(JSON.stringify([OG_TEMPLATE_VERSION, job.kind, job.props])).digest("hex").slice(0, 20);
    const cached = join(OG_CACHE, `${hash}.png`);
    used.add(`${hash}.png`);
    if (!existsSync(cached)) {
      writeFileSync(cached, await renderOg(job));
      rendered++;
    }
    const out = join(outDir, job.out);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(cached, out);
  }
  let dropped = 0;
  for (const f of readdirSync(OG_CACHE)) {
    if (!used.has(f)) {
      rmSync(join(OG_CACHE, f));
      dropped++;
    }
  }
  return { total: used.size, rendered, dropped, seconds: Math.round((Date.now() - started) / 1000) };
}

// ---------------------------------------------------------------------------

export async function emitStatic(site: Site, { og = true, out = PUBLIC }: { og?: boolean; out?: string } = {}) {
  outDir = out;
  for (const p of EMITTED) rmSync(join(outDir, p), { recursive: true, force: true });

  // Lists: every ranking list, full length (the client slices for "load more").
  for (const r of site.snap.rankings) {
    write(`lists/${r.listType}-${r.period}-${r.language}.json`, JSON.stringify({ computedAt: r.computedAt, items: r.items }));
  }

  // Search index (built repos only, so every hit has a page).
  const index = buildSearchIndex(
    site.repos,
    site.topics.map((t) => ({ topic: t.topic, count: t.count })),
    site.languages.map((l) => ({ slug: l.slug, name: l.name })),
  );
  write("search-index.json", JSON.stringify(index));

  // Sitemaps
  const { index: smIndex, files } = buildSitemaps(SITE_URL, sitemapGroups(site), site.snap.generatedAt);
  write("sitemap.xml", smIndex.xml);
  for (const f of files) write(f.path.slice(1), f.xml);

  // CC0 data
  const latest = latestRows(site);
  const meta = (date: string) => ({ date, generatedAt: site.snap.generatedAt, source: "GitHub API + GH Archive, computed by GitRepos" });
  write("data/latest.json", JSON.stringify(toJsonExport(meta(site.snap.generatedAt.slice(0, 10)), latest)));
  write("data/latest.csv", toCsv(latest));
  for (const day of site.snap.dailyExports) {
    const rows = exportRows(site, day);
    write(`data/daily/${day.date}.json`, JSON.stringify(toJsonExport(meta(day.date), rows)));
    write(`data/daily/${day.date}.csv`, toCsv(rows));
  }

  // Badges: generic + per ranked (and built) repo.
  write("badge/featured.svg", featuredBadgeSvg());
  let badges = 0;
  for (const r of site.repos) {
    const label = site.placement.get(r.id);
    if (!label) continue;
    write(`badge/${r.owner}/${r.name}.svg`, badgeSvg(label));
    badges++;
  }

  const ogStats = og ? await emitOg(site) : null;
  return { lists: site.snap.rankings.length, searchRepos: index.r.length, sitemaps: files.length, exportDays: site.snap.dailyExports.length, badges, og: ogStats };
}

if (process.argv[1]?.includes("emit-static")) {
  const site = process.argv.includes("--empty") ? buildSite(EMPTY_SNAPSHOT) : getSite();
  emitStatic(site, { og: !process.argv.includes("--no-og") })
    .then((s) => console.log(`[emit-static] ${JSON.stringify(s)}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
