import { D1_MAX_PARAMS } from "@/lib/db/limits";
import type { SqlValue, Statement } from "@/lib/db/types";

export { D1_MAX_PARAMS, D1_MAX_SQL_BYTES } from "@/lib/db/limits";

/** SQL literal for generated .sql files (seed). Prefer bound params everywhere else. */
export function lit(v: SqlValue | boolean | undefined): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

/**
 * Builds multi-row INSERT statements that respect D1's 100-parameter limit.
 * `suffix` is appended to each statement (e.g. an ON CONFLICT clause).
 */
export function chunkedInsert(
  head: string, // e.g. "INSERT INTO t (a, b, c)"
  rows: SqlValue[][],
  suffix = "",
  maxParams = D1_MAX_PARAMS,
): Statement[] {
  if (!rows.length) return [];
  const width = rows[0].length;
  if (width > maxParams) throw new Error(`row width ${width} exceeds ${maxParams} params`);
  const perStmt = Math.max(1, Math.floor(maxParams / width));
  const tuple = `(${Array(width).fill("?").join(", ")})`;
  const out: Statement[] = [];
  for (let i = 0; i < rows.length; i += perStmt) {
    const chunk = rows.slice(i, i + perStmt);
    for (const r of chunk) if (r.length !== width) throw new Error("ragged rows in chunkedInsert");
    out.push({
      sql: `${head} VALUES ${chunk.map(() => tuple).join(", ")}${suffix ? ` ${suffix}` : ""}`,
      params: chunk.flat(),
    });
  }
  return out;
}

/** Approximate request size of a statement (SQL text + params), for batching under body limits. */
export function statementBytes(s: Statement): number {
  let n = s.sql.length;
  for (const p of s.params ?? []) n += typeof p === "string" ? p.length + 4 : 12;
  return n;
}
