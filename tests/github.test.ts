import { describe, expect, it, vi } from "vitest";
import { GitHub, GraphQLTimeoutError } from "../jobs/lib/github";

function repoJson(id: number) {
  return {
    databaseId: id,
    name: `r${id}`,
    owner: { login: "o", avatarUrl: "a" },
    description: null,
    primaryLanguage: null,
    repositoryTopics: { nodes: [] },
    stargazerCount: id,
    forkCount: 0,
    issues: { totalCount: 0 },
    watchers: { totalCount: 0 },
    licenseInfo: null,
    homepageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    pushedAt: null,
    isArchived: false,
    isFork: false,
    isEmpty: false,
    isPrivate: false,
  };
}

describe("GitHub GraphQL timeouts", () => {
  it("treats 502 as a timeout (short retries, not a rate-limit wait) and splits the batch", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const vars = JSON.parse(String(init!.body)).variables as Record<string, string>;
      const n = Object.keys(vars).length / 2;
      if (n > 10) return new Response("", { status: 502 }); // big batches time out
      const data: Record<string, unknown> = { rateLimit: { cost: 1, remaining: 4000, resetAt: new Date().toISOString() } };
      for (let j = 0; j < n; j++) data[`r${j}`] = repoJson(Number(vars[`n${j}`].slice(1)));
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    const gh = new GitHub({ token: "t", fetchImpl: fetchImpl as unknown as typeof fetch, sleep });
    const refs = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, fullName: `o/r${i + 1}` }));
    const out = await gh.fetchRepos(refs, 40);
    expect(out.size).toBe(40);
    expect([...out.values()].every((m) => !m.missing)).toBe(true);
    // retry waits are seconds, never the 60s rate-limit backoff
    for (const [ms] of sleep.mock.calls as unknown as [number][]) expect(ms).toBeLessThanOrEqual(6000);
  });

  it("gives up with GraphQLTimeoutError when even tiny batches time out", async () => {
    const fetchImpl = async () => new Response("", { status: 504 });
    const gh = new GitHub({ token: "t", fetchImpl: fetchImpl as unknown as typeof fetch, sleep: async () => {} });
    await expect(gh.fetchRepos([{ id: 1, fullName: "o/r1" }])).rejects.toBeInstanceOf(GraphQLTimeoutError);
  });
});
