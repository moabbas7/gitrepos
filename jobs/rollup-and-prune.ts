/**
 * rollup-and-prune (daily, after snapshot):
 *  - data branch: delete hourly files > 48h and daily files > 35d (the squashed force-push then
 *    actually frees the space; the hourly→daily rollup itself happens in `snapshot`);
 *  - D1: prune repo_daily > 400d, stale repos (unchanged for 90d and not ranked), language lists
 *    not recomputed for 2 days, job_runs > 90d; recompute topics;
 *  - DB size and today's D1 writes are logged to job_runs by the job runner.
 * Deletes are bounded and budget-checked.
 */
import { config } from "./lib/config";
import { DataStore } from "./lib/data-store";
import { pruneFiles } from "./lib/files";
import { main } from "./lib/job-run";
import { pruneRepoDaily, pruneStaleRepos, recomputeTopics } from "./lib/maintenance";
import { DAY_MS } from "./lib/time";

main("rollup-and-prune", async (ctx) => {
  const now = new Date();
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();

  const removed = pruneFiles(new DataStore(), now, config.hourlyRetentionHours, config.dailyRetentionDays);
  const repoDailyDeleted = await pruneRepoDaily(ctx.db, iso(config.repoDailyRetentionDays).slice(0, 10), ctx.budget);
  const staleReposDeleted = await pruneStaleRepos(ctx.db, iso(config.staleRepoDays), ctx.budget);
  const staleLists = await ctx.db.run("DELETE FROM rankings WHERE computed_at < ?", [iso(2)]);
  const oldRuns = await ctx.db.run("DELETE FROM job_runs WHERE started_at < ?", [iso(config.jobRunsRetentionDays)]);
  const topics = await recomputeTopics(ctx.db, now);

  Object.assign(ctx.meta, {
    filesPruned: { hourly: removed.hours.length, daily: removed.days.length },
    repoDailyDeleted,
    staleReposDeleted,
    staleListsDeleted: staleLists.changes,
    jobRunsDeleted: oldRuns.changes,
    topics,
    writesToday: ctx.budget.used,
    budget: ctx.budget.budget,
  });
  ctx.setSource("maintenance");
});
