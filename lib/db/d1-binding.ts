import { assertD1Limits } from "./limits";
import { addMeta, type Db, type RunMeta, type SqlValue, type Statement, ZERO_META } from "./types";

function metaOf(m: D1Meta | undefined): RunMeta {
  return { rowsRead: m?.rows_read ?? 0, rowsWritten: m?.rows_written ?? 0, changes: m?.changes ?? 0 };
}

/** Adapter over a Cloudflare D1 binding (env.DB). */
export function d1BindingDb(d1: D1Database): Db {
  const prep = (sql: string, params: SqlValue[] = []) => {
    assertD1Limits(sql, params);
    return d1.prepare(sql).bind(...params);
  };
  return {
    async all<T>(sql: string, params?: SqlValue[]) {
      const r = await prep(sql, params).all<T>();
      return r.results;
    },
    async first<T>(sql: string, params?: SqlValue[]) {
      return (await prep(sql, params).first<T>()) ?? null;
    },
    async run(sql: string, params?: SqlValue[]) {
      const r = await prep(sql, params).run();
      return metaOf(r.meta);
    },
    async batch(statements: Statement[]) {
      if (!statements.length) return ZERO_META;
      const res = await d1.batch(statements.map((s) => prep(s.sql, s.params)));
      return res.reduce<RunMeta>((acc, r) => addMeta(acc, metaOf(r.meta)), ZERO_META);
    },
  };
}
