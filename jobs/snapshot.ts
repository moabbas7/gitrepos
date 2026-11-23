/**
 * snapshot (daily, 01:20 UTC — after the 00:41 metadata refresh so every tracked repo has a
 * star count past midnight):
 *  1. daily/<yesterday>.json.gz — true star gains per tracked repo (from star history), keeping
 *     repos with >= MIN_DAILY_STARS, plus total stars at end of day.
 *  2. repo_daily upsert for published repos: gained that day + total-stars snapshot (one row each).
 *  3. ranking_history: the all-language Trending lists (for digests).
 */
import { parseJsonArray } from "@/lib/db/public";
import type { SqlValue } from "@/lib/db/types";
import type { RepoCardData } from "@/lib/types";
import { config } from "./lib/config";
import { DataStore } from "./lib/data-store";
import { dayPath, loadMeta, loadStars } from "./lib/files";
import { main } from "./lib/job-run";
import { chunkedInsert } from "./lib/sql";
import { buildDailyFile } from "./lib/daily";
import { recentCompleteDays } from "./lib/time";

main("snapshot", async (ctx) => {
  const now = new Date();
  const store = new DataStore();
  const cache = loadMeta(store);
  const hist = loadStars(store);
  const [yesterday] = recentCompleteDays(now, 1);

  // 1. Daily file
  const { file, all } = buildDailyFile(yesterday, hist, cache, config.minDailyStars);
  if (!file.reposCovered) {
    ctx.setStatus("partial");
    ctx.log(`no star history covers ${yesterday}; daily file and repo_daily not written`);
  } else store.writeJson(dayPath(yesterday), file);

  // 2. repo_daily for published repos
  if (file.reposCovered) {
    const published = await ctx.db.all<{ id: number; stars: number }>(
      "SELECT id, stars FROM repos WHERE is_spam = 0 ORDER BY gained_7d DESC LIMIT ?",
      [config.trackedLimit + 2000],
    );
    const rows: SqlValue[][] = [];
    for (const r of published) {
      const d = all.get(r.id);
      if (d) rows.push([r.id, yesterday, d.gained, d.stars]);
    }
    ctx.budget.check(rows.length);
    await ctx.db.batch(
      chunkedInsert(
        "INSERT INTO repo_daily (repo_id, date, gained, stars)",
        rows,
        "ON CONFLICT (repo_id, date) DO UPDATE SET gained = excluded.gained, stars = excluded.stars",
      ),
    );
    ctx.meta.repoDailyRows = rows.length;
  }

  // 3. ranking_history
  const lists = await ctx.db.all<{ period: string; payload: string }>(
    "SELECT period, payload FROM rankings WHERE list_type = 'trending' AND language = 'all'",
  );
  const histRows: SqlValue[][] = [];
  for (const l of lists) {
    for (const item of parseJsonArray<RepoCardData>(l.payload)) histRows.push([yesterday, "trending", l.period, item.rank, item.id, item.gained]);
  }
  await ctx.db.batch(
    chunkedInsert(
      "INSERT INTO ranking_history (date, list_type, period, rank, repo_id, gained)",
      histRows,
      "ON CONFLICT (date, list_type, period, rank) DO UPDATE SET repo_id = excluded.repo_id, gained = excluded.gained",
    ),
  );

  Object.assign(ctx.meta, {
    date: yesterday,
    reposCovered: file.reposCovered,
    reposInDailyFile: Object.keys(file.repos).length,
    historyRows: histRows.length,
  });
  ctx.setSource("star-history");
});
