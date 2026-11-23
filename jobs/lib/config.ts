/** Job configuration from environment (.env.local locally, Actions secrets/vars in CI). */
import { existsSync, readFileSync } from "node:fs";

/** Minimal .env.local loader for local runs (CI injects env directly). Never overrides real env. */
function loadDotEnv(path = ".env.local") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadDotEnv();

const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && process.env[k] !== "" && process.env[k] !== undefined ? v : d;
};

export const config = {
  githubToken: process.env.GITHUB_TOKEN || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  cfApiToken: process.env.CLOUDFLARE_API_TOKEN || "",
  d1DatabaseId: process.env.D1_DATABASE_ID || "",
  /** Where the `data` branch is checked out (git worktree in CI, plain dir locally). */
  dataDir: process.env.DATA_DIR || ".data/branch",
  dataBranch: process.env.DATA_BRANCH || "data",
  /** Only CI pushes the data branch. */
  dataPush: process.env.DATA_PUSH === "1",
  dailyWriteBudget: num("D1_DAILY_WRITE_BUDGET", 80_000),
  trackedLimit: num("TRACKED_LIMIT", 5000),
  minDailyStars: num("MIN_DAILY_STARS", 3),
  maxPrebuiltRepos: num("MAX_PREBUILT_REPOS", 5000),
  summaryLimit: num("SUMMARY_LIMIT", 40),
  spamCheckLimit: num("SPAM_CHECK_LIMIT", 300),
  readmeLimit: num("README_LIMIT", 300),
  /** Hours of GH Archive to ingest per run while catching up. */
  ingestMaxHours: num("INGEST_MAX_HOURS", 6),
  /** A missing GH Archive hour older than this triggers the GitHub Search fallback. */
  fallbackAfterHours: num("FALLBACK_AFTER_HOURS", 3),
  hourlyRetentionHours: 48,
  dailyRetentionDays: 35,
  repoDailyRetentionDays: 400,
  staleRepoDays: 90,
  jobRunsRetentionDays: 90,
  userAgent: "gitrepos-pipeline (+https://github.com/moabbas7/gitrepos)",
};

export const hasRemoteD1 = () => !!(config.cfAccountId && config.cfApiToken && config.d1DatabaseId);
