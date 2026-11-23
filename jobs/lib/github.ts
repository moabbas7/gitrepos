/**
 * GitHub API client for the pipeline. Respects GitHub's limits and terms:
 *  - GraphQL: 5,000 points/hour per user, <= 2,000 points/min, 100 nodes per connection.
 *    Every query asks for rateLimit { cost remaining resetAt } and we pause before running out.
 *  - Secondary limits: requests are sequential (no concurrency); honour retry-after / reset headers.
 *  - Search REST: 30 requests/minute authenticated, max 1,000 results per query, 100 per page.
 *  - Identifies itself with a descriptive User-Agent.
 */
import { config } from "./config";
import type { RepoMeta } from "./types";

const GQL_URL = "https://api.github.com/graphql";
const MAX_WAIT_MS = 15 * 60_000; // give up (return partial results) rather than wait longer

export interface GithubOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (...a: unknown[]) => void;
}

/** GitHub answered 502/504: the query took longer than GitHub's 10 s limit (not a rate limit). */
export class GraphQLTimeoutError extends Error {
  constructor(public status: number) {
    super(`GitHub GraphQL timed out (HTTP ${status})`);
    this.name = "GraphQLTimeoutError";
  }
}

export class RateLimitedError extends Error {
  constructor(public resetAt: string) {
    super(`GitHub rate limit exhausted until ${resetAt}`);
  }
}

interface GqlResponse<T> {
  data?: T & { rateLimit?: { cost: number; remaining: number; resetAt: string } };
  errors?: { type?: string; message: string; path?: (string | number)[] }[];
}

export class GitHub {
  private token: string;
  private fetchImpl: typeof fetch;
  private sleep: (ms: number) => Promise<void>;
  private log: (...a: unknown[]) => void;
  public pointsUsed = 0;
  public requests = 0;

  constructor(opts: GithubOptions = {}) {
    this.token = opts.token ?? config.githubToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.log = opts.log ?? (() => {});
  }

  get enabled() {
    return !!this.token;
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.token}`,
      "User-Agent": config.userAgent,
      "X-GitHub-Api-Version": "2022-11-28",
      ...extra,
    };
  }

  /** Waits according to GitHub's rate-limit headers. Returns false if the wait would be too long. */
  private async backoff(res: Response, attempt: number): Promise<boolean> {
    const retryAfter = Number(res.headers.get("retry-after"));
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    let wait: number;
    if (Number.isFinite(retryAfter) && retryAfter > 0) wait = retryAfter * 1000;
    else if (remaining === "0" && Number.isFinite(reset)) wait = Math.max(0, reset * 1000 - Date.now()) + 1000;
    else wait = Math.min(60_000 * 2 ** attempt, MAX_WAIT_MS);
    if (wait > MAX_WAIT_MS) return false;
    this.log(`[github] rate limited (status ${res.status}), waiting ${Math.round(wait / 1000)}s`);
    await this.sleep(wait);
    return true;
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<GqlResponse<T>> {
    if (!this.token) throw new Error("GITHUB_TOKEN is not set");
    for (let attempt = 0; attempt < 4; attempt++) {
      this.requests++;
      const res = await this.fetchImpl(GQL_URL, {
        method: "POST",
        headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ query, variables }),
      });
      // 502/504 = query timeout (GitHub stops at 10 s). Retry quickly; callers split the batch if it persists.
      if (res.status === 502 || res.status === 504) {
        await res.body?.cancel();
        if (attempt < 2) {
          this.log(`[github] GraphQL timeout (HTTP ${res.status}), retrying in ${3 * 2 ** attempt}s`);
          await this.sleep(3000 * 2 ** attempt);
          continue;
        }
        throw new GraphQLTimeoutError(res.status);
      }
      if (res.status === 403 || res.status === 429) {
        if (await this.backoff(res, attempt)) continue;
        throw new RateLimitedError(new Date(Date.now() + MAX_WAIT_MS).toISOString());
      }
      const json = (await res.json()) as GqlResponse<T>;
      // Primary limit exhausted is reported as 200 with remaining=0.
      if (json.errors?.some((e) => e.type === "RATE_LIMITED")) {
        if (await this.backoff(res, attempt)) continue;
        throw new RateLimitedError(res.headers.get("x-ratelimit-reset") ?? "unknown");
      }
      const rl = json.data?.rateLimit;
      if (rl) {
        this.pointsUsed += rl.cost;
        if (rl.remaining < rl.cost * 3 + 10) {
          const wait = Date.parse(rl.resetAt) - Date.now() + 1000;
          if (wait > MAX_WAIT_MS) throw new RateLimitedError(rl.resetAt);
          this.log(`[github] points low (${rl.remaining}), waiting ${Math.round(wait / 1000)}s for reset`);
          await this.sleep(Math.max(0, wait));
        }
      }
      return json;
    }
    throw new Error("GitHub GraphQL: too many retries");
  }

  /**
   * Fetches metadata for up to 100 repos per query by owner/name. Repos that no longer exist or
   * whose databaseId changed (name reused) come back as { missing: true }.
   */
  async fetchRepos(refs: { id: number; fullName: string }[], batchSize = 50): Promise<Map<number, RepoMeta>> {
    const out = new Map<number, RepoMeta>();
    for (let i = 0; i < refs.length; i += batchSize) await this.fetchRepoBatch(refs.slice(i, i + batchSize), out);
    return out;
  }

  /** One GraphQL query; on a persistent timeout the batch is split in half (down to 5 repos). */
  private async fetchRepoBatch(chunk: { id: number; fullName: string }[], out: Map<number, RepoMeta>): Promise<void> {
    {
      const vars: Record<string, string> = {};
      const decl: string[] = [];
      const fields = chunk
        .map((r, j) => {
          const [owner, name] = r.fullName.split("/");
          vars[`o${j}`] = owner;
          vars[`n${j}`] = name;
          decl.push(`$o${j}: String!`, `$n${j}: String!`);
          return `r${j}: repository(owner: $o${j}, name: $n${j}) { ...F }`;
        })
        .join("\n");
      const query = `query(${decl.join(", ")}) {
        rateLimit { cost remaining resetAt }
        ${fields}
      }
      fragment F on Repository {
        databaseId name owner { login avatarUrl } description primaryLanguage { name }
        repositoryTopics(first: 8) { nodes { topic { name } } }
        stargazerCount forkCount issues(states: OPEN) { totalCount } watchers { totalCount }
        licenseInfo { spdxId } homepageUrl createdAt pushedAt isArchived isFork isEmpty isPrivate
      }`;
      let res;
      try {
        res = await this.graphql<Record<string, RawRepo | null>>(query, vars);
      } catch (e) {
        if (e instanceof GraphQLTimeoutError && chunk.length > 5) {
          const mid = Math.ceil(chunk.length / 2);
          this.log(`[github] splitting a timed-out batch of ${chunk.length}`);
          await this.fetchRepoBatch(chunk.slice(0, mid), out);
          await this.fetchRepoBatch(chunk.slice(mid), out);
          return;
        }
        throw e;
      }
      const now = new Date().toISOString();
      chunk.forEach((r, j) => {
        const raw = res.data?.[`r${j}`];
        if (!raw || raw.isPrivate || raw.databaseId !== r.id) {
          const [owner, name] = r.fullName.split("/");
          out.set(r.id, missingMeta(r.id, owner, name, now));
        } else out.set(r.id, mapRepo(raw, now));
      });
    }
  }

  /** Newest stargazers with account creation dates, for the spam guard. 10 repos per query. */
  async stargazerSamples(
    refs: { id: number; fullName: string }[],
    sampleSize = 50,
    batchSize = 10,
  ): Promise<Map<number, { starredAt: string; userCreatedAt: string }[]>> {
    const out = new Map<number, { starredAt: string; userCreatedAt: string }[]>();
    for (let i = 0; i < refs.length; i += batchSize) {
      const chunk = refs.slice(i, i + batchSize);
      const vars: Record<string, string | number> = { n: sampleSize };
      const decl: string[] = ["$n: Int!"];
      const fields = chunk
        .map((r, j) => {
          const [owner, name] = r.fullName.split("/");
          vars[`o${j}`] = owner;
          vars[`r${j}`] = name;
          decl.push(`$o${j}: String!`, `$r${j}: String!`);
          return `s${j}: repository(owner: $o${j}, name: $r${j}) {
            stargazers(first: $n, orderBy: { field: STARRED_AT, direction: DESC }) {
              edges { starredAt node { createdAt } }
            }
          }`;
        })
        .join("\n");
      const res = await this.graphql<Record<string, { stargazers: { edges: { starredAt: string; node: { createdAt: string } }[] } } | null>>(
        `query(${decl.join(", ")}) { rateLimit { cost remaining resetAt } ${fields} }`,
        vars,
      );
      chunk.forEach((r, j) => {
        const s = res.data?.[`s${j}`];
        if (s) out.set(r.id, s.stargazers.edges.map((e) => ({ starredAt: e.starredAt, userCreatedAt: e.node.createdAt })));
      });
    }
    return out;
  }

  /** Raw README text (any filename) via REST; null if none. */
  async readme(fullName: string): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      this.requests++;
      const res = await this.fetchImpl(`https://api.github.com/repos/${fullName}/readme`, {
        headers: this.headers({ Accept: "application/vnd.github.raw+json" }),
      });
      if (res.status === 404) return null;
      if (res.status === 403 || res.status === 429) {
        if (await this.backoff(res, attempt)) continue;
        return null;
      }
      if (!res.ok) return null;
      const text = await res.text();
      return text.slice(0, 20_000);
    }
    return null;
  }

  /** Search REST (30 req/min). Returns up to `maxPages` × 100 repos for one query. */
  async searchRepos(q: string, maxPages = 10): Promise<RawSearchRepo[]> {
    const out: RawSearchRepo[] = [];
    for (let page = 1; page <= maxPages; page++) {
      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        this.requests++;
        res = await this.fetchImpl(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${page}`,
          { headers: this.headers({ Accept: "application/vnd.github+json" }) },
        );
        if ((res.status === 403 || res.status === 429) && (await this.backoff(res, attempt))) continue;
        break;
      }
      if (!res || !res.ok) break;
      const json = (await res.json()) as { items: RawSearchRepo[]; total_count: number };
      out.push(...json.items);
      await this.sleep(2100); // stay under 30 requests/minute
      if (json.items.length < 100 || out.length >= Math.min(json.total_count, 1000)) break;
    }
    return out;
  }
}

export interface RawRepo {
  databaseId: number;
  name: string;
  owner: { login: string; avatarUrl: string };
  description: string | null;
  primaryLanguage: { name: string } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  watchers: { totalCount: number };
  licenseInfo: { spdxId: string | null } | null;
  homepageUrl: string | null;
  createdAt: string;
  pushedAt: string | null;
  isArchived: boolean;
  isFork: boolean;
  isEmpty: boolean;
  isPrivate: boolean;
}

export interface RawSearchRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  license: { spdx_id: string | null } | null;
  homepage: string | null;
  created_at: string;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
  size: number;
}

export function mapRepo(r: RawRepo, fetchedAt: string): RepoMeta {
  return {
    id: r.databaseId,
    owner: r.owner.login,
    name: r.name,
    description: r.description,
    language: r.primaryLanguage?.name ?? null,
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    stars: r.stargazerCount,
    forks: r.forkCount,
    issues: r.issues.totalCount,
    watchers: r.watchers.totalCount,
    licence: r.licenseInfo?.spdxId && r.licenseInfo.spdxId !== "NOASSERTION" ? r.licenseInfo.spdxId : null,
    homepage: r.homepageUrl || null,
    avatarUrl: r.owner.avatarUrl,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
    isArchived: r.isArchived,
    isFork: r.isFork,
    isEmpty: r.isEmpty,
    fetchedAt,
  };
}

export function mapSearchRepo(r: RawSearchRepo, fetchedAt: string): RepoMeta {
  return {
    id: r.id,
    owner: r.owner.login,
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    issues: r.open_issues_count,
    watchers: r.watchers_count,
    licence: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
    homepage: r.homepage || null,
    avatarUrl: r.owner.avatar_url,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    isArchived: r.archived,
    isFork: r.fork,
    isEmpty: r.size === 0,
    fetchedAt,
  };
}

export function missingMeta(id: number, owner: string, name: string, fetchedAt: string): RepoMeta {
  return {
    id,
    owner,
    name,
    description: null,
    language: null,
    topics: [],
    stars: 0,
    forks: 0,
    issues: 0,
    watchers: 0,
    licence: null,
    homepage: null,
    avatarUrl: null,
    createdAt: null,
    pushedAt: null,
    isArchived: false,
    isFork: false,
    isEmpty: false,
    fetchedAt,
    missing: true,
  };
}
