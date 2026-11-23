import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { addMeta, type Db, type RunMeta, type SqlValue, type Statement, ZERO_META } from "./types";

/**
 * node:sqlite adapter (Node >= 22.13) used by tests and local tooling. D1 is SQLite, so the same
 * migrations and queries run unchanged. rowsWritten is approximated by `changes` (D1 also counts
 * index writes; tests that check budgets use the REST/D1 meta instead).
 */
export function sqliteDb(path = ":memory:"): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(path);
  const exec = (sql: string, params: SqlValue[] = []): RunMeta => {
    const r = raw.prepare(sql).run(...params);
    const changes = Number(r.changes);
    return { rowsRead: 0, rowsWritten: changes, changes };
  };
  return {
    raw,
    async all<T>(sql: string, params: SqlValue[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async first<T>(sql: string, params: SqlValue[] = []) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async run(sql: string, params?: SqlValue[]) {
      return exec(sql, params);
    },
    async batch(statements: Statement[]) {
      let meta = ZERO_META;
      raw.exec("BEGIN");
      try {
        for (const s of statements) meta = addMeta(meta, exec(s.sql, s.params));
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
      return meta;
    },
  };
}

/** Applies every migrations/*.sql file in order (same files wrangler applies to D1). */
export function applyMigrations(db: { raw: DatabaseSync }, dir = join(process.cwd(), "migrations")) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    db.raw.exec(readFileSync(join(dir, f), "utf8"));
  }
}
