/**
 * Cloudflare D1 statement limits (https://developers.cloudflare.com/d1/platform/limits/).
 * Every Db adapter — D1 binding, D1 REST and the node:sqlite test adapter — calls
 * `assertD1Limits` before executing, so a query that D1 would reject fails the same way in tests.
 */
export const D1_MAX_PARAMS = 100;
export const D1_MAX_SQL_BYTES = 100_000;

export class D1LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "D1LimitError";
  }
}

export function assertD1Limits(sql: string, params: readonly unknown[] = []) {
  if (params.length > D1_MAX_PARAMS) {
    throw new D1LimitError(
      `D1 limit: statement has ${params.length} bound parameters (max ${D1_MAX_PARAMS}). ` +
        `Chunk the IN-list with inClauseChunks(). SQL: ${sql.replace(/\s+/g, " ").slice(0, 120)}…`,
    );
  }
  const bytes = Buffer.byteLength(sql, "utf8");
  if (bytes > D1_MAX_SQL_BYTES) {
    throw new D1LimitError(`D1 limit: SQL statement is ${bytes} bytes (max ${D1_MAX_SQL_BYTES}). Bind large values as parameters.`);
  }
}

/**
 * Splits `values` into chunks for `WHERE x IN (?, ?, …)` queries, leaving room for the
 * statement's other bound parameters: chunk size = 100 − reservedParams.
 *
 *   for (const chunk of inClauseChunks(ids, 1)) db.all(`… IN (${placeholders(chunk)}) AND date >= ?`, [...chunk, since])
 */
export function inClauseChunks<T>(values: readonly T[], reservedParams = 0): T[][] {
  const size = D1_MAX_PARAMS - reservedParams;
  if (size < 1) throw new D1LimitError(`reservedParams (${reservedParams}) leaves no room for IN-list values`);
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

export const placeholders = (values: readonly unknown[]) => values.map(() => "?").join(",");
