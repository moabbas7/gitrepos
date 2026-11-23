import "server-only";

/**
 * SERVER-ONLY database access (Worker runtime). Commerce, Instagram, admin and job tables are
 * reachable only from here: route handlers / server actions running in the Worker, never from
 * prerendered page code or client components. Prompts 2–3 add their queries to this module.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { d1BindingDb } from "./d1-binding";
import type { Db } from "./types";

/** D1 binding for the current request (works in `next dev` via initOpenNextCloudflareForDev). */
export async function getServerDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return d1BindingDb(env.DB);
}

export interface JobHealthRow {
  job: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  source: string | null;
  rows_written: number;
  db_size_bytes: number | null;
  error: string | null;
}

/** Latest run per job — for the admin "Job health" panel (prompt 2). */
export async function latestJobRuns(db: Db): Promise<JobHealthRow[]> {
  return db.all<JobHealthRow>(
    `SELECT j.job, j.started_at, j.ended_at, j.status, j.source, j.rows_written, j.db_size_bytes, j.error
     FROM job_runs j
     JOIN (SELECT job, MAX(id) AS id FROM job_runs GROUP BY job) last ON last.id = j.id
     ORDER BY j.job`,
  );
}
