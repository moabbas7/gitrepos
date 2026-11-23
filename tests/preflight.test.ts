import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  checkCloudflareEnv,
  checkRemote,
  checkWranglerBinding,
  migrationFiles,
  pendingMigrations,
  wranglerD1Id,
} from "../jobs/lib/preflight";

const ACC = "f0bf41490a3942b2235c6db790efe07f";
const DB = "b511d7a1-1b38-4a21-983b-426bb16f6a5c";
const TOKEN = "tok_abc123";

describe("checkCloudflareEnv", () => {
  it("no secrets = local mode notice", () => {
    const r = checkCloudflareEnv({});
    expect(r.mode).toBe("local");
    expect(r.issues.map((i) => i.level)).toEqual(["notice"]);
  });

  it("partial secrets are an error naming what's missing (no silent fallback)", () => {
    const r = checkCloudflareEnv({ CLOUDFLARE_ACCOUNT_ID: ACC, CLOUDFLARE_API_TOKEN: TOKEN });
    expect(r.issues[0]).toMatchObject({ level: "error" });
    expect(r.issues[0].message).toContain("D1_DATABASE_ID");
  });

  it("flags malformed values and pasted whitespace/quotes", () => {
    const r = checkCloudflareEnv({ CLOUDFLARE_ACCOUNT_ID: "abc", CLOUDFLARE_API_TOKEN: `${TOKEN}\n`, D1_DATABASE_ID: `"${DB}"` });
    const msgs = r.issues.map((i) => i.message).join(" | ");
    expect(msgs).toContain("CLOUDFLARE_API_TOKEN contains spaces");
    expect(msgs).toContain("D1_DATABASE_ID contains spaces");
    expect(msgs).toContain("32 hex");
    expect(msgs).toContain("UUID");
  });

  it("accepts valid secrets", () => {
    expect(checkCloudflareEnv({ CLOUDFLARE_ACCOUNT_ID: ACC, CLOUDFLARE_API_TOKEN: TOKEN, D1_DATABASE_ID: DB }).issues).toEqual([]);
  });
});

describe("wrangler binding", () => {
  it("reads the DB binding id from the real wrangler.jsonc", () => {
    expect(wranglerD1Id(readFileSync("wrangler.jsonc", "utf8"))).toBe(DB);
  });
  it("errors when wrangler.jsonc and D1_DATABASE_ID point at different databases", () => {
    const jsonc = `{ // c\n "d1_databases": [{ "binding": "DB", "database_id": "${DB}", }], }`;
    expect(checkWranglerBinding(jsonc, DB)).toEqual([]);
    expect(checkWranglerBinding(jsonc, "00000000-0000-0000-0000-000000000000")[0].message).toContain("different databases");
    expect(checkWranglerBinding("{}", DB)[0].message).toContain('binding "DB"');
  });
});

describe("migrations", () => {
  it("lists repo migrations and computes pending ones", () => {
    expect(migrationFiles()).toContain("0001_init.sql");
    expect(pendingMigrations(["0001_init.sql", "0002_x.sql"], ["0001_init.sql"])).toEqual(["0002_x.sql"]);
  });
});

type Handler = (url: string, init?: RequestInit) => { status: number; body: unknown };
function mockFetch(handler: Handler) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}
const ok = (result: unknown) => ({ status: 200, body: { success: true, result } });
const base = { accountId: ACC, apiToken: TOKEN, databaseId: DB, githubToken: "gh" };

describe("checkRemote", () => {
  it("passes when the token is active, migrations are applied and Workers is accessible", async () => {
    const f = mockFetch((url) => {
      if (url.includes("tokens/verify")) return ok({ status: "active" });
      if (url.includes("/d1/")) return ok([{ results: [{ name: "0001_init.sql" }] }]);
      if (url.includes("workers/scripts")) return ok([]);
      return { status: 200, body: {} }; // github rate_limit
    });
    expect(await checkRemote({ ...base, deploy: true, fetchImpl: f })).toEqual([]);
  });

  it("stops with a clear error when the token is rejected", async () => {
    const f = mockFetch(() => ({ status: 401, body: { success: false, errors: [{ code: 1000, message: "Invalid API Token" }] } }));
    const issues = await checkRemote({ ...base, deploy: true, fetchImpl: f });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: "error", check: "cloudflare-token" });
    expect(issues[0].message).toContain("Invalid API Token");
  });

  it("explains missing migrations, missing D1 permission and a wrong database id", async () => {
    const cases: [unknown, number, RegExp][] = [
      [{ success: false, errors: [{ code: 7500, message: "no such table: d1_migrations" }] }, 400, /db:migrate:remote/],
      [{ success: false, errors: [{ code: 7403, message: "not authorized" }] }, 403, /D1 → Edit/],
      [{ success: false, errors: [{ code: 7404, message: "database not found" }] }, 404, /does not match a database/],
    ];
    for (const [body, status, hint] of cases) {
      const f = mockFetch((url) => (url.includes("tokens/verify") ? ok({ status: "active" }) : url.includes("/d1/") ? { status, body } : ok([])));
      const issues = await checkRemote({ ...base, deploy: false, fetchImpl: f });
      expect(issues.find((i) => i.check === "d1")?.message).toMatch(hint);
    }
  });

  it("reports unapplied migrations by name", async () => {
    const f = mockFetch((url) => (url.includes("tokens/verify") ? ok({ status: "active" }) : url.includes("/d1/") ? ok([{ results: [] }]) : ok([])));
    const issues = await checkRemote({ ...base, deploy: false, fetchImpl: f });
    expect(issues.find((i) => i.check === "d1-migrations")?.message).toContain("0001_init.sql");
  });

  it("flags a token that can't access Workers (deploy only) and warns about a bad GitHub token", async () => {
    const f = mockFetch((url) => {
      if (url.includes("tokens/verify")) return ok({ status: "active" });
      if (url.includes("/d1/")) return ok([{ results: [{ name: "0001_init.sql" }] }]);
      if (url.includes("workers/scripts")) return { status: 403, body: { success: false, errors: [{ code: 10000, message: "Authentication error" }] } };
      return { status: 401, body: {} };
    });
    const issues = await checkRemote({ ...base, deploy: true, fetchImpl: f });
    expect(issues.map((i) => [i.level, i.check])).toEqual([
      ["error", "workers"],
      ["warning", "github-token"],
    ]);
  });
});
