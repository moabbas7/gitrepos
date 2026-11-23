/**
 * Wraps every job: records start/end/status/rows/error/DB size in `job_runs`, applies the D1
 * write budget, and guarantees a failed run never deletes data (jobs only write after they
 * have fully computed their output; errors propagate before any destructive step).
 */
import type { Db } from "@/lib/db/types";
import { BudgetExceededError, WriteBudget, writesToday } from "./budget";
import { config } from "./config";
import { openJobDb, type JobDb } from "./db";
import { isoNow } from "./time";

export type JobStatus = "success" | "partial" | "throttled" | "failed" | "skipped";

export interface JobContext {
  db: Db;
  jobDb: JobDb;
  budget: WriteBudget;
  /** Set by the job to describe the run (stored as JSON in job_runs.meta). */
  meta: Record<string, unknown>;
  setSource: (s: string) => void;
  setStatus: (s: Exclude<JobStatus, "failed">) => void;
  log: (...a: unknown[]) => void;
}

export interface JobResult {
  status: JobStatus;
  rowsWritten: number;
  error?: string;
}

export async function runJob(name: string, fn: (ctx: JobContext) => Promise<void>): Promise<JobResult> {
  const budget = new WriteBudget(config.dailyWriteBudget, 0);
  const jobDb = await openJobDb(budget);
  const started = isoNow();
  const used = await writesToday(jobDb.ops).catch(() => 0);
  budget.usedBefore = used;
  const insert = await jobDb.ops.first<{ id: number }>(
    "INSERT INTO job_runs (job, started_at, status) VALUES (?, ?, 'running') RETURNING id",
    [name, started],
  );
  const runId = insert?.id ?? null;

  let status: JobStatus = "success";
  let source: string | null = null;
  let error: string | undefined;
  const meta: Record<string, unknown> = { mode: jobDb.mode, writesBefore: used };
  const log = (...a: unknown[]) => console.log(`[${name}]`, ...a);

  try {
    await fn({
      db: jobDb.db,
      jobDb,
      budget,
      meta,
      setSource: (s) => (source = s),
      setStatus: (s) => (status = s),
      log,
    });
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      status = "throttled";
      error = e.message;
      log("throttled:", e.message);
    } else {
      status = "failed";
      error = e instanceof Error ? `${e.message}\n${e.stack ?? ""}`.slice(0, 4000) : String(e);
      console.error(`[${name}] failed:`, e);
    }
  }

  const totals = jobDb.totals();
  const size = await jobDb.sizeBytes().catch(() => null);
  meta.writesAfter = budget.used;
  try {
    if (runId !== null) {
      await jobDb.ops.run(
        `UPDATE job_runs SET ended_at = ?, status = ?, source = ?, rows_read = ?, rows_written = ?,
           db_size_bytes = ?, error = ?, meta = ? WHERE id = ?`,
        [isoNow(), status, source, totals.rowsRead, totals.rowsWritten, size, error ?? null, JSON.stringify(meta), runId],
      );
    }
  } finally {
    await jobDb.close();
  }
  log(`status=${status} rows_written=${totals.rowsWritten} rows_read=${totals.rowsRead} db_size=${size ?? "?"}`);
  return { status, rowsWritten: totals.rowsWritten, error };
}

/** CLI helper: run a job and set the process exit code (failed => 1, throttled/partial => 0). */
export async function main(name: string, fn: (ctx: JobContext) => Promise<void>) {
  const r = await runJob(name, fn);
  process.exitCode = r.status === "failed" ? 1 : 0;
}
