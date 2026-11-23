/**
 * Seeds D1 with realistic but FICTIONAL data so pages can be built before the pipeline runs.
 *   npm run db:seed              -> local D1 (wrangler's local SQLite)
 *   npm run db:seed -- --remote  -> remote D1 (asks for confirmation unless --yes)
 * The generated SQL is written to .data/seed.sql. Rankings are computed with the real rank-core.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { placeholderAvatarSvg } from "@/lib/avatar";
import { DEFAULT_RANK_CONFIG, rankAll, type Candidate } from "../jobs/lib/rank-core";
import { lit } from "../jobs/lib/sql";
import type { RepoMeta } from "../jobs/lib/types";

const NOW = new Date();
const DAY = 86_400_000;

// Deterministic PRNG (mulberry32) so the seed is stable between runs.
let s = 0x9e3779b9;
const rnd = () => {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];

const LANGS = ["TypeScript", "Python", "Rust", "Go", "JavaScript", "C++", "Java", "Swift", "Kotlin", "Zig", "Ruby", "C#"] as const;
const OWNERS = ["orbitlabs", "quietfox", "paperplane-ai", "mossgarden", "nightowl-dev", "tinybyte", "lumen-hq", "cobalt-io", "fernworks", "sunpatch", "glasswing", "kitefield", "ravenstack", "pebble-oss", "saltmarsh", "northwind-labs"] as const;
const NOUNS = ["nebula", "comet", "relay", "lattice", "harbor", "ember", "quill", "prism", "drift", "anvil", "beacon", "cinder", "atlas", "vector", "pulse", "forge", "orbit", "shard", "tide", "nova"] as const;
const SUFFIX = ["db", "kit", "cli", "ui", "agent", "sync", "flow", "lab", "js", "rs", "proxy", "studio"] as const;
const TOPICS = ["ai-agents", "llm", "cli", "database", "devtools", "self-hosted", "react", "rust", "gamedev", "security", "observability", "vector-search", "terminal", "compiler", "webassembly", "automation", "privacy", "data-engineering", "mobile", "design-system"] as const;
const WHAT = ["Embedded database", "Terminal UI toolkit", "Local-first sync engine", "Agent framework", "Static site generator", "Reverse proxy", "Log search engine", "Workflow runner", "Code formatter", "Game engine", "Password manager", "Feature-flag service"] as const;
const HOW = ["with a tiny footprint", "that runs anywhere", "built for speed", "with first-class plugins", "you can self-host in minutes", "with zero config", "for teams that ship daily"] as const;

interface SeedRepo extends RepoMeta {
  daily: number[]; // 90 days of gains, oldest -> newest (index 89 = yesterday)
  today: number;
}

function makeRepos(n: number): SeedRepo[] {
  const used = new Set<string>();
  const out: SeedRepo[] = [];
  for (let i = 0; out.length < n; i++) {
    const owner = pick(OWNERS);
    const name = `${pick(NOUNS)}-${pick(SUFFIX)}`;
    const full = `${owner}/${name}`;
    if (used.has(full)) continue;
    used.add(full);
    const ageDays = rnd() < 0.2 ? Math.floor(rnd() * 28) + 2 : Math.floor(rnd() * 2000) + 40;
    const created = new Date(NOW.getTime() - ageDays * DAY);
    // Popularity profile: a few breakouts, a body of steady repos, a long tail.
    const base = rnd() < 0.1 ? 150 + rnd() * 600 : rnd() < 0.5 ? 10 + rnd() * 80 : 1 + rnd() * 12;
    const momentum = 0.6 + rnd() * 2.2; // >1 = accelerating recently
    const daily = Array.from({ length: 90 }, (_, d) => {
      if (90 - d > ageDays) return 0;
      const t = d / 89;
      return Math.max(0, Math.round(base * (0.4 + t ** momentum * 1.6) * (0.7 + rnd() * 0.6)));
    });
    const gained90 = daily.reduce((a, b) => a + b, 0);
    const stars = gained90 + (ageDays > 90 ? Math.round(base * 40 + rnd() * 20_000) : 0);
    const topics = [...new Set(Array.from({ length: 2 + Math.floor(rnd() * 4) }, () => pick(TOPICS)))];
    out.push({
      id: 10_000_000 + i * 7919,
      owner,
      name,
      description: `${pick(WHAT)} ${pick(HOW)}.`,
      language: LANGS[out.length % LANGS.length],
      topics,
      stars,
      forks: Math.round(stars * (0.02 + rnd() * 0.1)),
      issues: Math.round(rnd() * 120),
      watchers: Math.round(stars * 0.01) + 1,
      licence: pick(["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", null]),
      homepage: rnd() < 0.4 ? `https://example.com/${name}` : null,
      avatarUrl: `/seed-avatars/${owner}.svg`, // short path; real data uses avatars.githubusercontent.com
      createdAt: created.toISOString(),
      pushedAt: new Date(NOW.getTime() - Math.floor(rnd() * 5) * DAY).toISOString(),
      isArchived: false,
      isFork: false,
      isEmpty: false,
      fetchedAt: NOW.toISOString(),
      daily,
      today: Math.round(daily[89] * (0.8 + rnd() * 0.6)),
    });
  }
  return out;
}

function main() {
  const remote = process.argv.includes("--remote");
  const repos = makeRepos(80);
  const nowIso = NOW.toISOString();
  const sql: string[] = [];

  // Clear seedable tables (only ever seed a dev DB or a brand-new remote one).
  for (const t of ["repos", "repo_daily", "rankings", "ranking_history", "topics", "digests", "campaigns", "promo_orders", "job_runs"]) {
    sql.push(`DELETE FROM ${t};`);
  }

  const cands: Candidate[] = repos.map((r) => {
    const sum = (n: number) => r.daily.slice(90 - n).reduce((a, b) => a + b, 0);
    return {
      meta: r,
      gains: { today: r.today, week: sum(6) + Math.round(r.today / 2), month: sum(29) + Math.round(r.today / 2) },
      spark: [...r.daily.slice(84, 90), r.today],
    };
  });
  const lists = rankAll(cands, NOW, DEFAULT_RANK_CONFIG);
  const rankToday = new Map(lists.find((l) => l.listType === "trending" && l.period === "today" && l.language === "all")!.items.map((i) => [i.id, i.rank]));

  for (const c of cands) {
    const r = c.meta as SeedRepo;
    sql.push(
      `INSERT INTO repos (id, owner, name, full_name, description, language, topics, stars, forks, issues, watchers, licence, homepage, avatar_url, created_at, pushed_at, summary, summary_source, summary_at, readme_excerpt, gained_24h, gained_7d, gained_30d, rank_today, tracked_at, meta_refreshed_at, updated_at) VALUES (${[
        r.id, r.owner, r.name, `${r.owner}/${r.name}`.toLowerCase(), r.description, r.language, JSON.stringify(r.topics),
        r.stars, r.forks, r.issues, r.watchers, r.licence, r.homepage, r.avatarUrl, r.createdAt, r.pushedAt,
        `${r.owner}/${r.name} is a fictional ${r.language} project used as seed data. ${r.description}`, "template", nowIso,
        `# ${r.name}\n\n${r.description} This README excerpt is placeholder seed content.`,
        c.gains.today, c.gains.week, c.gains.month, rankToday.get(r.id) ?? null, nowIso, nowIso, nowIso,
      ].map(lit).join(", ")});`,
    );
    // 90 days of repo_daily with a running star total
    let total = r.stars - r.today;
    const rows: string[] = [];
    for (let d = 89; d >= 0; d--) {
      const date = new Date(NOW.getTime() - (90 - d) * DAY).toISOString().slice(0, 10);
      rows.push(`(${r.id}, '${date}', ${r.daily[d]}, ${total})`);
      total -= r.daily[d];
    }
    sql.push(`INSERT INTO repo_daily (repo_id, date, gained, stars) VALUES ${rows.join(", ")};`);
  }

  for (const l of lists) {
    sql.push(
      `INSERT INTO rankings (list_type, period, language, payload, item_count, source, computed_at) VALUES (${[
        l.listType, l.period, l.language, JSON.stringify(l.items), l.items.length, "seed", nowIso,
      ].map(lit).join(", ")});`,
    );
  }

  const yesterday = new Date(NOW.getTime() - DAY).toISOString().slice(0, 10);
  for (const l of lists.filter((x) => x.listType === "trending" && x.language === "all")) {
    const rows = l.items.map((i) => `('${yesterday}', 'trending', '${l.period}', ${i.rank}, ${i.id}, ${i.gained})`);
    if (rows.length) sql.push(`INSERT INTO ranking_history (date, list_type, period, rank, repo_id, gained) VALUES ${rows.join(", ")};`);
  }

  const topicAgg = new Map<string, { n: number; g: number }>();
  for (const c of cands) for (const t of c.meta.topics) {
    const a = topicAgg.get(t) ?? { n: 0, g: 0 };
    a.n++;
    a.g += c.gains.week;
    topicAgg.set(t, a);
  }
  for (const [t, a] of topicAgg) sql.push(`INSERT INTO topics (topic, repo_count, gained_7d, updated_at) VALUES (${[t, a.n, a.g, nowIso].map(lit).join(", ")});`);

  const weekly = lists.find((l) => l.listType === "trending" && l.period === "week" && l.language === "all")!.items.slice(0, 10);
  const monthly = lists.find((l) => l.listType === "trending" && l.period === "month" && l.language === "all")!.items.slice(0, 10);
  sql.push(`INSERT INTO digests (id, kind, period_key, title, intro, payload, published_at) VALUES (${["weekly-2026-W47", "weekly", "2026-W47", "Top repos of week 47, 2026", "Sample weekly digest (seed data).", JSON.stringify(weekly), nowIso].map(lit).join(", ")});`);
  sql.push(`INSERT INTO digests (id, kind, period_key, title, intro, payload, published_at) VALUES (${["monthly-2026-10", "monthly", "2026-10", "Top repos of October 2026", "Sample monthly digest (seed data).", JSON.stringify(monthly), nowIso].map(lit).join(", ")});`);

  // Commerce samples (fictional)
  sql.push(`INSERT INTO campaigns (id, type, placement, package, status, company, tagline, url, email, starts_at, ends_at, price_cents, stats_token, created_at, updated_at) VALUES (${["seed-camp-1", "sponsor", "sidebar", "sponsor_sidebar_7d", "active", "Cometlog", "Structured logs for edge functions. Free for open-source projects.", "https://example.com", "ads@example.com", nowIso, new Date(NOW.getTime() + 7 * DAY).toISOString(), 3900, "seedtoken-camp-1", nowIso, nowIso].map(lit).join(", ")});`);
  sql.push(`INSERT INTO campaigns (id, type, placement, package, status, company, tagline, url, email, price_cents, stats_token, created_at, updated_at) VALUES (${["seed-camp-2", "sponsor", "feed", "sponsor_feed_7d", "in_review", "Lumen CI", "Fast CI runners with cached Docker layers and flat pricing.", "https://example.com", "ads@example.org", 4900, "seedtoken-camp-2", nowIso, nowIso].map(lit).join(", ")});`);
  sql.push(`INSERT INTO promo_orders (id, product, repo_full_name, name, email, status, price_cents, stats_token, created_at, updated_at) VALUES (${["seed-order-1", "reel", `${repos[0].owner}/${repos[0].name}`, "Sample Maker", "maker@example.com", "queued", 500, "seedtoken-order-1", nowIso, nowIso].map(lit).join(", ")});`);

  for (const job of ["ingest-gharchive", "rank", "refresh-metadata", "snapshot", "rollup-and-prune", "summaries"]) {
    sql.push(`INSERT INTO job_runs (job, started_at, ended_at, status, source, rows_written, meta) VALUES (${[job, nowIso, nowIso, "success", "seed", 0, '{"seed":true}'].map(lit).join(", ")});`);
  }

  // Placeholder avatars as tiny static files (keeps ranking payloads well under D1's 100 KB statement limit).
  const avatarDir = join("public", "seed-avatars");
  mkdirSync(avatarDir, { recursive: true });
  for (const o of OWNERS) writeFileSync(join(avatarDir, `${o}.svg`), placeholderAvatarSvg(o));

  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/seed.sql", sql.join("\n") + "\n");
  console.log(`[seed] ${repos.length} repos, ${lists.length} ranking lists, ${topicAgg.size} topics -> .data/seed.sql`);
  return remote;
}

async function run() {
  const remote = main();
  if (process.argv.includes("--sql-only")) return;
  if (remote && !process.argv.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const a = await rl.question("This REPLACES repos/rankings/topics/digests/campaigns/orders/job_runs in the REMOTE D1 with fictional data. Type 'seed remote' to continue: ");
    rl.close();
    if (a.trim() !== "seed remote") {
      console.log("[seed] aborted");
      process.exit(1);
    }
  }
  execFileSync("npx", ["wrangler", "d1", "execute", "gitrepos", remote ? "--remote" : "--local", "--file", ".data/seed.sql", "-y"], {
    stdio: "inherit",
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
