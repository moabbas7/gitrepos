/**
 * Minimal database interface implemented by three adapters:
 *  - D1 Worker binding        (lib/db/d1-binding.ts)  — runtime in the Worker, local preview
 *  - D1 REST API              (jobs/lib/d1-rest.ts)   — GitHub Actions jobs, build snapshot
 *  - node:sqlite in-memory    (lib/db/sqlite.ts)      — tests
 * Keeping SQL portable across them means jobs and tests exercise the exact same queries.
 */
export type SqlValue = string | number | null;

export interface Statement {
  sql: string;
  params?: SqlValue[];
}

export interface RunMeta {
  rowsRead: number;
  rowsWritten: number;
  changes: number;
}

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T | null>;
  run(sql: string, params?: SqlValue[]): Promise<RunMeta>;
  /** Executes statements in order, atomically where the backend supports it. */
  batch(statements: Statement[]): Promise<RunMeta>;
}

export const ZERO_META: RunMeta = { rowsRead: 0, rowsWritten: 0, changes: 0 };

export function addMeta(a: RunMeta, b: RunMeta): RunMeta {
  return {
    rowsRead: a.rowsRead + b.rowsRead,
    rowsWritten: a.rowsWritten + b.rowsWritten,
    changes: a.changes + b.changes,
  };
}
