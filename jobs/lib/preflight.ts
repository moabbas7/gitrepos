/**
 * Pre-flight checks run at the start of every workflow (scripts/preflight.ts). They turn
 * configuration mistakes into one clear error *before* any job runs, instead of a stack trace
 * halfway through the pipeline:
 *   - Cloudflare secrets: all three or none (partial = error), correct formats, no stray whitespace
 *   - wrangler.jsonc D1 binding points at the same database as D1_DATABASE_ID
 *   - API token is active; D1 is reachable with it; every migration in migrations/ is applied
 *   - (deploy) the token can access Workers scripts on the account
 *   - GitHub token works (warning only: jobs degrade gracefully without it)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Level = "error" | "warning" | "notice";
export interface Issue {
  level: Level;
  check: string;
  message: string;
}

const CF_VARS = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "D1_DATABASE_ID"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_ID = /^[0-9a-f]{32}$/i;

/** Pure: validates presence and format of the Cloudflare secrets. */
export function checkCloudflareEnv(env: Record<string, string | undefined>): { issues: Issue[]; mode: "remote" | "local" } {
  const issues: Issue[] = [];
  const raw = Object.fromEntries(CF_VARS.map((k) => [k, env[k] ?? ""]));
  const set = CF_VARS.filter((k) => raw[k] !== "");
  if (set.length === 0) {
    issues.push({
      level: "notice",
      check: "cloudflare-secrets",
      message: "No Cloudflare secrets set: jobs use a throwaway local D1 and the site is not deployed.",
    });
    return { issues, mode: "local" };
  }
  if (set.length < CF_VARS.length) {
    const missing = CF_VARS.filter((k) => raw[k] === "");
    issues.push({
      level: "error",
      check: "cloudflare-secrets",
      message: `Only some Cloudflare secrets are set. Missing: ${missing.join(", ")}. Add them under Settings → Secrets and variables → Actions (all three are needed).`,
    });
    return { issues, mode: "remote" };
  }
  for (const k of CF_VARS) {
    const v = raw[k];
    if (v !== v.trim() || /["'\s]/.test(v)) {
      issues.push({ level: "error", check: "cloudflare-secrets", message: `${k} contains spaces, quotes or a newline. Re-paste the bare value.` });
    }
  }
  const acc = raw.CLOUDFLARE_ACCOUNT_ID.trim();
  const db = raw.D1_DATABASE_ID.trim();
  if (!ACCOUNT_ID.test(acc)) {
    issues.push({ level: "error", check: "cloudflare-secrets", message: "CLOUDFLARE_ACCOUNT_ID should be 32 hex characters (Workers & Pages → Overview → Account ID)." });
  }
  if (!UUID.test(db)) {
    issues.push({ level: "error", check: "cloudflare-secrets", message: "D1_DATABASE_ID should be a UUID like b511d7a1-1b38-4a21-983b-426bb16f6a5c (`npx wrangler d1 list`)." });
  }
  return { issues, mode: "remote" };
}

/** Reads database_id for the DB binding from wrangler.jsonc (comments stripped). */
export function wranglerD1Id(jsonc: string): string | null {
  const noComments = jsonc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");
  const cfg = JSON.parse(noComments.replace(/,(\s*[}\]])/g, "$1")) as {
    d1_databases?: { binding: string; database_id: string }[];
  };
  return cfg.d1_databases?.find((d) => d.binding === "DB")?.database_id ?? null;
}

export function checkWranglerBinding(jsonc: string, d1DatabaseId: string): Issue[] {
  let id: string | null;
  try {
    id = wranglerD1Id(jsonc);
  } catch (e) {
    return [{ level: "error", check: "wrangler-binding", message: `wrangler.jsonc could not be parsed: ${(e as Error).message}` }];
  }
  if (!id) return [{ level: "error", check: "wrangler-binding", message: 'wrangler.jsonc has no d1_databases entry with binding "DB".' }];
  if (id !== d1DatabaseId.trim()) {
    return [
      {
        level: "error",
        check: "wrangler-binding",
        message: `wrangler.jsonc binds DB to ${id} but D1_DATABASE_ID is ${d1DatabaseId.trim()}. The deployed site and the jobs would use different databases. Make them match.`,
      },
    ];
  }
  return [];
}

export function migrationFiles(dir = "migrations"): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Pure: which migration files are not recorded in D1's d1_migrations table. */
export function pendingMigrations(files: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return files.filter((f) => !done.has(f));
}

interface CfResponse<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: T;
}

export interface RemoteOptions {
  accountId: string;
  apiToken: string;
  databaseId: string;
  deploy: boolean;
  githubToken?: string;
  migrationsDir?: string;
  fetchImpl?: typeof fetch;
}

const CF = "https://api.cloudflare.com/client/v4";

function cfErrors(json: CfResponse<unknown> | null, status: number): string {
  return json?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${status}`;
}

/** Network checks against Cloudflare (and GitHub). Never throws; returns issues. */
export async function checkRemote(opts: RemoteOptions): Promise<Issue[]> {
  const f = opts.fetchImpl ?? fetch;
  const issues: Issue[] = [];
  const auth = { Authorization: `Bearer ${opts.apiToken.trim()}` };
  const acc = opts.accountId.trim();
  const call = async <T>(path: string, init: RequestInit = {}) => {
    const res = await f(`${CF}${path}`, { ...init, headers: { ...auth, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    const json = (await res.json().catch(() => null)) as CfResponse<T> | null;
    return { res, json };
  };

  // 1. Token is valid and active (account-owned tokens verify on the account endpoint, user tokens on /user).
  try {
    let v = await call<{ status: string }>(`/accounts/${acc}/tokens/verify`);
    if (!v.json?.success) v = await call<{ status: string }>(`/user/tokens/verify`);
    if (!v.json?.success) {
      issues.push({ level: "error", check: "cloudflare-token", message: `CLOUDFLARE_API_TOKEN was rejected (${cfErrors(v.json, v.res.status)}). Create a new token (README step 2.4) and update the secret.` });
      return issues; // nothing else can work
    }
    if (v.json.result?.status && v.json.result.status !== "active") {
      issues.push({ level: "error", check: "cloudflare-token", message: `CLOUDFLARE_API_TOKEN status is "${v.json.result.status}", not active.` });
      return issues;
    }
  } catch (e) {
    issues.push({ level: "error", check: "cloudflare-token", message: `Could not reach the Cloudflare API: ${(e as Error).message}` });
    return issues;
  }

  // 2. D1 reachable + migrations applied.
  try {
    const q = await call<{ results: { name: string }[] }[]>(`/accounts/${acc}/d1/database/${opts.databaseId.trim()}/query`, {
      method: "POST",
      body: JSON.stringify({ sql: "SELECT name FROM d1_migrations ORDER BY id" }),
    });
    if (!q.json?.success) {
      const msg = cfErrors(q.json, q.res.status);
      const hint = /no such table: d1_migrations/i.test(msg)
        ? "The database has no migrations yet: run `npm run db:migrate:remote`."
        : q.res.status === 403 || /7403|not authorized/i.test(msg)
          ? "The token lacks D1 permission: add Account → D1 → Edit to the token."
          : q.res.status === 404 || /7404|not found/i.test(msg)
            ? "D1_DATABASE_ID does not match a database in this account (`npx wrangler d1 list`)."
            : "";
      issues.push({ level: "error", check: "d1", message: `D1 query failed (${msg}). ${hint}`.trim() });
    } else {
      const applied = (q.json.result?.[0]?.results ?? []).map((r) => r.name);
      const pending = pendingMigrations(migrationFiles(opts.migrationsDir), applied);
      if (pending.length) {
        issues.push({ level: "error", check: "d1-migrations", message: `Migrations not applied to the remote D1: ${pending.join(", ")}. Run \`npm run db:migrate:remote\`.` });
      }
    }
  } catch (e) {
    issues.push({ level: "error", check: "d1", message: `Could not query D1: ${(e as Error).message}` });
  }

  // 3. Deploy permission (read access to Workers scripts is the best non-destructive probe).
  if (opts.deploy) {
    try {
      const w = await call<unknown[]>(`/accounts/${acc}/workers/scripts`);
      if (!w.json?.success) {
        issues.push({ level: "error", check: "workers", message: `The token cannot access Workers scripts (${cfErrors(w.json, w.res.status)}). Use the "Edit Cloudflare Workers" token template.` });
      }
    } catch (e) {
      issues.push({ level: "error", check: "workers", message: `Could not reach the Workers API: ${(e as Error).message}` });
    }
  }

  // 4. GitHub token (warning only).
  if (opts.githubToken) {
    try {
      const g = await f("https://api.github.com/rate_limit", {
        headers: { Authorization: `Bearer ${opts.githubToken}`, "User-Agent": "gitrepos-preflight" },
      });
      if (!g.ok) issues.push({ level: "warning", check: "github-token", message: `GitHub token rejected (HTTP ${g.status}); metadata jobs will be skipped. Check the GH_PAT secret.` });
    } catch {
      issues.push({ level: "warning", check: "github-token", message: "Could not reach the GitHub API to verify the token." });
    }
  } else {
    issues.push({ level: "warning", check: "github-token", message: "No GitHub token: metadata, ranking and spam checks will be skipped." });
  }
  return issues;
}

export function readWranglerConfig(path = join(process.cwd(), "wrangler.jsonc")): string {
  return readFileSync(path, "utf8");
}
