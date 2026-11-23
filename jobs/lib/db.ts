/**
 * Job database: remote D1 over REST when Cloudflare credentials are set (CI), otherwise the
 * local D1 that `wrangler dev` / `npm run preview` use (via wrangler's getPlatformProxy).
 */
import { d1BindingDb } from "@/lib/db/d1-binding";
import { addMeta, type Db, type RunMeta, type SqlValue, type Statement, ZERO_META } from "@/lib/db/types";
import type { WriteBudget } from "./budget";
import { config, hasRemoteD1 } from "./config";
import { d1RestDb, estimateWrites } from "./d1-rest";

export interface JobDb {
  /** Budgeted connection for data writes. */
  db: Db;
  /** Unbudgeted connection for job bookkeeping (job_runs) — always allowed. */
  ops: Db;
  sizeBytes: () => Promise<number | null>;
  totals: () => RunMeta;
  close: () => Promise<void>;
  mode: "remote" | "local";
}

/** Wraps a Db so every write is checked against / recorded in the budget. */
export function budgeted(inner: Db, budget: WriteBudget | undefined, onMeta: (m: RunMeta) => void): Db {
  const track = (m: RunMeta) => {
    onMeta(m);
    budget?.record(m.rowsWritten);
    return m;
  };
  return {
    all: <T,>(sql: string, params?: SqlValue[]) => inner.all<T>(sql, params),
    first: <T,>(sql: string, params?: SqlValue[]) => inner.first<T>(sql, params),
    async run(sql: string, params?: SqlValue[]) {
      budget?.check(estimateWrites({ sql, params }));
      return track(await inner.run(sql, params));
    },
    async batch(statements: Statement[]) {
      budget?.check(statements.reduce((n, s) => n + estimateWrites(s), 0));
      return track(await inner.batch(statements));
    },
  };
}

export async function openJobDb(budget?: WriteBudget): Promise<JobDb> {
  let totals = ZERO_META;
  const add = (m: RunMeta) => (totals = addMeta(totals, m));

  if (hasRemoteD1()) {
    const opts = { accountId: config.cfAccountId, databaseId: config.d1DatabaseId, apiToken: config.cfApiToken };
    const rest = d1RestDb(opts);
    return {
      db: budgeted(rest, budget, add),
      ops: budgeted(rest, undefined, add),
      sizeBytes: async () => {
        await rest.first("SELECT 1");
        return rest.lastSizeBytes();
      },
      totals: () => totals,
      close: async () => {},
      mode: "remote",
    };
  }

  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: true });
  const local = d1BindingDb(proxy.env.DB);
  return {
    db: budgeted(local, budget, add),
    ops: budgeted(local, undefined, add),
    sizeBytes: async () => {
      const r = await proxy.env.DB.prepare("SELECT 1").run();
      return (r.meta as { size_after?: number }).size_after ?? null;
    },
    totals: () => totals,
    close: () => proxy.dispose(),
    mode: "local",
  };
}
