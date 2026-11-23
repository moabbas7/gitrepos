/**
 * Build-time data snapshot -> .data/site.json. Public pages are prerendered from this file, so a
 * page view never touches D1. Runs before `opennextjs-cloudflare build` (hourly in CI).
 *
 * D1 reads per run: repos (<= MAX_PREBUILT_REPOS) + rankings + topics + digests ≈ 6k rows.
 * Star history (90 days × prebuilt repos ≈ 450k rows) changes once a day, so it is cached in
 * .data/history-<date>.json (persisted between CI runs with actions/cache) and only re-read when
 * the date of the latest repo_daily snapshot changes.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  countPublishedRepos,
  getRepoHistory,
  listDigests,
  listPublishedRepos,
  listRankings,
  listTopics,
  type RepoRow,
} from "@/lib/db/public";
import { config } from "../jobs/lib/config";
import { openJobDb } from "../jobs/lib/db";

const OUT_DIR = ".data";
const HISTORY_DAYS = 90;

export interface SiteSnapshot {
  generatedAt: string;
  stats: { publishedRepos: number; prebuiltRepos: number; rankedLists: number };
  rankings: Awaited<ReturnType<typeof listRankings>>;
  repos: RepoRow[];
  topics: Awaited<ReturnType<typeof listTopics>>;
  digests: Awaited<ReturnType<typeof listDigests>>;
  /** repo id -> [date, gained, stars][] (oldest first) */
  history: Record<string, [string, number, number | null][]>;
}

async function run() {
  const { db, close, mode } = await openJobDb();
  try {
    const [rankings, repos, topics, digests, published] = await Promise.all([
      listRankings(db),
      listPublishedRepos(db, config.maxPrebuiltRepos),
      listTopics(db, 300),
      listDigests(db),
      countPublishedRepos(db),
    ]);

    // History cache keyed by the latest snapshot date in repo_daily.
    mkdirSync(OUT_DIR, { recursive: true });
    const latest = (await db.first<{ d: string | null }>("SELECT MAX(date) AS d FROM repo_daily"))?.d ?? "none";
    const cachePath = join(OUT_DIR, `history-${latest}.json`);
    let history: SiteSnapshot["history"] = {};
    if (existsSync(cachePath)) {
      history = JSON.parse(readFileSync(cachePath, "utf8"));
    }
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
    const missing = repos.map((r) => r.id).filter((id) => !history[id]);
    for (const [id, rows] of await getRepoHistory(db, missing, since)) history[id] = rows;
    for (const f of readdirSync(OUT_DIR)) if (/^history-.*\.json$/.test(f) && f !== `history-${latest}.json`) rmSync(join(OUT_DIR, f));
    writeFileSync(cachePath, JSON.stringify(history));

    const keep = new Set(repos.map((r) => String(r.id)));
    const snapshot: SiteSnapshot = {
      generatedAt: new Date().toISOString(),
      stats: { publishedRepos: published, prebuiltRepos: repos.length, rankedLists: rankings.length },
      rankings,
      repos,
      topics,
      digests,
      history: Object.fromEntries(Object.entries(history).filter(([id]) => keep.has(id))),
    };
    writeFileSync(join(OUT_DIR, "site.json"), JSON.stringify(snapshot));
    console.log(
      `[build-snapshot] (${mode}) ${repos.length} repos, ${rankings.length} lists, ${topics.length} topics, ` +
        `${digests.length} digests, history cached for ${latest} (${missing.length} repos fetched)`,
    );
  } finally {
    await close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
