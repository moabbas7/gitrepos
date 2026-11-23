/**
 * ingest-gharchive (hourly): count WatchEvents per repo for each complete hour that isn't in the
 * data branch yet (catching up to 48h back, newest first, max INGEST_MAX_HOURS per run) and write
 * raw/hourly/<hour>.json.gz. No D1 data writes (only job_runs).
 *
 * GH Archive is now a *sample* of public events, so these counts drive discovery (which repos to
 * measure); real star gains come from GitHub star counts (see star-history.ts). If GH Archive is
 * unavailable, `rank` / `refresh-metadata` fall back to GitHub Search discovery automatically.
 */
import { config } from "./lib/config";
import { DataStore } from "./lib/data-store";
import { hourPath, listHourKeys } from "./lib/files";
import { fetchHour } from "./lib/gharchive";
import { main } from "./lib/job-run";
import { HOUR_MS, parseHourKey, recentCompleteHours } from "./lib/time";
import { hourFileFromCounts } from "./lib/windows";

main("ingest-gharchive", async (ctx) => {
  const now = new Date();
  const store = new DataStore();
  const have = new Set(listHourKeys(store));
  const missing = recentCompleteHours(now, config.hourlyRetentionHours).filter((h) => !have.has(h));
  const onlyHour = process.argv.find((a) => a.startsWith("--hour="))?.slice(7);
  const todo = onlyHour ? [onlyHour] : missing.slice(0, config.ingestMaxHours);

  const ingested: string[] = [];
  const notPublished: string[] = [];
  const errors: string[] = [];
  let stars = 0;
  let events = 0;

  for (const hour of todo) {
    const t0 = Date.now();
    const r = await fetchHour(hour);
    if (r.status === "ok") {
      store.writeJson(hourPath(hour), hourFileFromCounts(hour, r.counts, "gharchive"));
      ingested.push(hour);
      stars += r.stats.watchEvents;
      events += r.stats.lines;
      ctx.log(
        `${hour}: ${r.stats.watchEvents} stars across ${r.counts.size} repos ` +
          `(${r.stats.lines} events, ${r.stats.malformed} malformed) in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
      );
    } else if (r.status === "not_found") {
      notPublished.push(hour);
    } else {
      errors.push(`${hour}: ${r.error}`);
      ctx.log(`${hour}: error ${r.error}`);
    }
  }

  const overdue = notPublished.filter(
    (h) => now.getTime() - (parseHourKey(h).getTime() + HOUR_MS) > config.fallbackAfterHours * HOUR_MS,
  );
  Object.assign(ctx.meta, {
    ingested,
    notPublished,
    overdue,
    errors,
    sampledStars: stars,
    events,
    stillMissing: missing.length - ingested.length,
  });
  ctx.setSource("gharchive");
  if (!todo.length) return ctx.setStatus("skipped");
  // Errors with nothing ingested = failed run (visible in job health); existing files are untouched.
  if (errors.length && !ingested.length) throw new Error(`GH Archive failed: ${errors.join("; ")}`);
  if (errors.length || overdue.length) ctx.setStatus("partial");
});
