/**
 * Raw/daily/meta files live on an orphan `data` branch of this repo (no R2 on the no-card plan).
 *
 *   raw/hourly/YYYY-MM-DDTHH.json.gz   WatchEvent counts per repo for one hour   (kept 48h)
 *   daily/YYYY-MM-DD.json.gz           daily totals, repos with >= MIN_DAILY_STARS (kept 35d)
 *   meta/repos.json.gz                 candidate metadata cache + spam verdicts
 *
 * CI: the branch is checked out as a git worktree at DATA_DIR (fetched anonymously — the repo is
 * public). The push authenticates explicitly with DATA_PUSH_TOKEN (the workflow's built-in token),
 * so it doesn't depend on how actions/checkout persists credentials. `publish()` replaces the branch
 * with ONE squashed commit and force-pushes it, so deleted files really free space and history
 * never grows. Only the `data` branch is ever force-pushed — never main.
 * Locally (DATA_PUSH unset) DATA_DIR is just a directory.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { config } from "./config";

export class DataStore {
  constructor(public readonly root: string = config.dataDir) {
    mkdirSync(root, { recursive: true });
  }

  path(rel: string) {
    return join(this.root, rel);
  }

  exists(rel: string) {
    return existsSync(this.path(rel));
  }

  readJson<T>(rel: string): T | null {
    const p = this.path(rel);
    if (!existsSync(p)) return null;
    try {
      const buf = readFileSync(p);
      return JSON.parse((rel.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8")) as T;
    } catch (e) {
      console.warn(`[data] unreadable ${rel}: ${(e as Error).message}`);
      return null;
    }
  }

  /** Atomic-ish write: write to a temp file then rename is overkill here; files are small. */
  writeJson(rel: string, value: unknown) {
    const p = this.path(rel);
    mkdirSync(dirname(p), { recursive: true });
    const json = Buffer.from(JSON.stringify(value));
    writeFileSync(p, rel.endsWith(".gz") ? gzipSync(json, { level: 9 }) : json);
  }

  list(dir: string): string[] {
    const p = this.path(dir);
    if (!existsSync(p)) return [];
    return readdirSync(p).sort();
  }

  remove(rel: string) {
    rmSync(this.path(rel), { force: true });
  }
}

const git = (cwd: string, ...args: string[]) => gitEnv(cwd, {}, ...args);

function gitEnv(cwd: string, extraEnv: Record<string, string>, ...args: string[]) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...extraEnv } })
    .toString()
    .trim();
}

/**
 * CI only: attach the `data` branch as a worktree at DATA_DIR (or create an empty orphan).
 * Uses the main checkout's credentials (actions/checkout persists them).
 */
export function checkoutDataBranch(repoDir = process.cwd()) {
  const dir = config.dataDir;
  if (existsSync(join(dir, ".git"))) return;
  rmSync(dir, { recursive: true, force: true });
  let hasRemote = true;
  try {
    git(repoDir, "fetch", "--depth=1", "origin", `+refs/heads/${config.dataBranch}:refs/remotes/origin/${config.dataBranch}`);
  } catch {
    hasRemote = false;
  }
  if (hasRemote) {
    git(repoDir, "worktree", "add", "--force", "--detach", dir, `origin/${config.dataBranch}`);
  } else {
    git(repoDir, "worktree", "add", "--force", "--detach", dir);
    git(dir, "checkout", "--orphan", "data-init");
    git(dir, "rm", "-rf", "--quiet", "--ignore-unmatch", ".");
  }
}

/**
 * Replaces the remote `data` branch with a single commit of the current DATA_DIR contents.
 * No-op unless DATA_PUSH=1. Retries once on a transient push failure.
 */
export function publishDataBranch(message: string) {
  if (!config.dataPush) {
    console.log("[data] DATA_PUSH not set — keeping changes local");
    return;
  }
  const dir = config.dataDir;
  writeFileSync(
    join(dir, "README.md"),
    "# GitRepos data branch\n\nMachine-written by GitHub Actions. Force-pushed as a single commit; do not edit.\n" +
      "Trend counts derived from GH Archive (https://www.gharchive.org). Our computed counts are CC0.\n",
  );
  git(dir, "checkout", "--orphan", `data-${Date.now()}`);
  git(dir, "add", "-A");
  git(dir, "-c", "user.name=gitrepos-bot", "-c", "user.email=actions@users.noreply.github.com", "commit", "--quiet", "-m", message);
  // Auth header via GIT_CONFIG_* env vars (never on the command line, so it can't leak into error
  // messages); the encoded value is also masked in Actions logs.
  const token = process.env.DATA_PUSH_TOKEN;
  const authEnv: Record<string, string> = {};
  if (token) {
    const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
    if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${basic}`);
    Object.assign(authEnv, {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
    });
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      gitEnv(dir, authEnv, "push", "--force", "origin", `HEAD:refs/heads/${config.dataBranch}`);
      console.log(`[data] published ${config.dataBranch}: ${message}`);
      return;
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
}
