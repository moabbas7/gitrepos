/**
 * D1 daily write-budget guard. D1 Free allows 100k rows written/day (reset 00:00 UTC); we stop
 * non-critical writes well before that. Usage = SUM(job_runs.rows_written) since UTC midnight
 * + rows written by the current job so far.
 */
import type { Db } from "@/lib/db/types";

export class BudgetExceededError extends Error {
  constructor(
    public used: number,
    public budget: number,
    public requested: number,
  ) {
    super(`D1 write budget exceeded: used ${used} + requested ${requested} > ${budget}`);
    this.name = "BudgetExceededError";
  }
}

export class WriteBudget {
  private spent = 0;
  constructor(
    public readonly budget: number,
    public usedBefore: number,
  ) {}

  get used() {
    return this.usedBefore + this.spent;
  }
  get remaining() {
    return Math.max(0, this.budget - this.used);
  }

  /** Throws if writing `estimate` more rows would cross the budget. */
  check(estimate: number) {
    if (this.used + estimate > this.budget) throw new BudgetExceededError(this.used, this.budget, estimate);
  }
  canAfford(estimate: number) {
    return this.used + estimate <= this.budget;
  }
  record(rowsWritten: number) {
    this.spent += rowsWritten;
  }
  get spentByThisJob() {
    return this.spent;
  }
}

export function utcMidnightIso(now = new Date()): string {
  return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

export async function writesToday(db: Db, now = new Date()): Promise<number> {
  const r = await db.first<{ n: number | null }>("SELECT SUM(rows_written) AS n FROM job_runs WHERE started_at >= ?", [
    utcMidnightIso(now),
  ]);
  return r?.n ?? 0;
}
