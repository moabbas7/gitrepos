import { describe, expect, it, vi } from "vitest";
import { BudgetExceededError, WriteBudget } from "../jobs/lib/budget";
import { d1RestDb, estimateWrites, planBatches } from "../jobs/lib/d1-rest";
import { chunkedInsert, D1_MAX_PARAMS } from "../jobs/lib/sql";

describe("chunkedInsert", () => {
  it("never exceeds D1's 100 bound parameters per statement", () => {
    const rows = Array.from({ length: 250 }, (_, i) => [i, `n${i}`, i * 2, null]);
    const stmts = chunkedInsert("INSERT INTO t (a, b, c, d)", rows, "ON CONFLICT DO NOTHING");
    for (const s of stmts) expect(s.params!.length).toBeLessThanOrEqual(D1_MAX_PARAMS);
    expect(stmts.reduce((n, s) => n + s.params!.length, 0)).toBe(1000);
    expect(stmts[0].sql).toMatch(/ON CONFLICT DO NOTHING$/);
    expect(stmts).toHaveLength(10); // 25 rows (100 params) per statement
  });

  it("rejects rows wider than the parameter limit and ragged rows", () => {
    expect(() => chunkedInsert("INSERT INTO t", [Array(101).fill(1)])).toThrow();
    expect(() => chunkedInsert("INSERT INTO t", [[1, 2], [1]])).toThrow();
  });
});

describe("planBatches", () => {
  it("splits by statement count and body size", () => {
    const stmts = Array.from({ length: 120 }, () => ({ sql: "SELECT 1", params: ["x".repeat(100)] }));
    expect(planBatches(stmts, 50, 1_000_000).map((b) => b.length)).toEqual([50, 50, 20]);
    expect(planBatches(stmts, 500, 1_100).every((b) => b.length <= 10)).toBe(true);
  });
});

describe("estimateWrites", () => {
  it("is zero for reads and scales with tuples for multi-row inserts", () => {
    expect(estimateWrites({ sql: "SELECT * FROM t" })).toBe(0);
    expect(estimateWrites({ sql: "INSERT INTO t (a,b) VALUES (?, ?), (?, ?), (?, ?)" })).toBe(6);
    expect(estimateWrites({ sql: "UPDATE t SET a = ? WHERE id = ?" })).toBe(2);
  });
});

function okResponse(results: unknown[][], meta = { rows_read: 1, rows_written: 3, size_after: 4096 }) {
  return new Response(JSON.stringify({ success: true, result: results.map((r) => ({ success: true, results: r, meta })) }), {
    status: 200,
  });
}

describe("d1RestDb", () => {
  const base = { accountId: "acc", databaseId: "db", apiToken: "tok", sleep: async () => {} };

  it("sends batches with auth, returns rows and accumulates D1's own meta", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init!.body));
      return okResponse(body.batch.map(() => [{ a: 1 }]));
    });
    const db = d1RestDb({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await db.all("SELECT a FROM t")).toEqual([{ a: 1 }]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/acc/d1/database/db/query");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    await db.batch(Array.from({ length: 60 }, () => ({ sql: "UPDATE t SET a = ?", params: [1] })));
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + ceil(60/50)
    expect(db.totals().rowsWritten).toBe(3 * 61);
    expect(db.lastSizeBytes()).toBe(4096);
  });

  it("retries 429 and 5xx with backoff", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      if (n === 1) return new Response("", { status: 429, headers: { "retry-after": "1" } });
      if (n === 2) return new Response("", { status: 503 });
      return okResponse([[]]);
    });
    const sleep = vi.fn(async () => {});
    const db = d1RestDb({ ...base, sleep, fetchImpl: fetchImpl as unknown as typeof fetch });
    await db.run("DELETE FROM t");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
  });

  it("surfaces D1 errors", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ success: false, errors: [{ code: 7500, message: "no such table: x" }] }), { status: 400 });
    const db = d1RestDb({ ...base, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(db.all("SELECT * FROM x")).rejects.toThrow("no such table: x");
  });

  it("refuses to send writes that would cross the daily budget", async () => {
    const fetchImpl = vi.fn(async () => okResponse([[]]));
    const budget = new WriteBudget(80_000, 79_999);
    const db = d1RestDb({ ...base, budget, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(db.run("INSERT INTO t (a) VALUES (?), (?)", [1, 2])).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fetchImpl).not.toHaveBeenCalled();
    // reads are always allowed
    await db.all("SELECT 1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("records actual rows written against the budget", async () => {
    const budget = new WriteBudget(1000, 100);
    const db = d1RestDb({ ...base, budget, fetchImpl: (async () => okResponse([[]])) as unknown as typeof fetch });
    await db.run("UPDATE t SET a = 1");
    expect(budget.used).toBe(103);
    expect(budget.remaining).toBe(897);
  });
});
