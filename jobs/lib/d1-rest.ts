/**
 * D1 over the Cloudflare REST API (used from GitHub Actions and local job runs).
 *   POST /accounts/{account}/d1/database/{db}/query  { batch: [{ sql, params }] }
 * - Splits work into requests of <= MAX_STATEMENTS statements / <= MAX_BODY bytes.
 * - Retries 429 / 5xx with exponential backoff.
 * - Reports rows_read / rows_written from D1's own meta (this is what the free-tier limit counts).
 * - Optional WriteBudget: every write is checked before sending and recorded afterwards.
 */
import { addMeta, type Db, type RunMeta, type SqlValue, type Statement, ZERO_META } from "@/lib/db/types";
import type { WriteBudget } from "./budget";
import { statementBytes } from "./sql";

const MAX_STATEMENTS = 50;
const MAX_BODY = 900_000;
const MAX_RETRIES = 5;

interface D1ResultItem {
  results?: Record<string, unknown>[];
  success: boolean;
  meta?: { rows_read?: number; rows_written?: number; changes?: number; size_after?: number };
}
interface D1Response {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: D1ResultItem[];
}

export interface RestOptions {
  accountId: string;
  databaseId: string;
  apiToken: string;
  budget?: WriteBudget;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export type RestDb = Db & { lastSizeBytes: () => number | null; totals: () => RunMeta };

/** Groups statements into request-sized batches. Exported for tests. */
export function planBatches(statements: Statement[], maxStatements = MAX_STATEMENTS, maxBody = MAX_BODY): Statement[][] {
  const out: Statement[][] = [];
  let cur: Statement[] = [];
  let bytes = 0;
  for (const s of statements) {
    const b = statementBytes(s);
    if (cur.length && (cur.length >= maxStatements || bytes + b > maxBody)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(s);
    bytes += b;
  }
  if (cur.length) out.push(cur);
  return out;
}

const isWrite = (sql: string) => /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i.test(sql);

/** Rough upper bound of rows a write statement may touch, used for the pre-flight budget check. */
export function estimateWrites(s: Statement): number {
  if (!isWrite(s.sql)) return 0;
  const tuples = (s.sql.match(/\(\s*\?(\s*,\s*\?)*\s*\)/g) ?? []).length;
  // Multi-row inserts: one row per tuple, x2 for a possible index entry. Single statements: assume 2.
  return Math.max(2, tuples * 2);
}

export function d1RestDb(opts: RestOptions): RestDb {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const url = `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/d1/database/${opts.databaseId}/query`;
  let lastSize: number | null = null;
  let totals = ZERO_META;

  async function send(batch: Statement[]): Promise<D1ResultItem[]> {
    if (opts.budget) opts.budget.check(batch.reduce((n, s) => n + estimateWrites(s), 0));
    const body = JSON.stringify({ batch: batch.map((s) => ({ sql: s.sql, params: s.params ?? [] })) });
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiToken}`, "Content-Type": "application/json" },
        body,
      });
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
        continue;
      }
      const json = (await res.json().catch(() => null)) as D1Response | null;
      if (!res.ok || !json?.success) {
        const msg = json?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${res.status}`;
        throw new Error(`D1 query failed: ${msg}`);
      }
      const items = json.result ?? [];
      let meta = ZERO_META;
      for (const it of items) {
        meta = addMeta(meta, {
          rowsRead: it.meta?.rows_read ?? 0,
          rowsWritten: it.meta?.rows_written ?? 0,
          changes: it.meta?.changes ?? 0,
        });
        if (typeof it.meta?.size_after === "number") lastSize = it.meta.size_after;
      }
      totals = addMeta(totals, meta);
      opts.budget?.record(meta.rowsWritten);
      return items;
    }
  }

  async function exec(statements: Statement[]): Promise<{ items: D1ResultItem[]; meta: RunMeta }> {
    const items: D1ResultItem[] = [];
    for (const b of planBatches(statements)) items.push(...(await send(b)));
    const meta = items.reduce<RunMeta>(
      (m, it) => addMeta(m, { rowsRead: it.meta?.rows_read ?? 0, rowsWritten: it.meta?.rows_written ?? 0, changes: it.meta?.changes ?? 0 }),
      ZERO_META,
    );
    return { items, meta };
  }

  return {
    async all<T>(sql: string, params?: SqlValue[]) {
      const { items } = await exec([{ sql, params }]);
      return (items[0]?.results ?? []) as T[];
    },
    async first<T>(sql: string, params?: SqlValue[]) {
      const { items } = await exec([{ sql, params }]);
      return ((items[0]?.results ?? [])[0] as T | undefined) ?? null;
    },
    async run(sql: string, params?: SqlValue[]) {
      return (await exec([{ sql, params }])).meta;
    },
    async batch(statements: Statement[]) {
      if (!statements.length) return ZERO_META;
      return (await exec(statements)).meta;
    },
    lastSizeBytes: () => lastSize,
    totals: () => totals,
  };
}
