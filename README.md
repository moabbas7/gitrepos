# GitRepos

Trending GitHub repositories, updated every hour. It's the website for the [@gitrepos.si](https://instagram.com/gitrepos.si) Instagram account.

Everything runs on free tiers that don't need a credit card: **Cloudflare Workers + D1**, **GitHub Actions**, a **`data` branch** in this repo, and the **Gemini** free tier.

> Status: prompt 2 of 3 (public site + SEO). Promote page, payments, admin and Instagram come in prompt 3.

---

## How it works

```
               every hour (GitHub Actions, public repo = unlimited minutes)
┌──────────────┐   ┌───────────────────────────┐   ┌────────────────────┐   ┌─────────────────┐
│ GH Archive   │──▶│ ingest-gharchive          │──▶│ data branch         │   │ Cloudflare D1   │
│ (event sample)│   │ WatchEvent sample per hour │   │  raw/hourly (48h)   │   │  repos          │
└──────────────┘   └───────────────────────────┘   │  daily/ (35d)       │   │  repo_daily     │
┌──────────────┐   ┌───────────────────────────┐   │  meta/repos         │   │  rankings (JSON)│
│ GitHub API   │──▶│ rank / refresh-metadata    │──▶│  meta/stars history │──▶│  topics, digests│
│ GraphQL+Search│   │ real star counts, spam guard│  └────────────────────┘   │  job_runs, ...  │
└──────────────┘   └───────────────────────────┘                             └────────┬────────┘
                                                                                      │ build-snapshot
          opennextjs-cloudflare build ◀── public/ artifacts ◀── .data/site.json ◀──┘
                                  │        (emit-static)        (build-snapshot)
                                  │
                                  ▼
                 Cloudflare Workers static assets: prerendered pages (free, unlimited requests)
```

- **GH Archive is used for discovery.** In 2026 GH Archive only carries a small sample of public events. An hour of data is about 3–8 MB, down from about 65 MB in mid-2025. Its WatchEvent counts show *which* repos are getting attention, but they aren't true star totals.
- **Star gains are real.** Each time we fetch metadata, `stargazerCount` is recorded in `meta/stars.json.gz`:
  - **Top movers:** every hour.
  - **Tracked set (~5,000 repos):** every 6h.

  Today, Week and Month are `stars now − stars at (now − window)`, interpolated between samples.
- **GitHub Search fallback.** Search (`stars:>50 pushed:>=…` / `created:>=…`, split by language) finds new repos every 6h. It also takes over hourly whenever GH Archive falls more than 3h behind.
- **Hosting model.** Every public page is **prerendered at build time** and served from Workers static assets. The OpenNext cache is the read-only *static assets* cache, so there's no R2, KV or Durable Objects. Freshness comes from the hourly CI rebuild + deploy. A page view uses almost no Worker CPU, which keeps us inside the Free plan's 10 ms limit.
- **D1 holds only what the site needs:**
  - tracked repo metadata
  - daily totals (stars gained ≥ 3 that day, plus a star-count snapshot)
  - one JSON row per ranking list
  - topics and digests
  - orders, campaigns and clicks (from prompt 2)
- **Access model (replaces Supabase RLS).** D1 is reachable only through the Worker binding, and from Actions with a scoped API token.
  - Pages read a build-time snapshot through `lib/db/public.ts`, which is read-only and covers repos, rankings, topics and digests.
  - Everything else is in `lib/db/server-only.ts`.

### Jobs

| Job | Schedule (UTC) | What it does | D1 writes/day |
|---|---|---|---|
| `ingest-gharchive` | hourly :17 | Stream the hour's file and count WatchEvents per repo into `raw/hourly/`. Catches up to 48h back | 0 |
| `rank` | hourly, after ingest | Fresh stars for ~1,200 movers (GraphQL, 100/query), then Today/Week/Month × Trending/Rising/New, HOT = top 1%, spam guard. One row per list | ~6k |
| build + deploy | hourly, after rank | `build-snapshot` → `build:static` → OpenNext build → asset check → deploy | a few (`first_published_at`) |
| `refresh-metadata` | every 6h :41 | Search discovery, GraphQL for the tracked set, spam guard (top 300), READMEs. Unchanged rows are skipped | ≤20k |
| `snapshot` | daily 01:20 | Daily file from star history, `repo_daily` rows, `ranking_history` | ~6k |
| `rollup-and-prune` | daily, after snapshot | Delete hourly files >48h and daily files >35d. Prune `repo_daily` >400d, stale repos and old `job_runs`. Recompute topics | ~1–6k |
| `summaries` | daily, after prune | Gemini summaries for the top 40 repos and template summaries for the rest. Never fails | ≤1k |
| `digests` | daily, after summaries | Weekly digest for the last full ISO week, monthly for the last full month, if missing and fully covered by tracking. Gemini intro, template fallback | ≤2 |

Every job writes a row to `job_runs` with start, end, status, rows read and written, DB size and any error.
- **Pre-flight.** Each workflow starts with `scripts/preflight.ts`, which stops the run with one clear message (in the log and the run summary) if:
  - only some Cloudflare secrets are set, or a value is malformed or has stray spaces or quotes
  - `wrangler.jsonc` and `D1_DATABASE_ID` point at different databases
  - the API token is inactive or lacks D1 or Workers access
  - a migration isn't applied to the remote D1

  A bad GitHub token is only a warning. Run it locally with `npx tsx scripts/preflight.ts --deploy`.
- **D1 limits in tests.** Every database adapter enforces D1's limits (100 bound parameters, 100 KB of SQL per statement), including the `node:sqlite` adapter the tests use. A query D1 would reject now fails in `npm test` too. Use `inClauseChunks()` from `lib/db/limits.ts` for `IN (…)` lists.
- **Budget guard.** Before writing, a job adds up today's `rows_written`. Above `D1_DAILY_WRITE_BUDGET` (80k of the 100k free) it stops non-critical writes and logs `throttled`.
- **Failed runs.** A failed run never deletes existing data.

### Ranking rules (spec §4.3)

- **Today / Week / Month:** stars gained in the last 24h / 7d / 30d.
- **Rising:** stars gained ÷ stars at the start of the window, for repos that started with 50–5,000 stars.
- **New:** created in the last 30 days, sorted by stars gained.
- **HOT badge:** top 1% of 24h velocity, minimum +20.
- **NEW badge:** created this calendar year.
- **Excluded:**
  - archived, fork, empty or missing repos
  - spam: more than 80% of a sample of 50 recent stargazers were accounts less than 7 days old when they starred

---

## Public site (prompt 2)

Every public page is prerendered from `.data/site.json` at build time. Pages never query D1, and every dynamic route uses `dynamicParams = false`.

| Route | What |
|---|---|
| `/` | Trending feed: Today / Week / Month × Trending / Rising / New, language filter, load more, live "updated" dot |
| `/rising`, `/new` | The Rising and New lists |
| `/languages`, `/language/[lang]` | Per-language lists (the 25 languages the pipeline ranks) |
| `/topics`, `/topic/[topic]` | Topics with ≥ 3 built repos, up to 300 |
| `/repo/[owner]/[name]` | Stats, star chart, summary, topics, similar repos, README badge, "View on GitHub" |
| `/digests`, `/weekly/[week]`, `/monthly/[month]` | Digest archive and pages |
| `/methodology`, `/about`, `/privacy`, `/terms`, `/data`, `/search` | Content, CC0 export, search results |

### Static artifacts (`npm run build:static`)

`scripts/emit-static.tsx` writes these into `public/` (gitignored) after `build-snapshot`. They are served as plain static assets, which use no Worker requests:

- `/lists/<type>-<period>-<lang>.json`: data for tabs, the language filter and load more
- `/search-index.json`: the ⌘K palette and `/search`, searched entirely in the browser
- `/sitemap.xml` (index) and `/sitemaps/*.xml` (pages, languages, topics, digests, repos; split at 10k URLs)
- `/data/latest.{json,csv}` and `/data/daily/<date>.{json,csv}` (30 days): the CC0 export
- `/badge/featured.svg`, plus `/badge/<owner>/<name>.svg` for ranked repos only
- `/og/repo/*.png` and `/og/page/*.png`: OG images rendered at build with `next/og`. They're cached in `.data/og-cache` by content hash (persisted with `actions/cache`), so each build only renders the ones that changed.

**Badge fallback.** When a repo leaves the lists, its badge file disappears. The request then falls through to `app/badge/[owner]/[name]/route.ts`, which returns the generic badge (a constant string, cached for a day, no D1), so a README never shows a broken image.

### Stable pages and the page budget

`jobs/lib/pages.ts` (pure logic in `lib/site-data/select-pages.ts`) decides which repo pages get built, in priority order:

1. **pinned**: `page_pins` (paid promos in prompt 3, manual pins). Always built, even past the budget.
2. **ranked**: in any current list.
3. **published**: had a page before. The page stays up with a "No longer trending" note, ordered by recent stars.
4. **fill**: other tracked repos, by weekly gains.

- **Budget:** `(MAX_ASSET_FILES − 3,000 reserve − rank badges) ÷ 2 files per repo` (the prerendered page plus its OG image), capped at `MAX_PREBUILT_REPOS`.
- **Retired pages:** published repos below the line are retired. Their URL shows the designed 404 with a link to the repo on GitHub.
- **First publication:** `build-snapshot` sets `repos.first_published_at` once, the first time a repo's page is built. This runs as a `job_runs` row, budget-checked.
- **Prune:** `rollup-and-prune` never deletes a repo whose page is still built.
- **Prompt 3:** to force a paid repo in, insert into `page_pins`.

### Early days

`lib/site-data/readiness.ts` compares tracking time (from the first successful `rank` run) with what each period needs (Today 24h, Week 7d, Month 30d). Until a period is ready, lists show "Collecting star history" notes. Empty lists, topics, digests, `/data` and short star charts have designed empty states, and an empty snapshot still builds a complete site.

### Analytics, ads

- **Analytics:** Cloudflare Web Analytics is cookieless. It loads only when the `NEXT_PUBLIC_CF_BEACON_TOKEN` Actions variable is set.
- **Ads:** `AdSlot` placeholders sit in the feed (after #4, then every 7th), the sidebar and the repo page. They stay collapsed until AdSense is built (`ADSENSE_ENABLED`).

### Requests and size

- **Worker requests:** pages are prerendered into the OpenNext cache and served by the Worker through cache interception. That's very little CPU, but **each page view counts toward Workers Free's 100k requests/day**. Lists, search, OG images, badges and data files are true static assets and don't count. Links in lists use `prefetch={false}`, so scrolling a list doesn't fire RSC prefetches.
- **Page size:** a repo page is about 110 KB of HTML (about 15 KB gzipped).

## Free-tier budget

| Resource | Free limit | Our usage (target) |
|---|---|---|
| D1 rows written | 100,000/day | 30–40k/day (guard at 80k) |
| D1 rows read | 5M/day | ~0.7M/day |
| D1 storage | 500 MB per DB | well under 100 MB (`repo_daily` capped at 400 days) |
| Workers requests | 100k/day | static assets are free and unlimited. Only `/go`, webhooks and similar run the Worker |
| Workers CPU | 10 ms/request | prerendered pages, no SSR at request time |
| Workers static assets | 20,000 files/version | ≤18,000 (`npm run cf:check` fails the build above that) |
| GitHub GraphQL | 5,000 pts/h (PAT), 1,000 pts/h (Actions token) | ~40 pts/h hourly, ~300 pts per 6h refresh |
| GitHub Search | 30 req/min | ~42 requests per discovery run, paced at 2.1 s |
| Gemini | free tier RPM/RPD (see AI Studio) | 40 requests/day, about one every 4.5 s |
| GitHub Actions | unlimited for public repos | ~10 min/hour |

DB size and daily write totals are logged in `job_runs`. The admin page in prompt 2 shows them as "Job health".

---

## Setup

### 1. Local development

```bash
npm ci
cp .env.example .env.local        # fill in later; everything works with seed data first
npm run db:migrate                # apply migrations to the local D1 (.wrangler/)
npm run db:seed                   # fictional repos, 90 days of history, rankings, digests
npm run build:snapshot            # .data/site.json from the local D1
npm run build:static              # lists, search index, sitemaps, badges, OG images -> public/
npm run dev                       # http://localhost:3000
npm run preview                   # same build running in workerd (the real Workers runtime) on :8787
```


### 2. Cloudflare (Workers Free plan, no card)

1. `npx wrangler login`
2. Create the database:

   ```bash
   npx wrangler d1 create gitrepos
   ```

   - Copy the printed `database_id` into `wrangler.jsonc`, replacing `00000000-…`. It's an identifier, not a credential, so it's safe to commit.
   - Also put it in `D1_DATABASE_ID` in `.env.local`.
3. Apply the schema remotely:

   ```bash
   npm run db:migrate:remote
   ```

   - Optional: `npm run db:seed -- --remote` loads fictional demo data. It asks for confirmation, and the jobs overwrite it as real data arrives.
4. Create an API token at *My Profile → API Tokens → Create Token*. Start from the **"Edit Cloudflare Workers"** template and add **Account → D1 → Edit**.
5. Find your **Account ID** in the dashboard sidebar (Workers & Pages → Overview).
6. First deploy:

   ```bash
   npm run deploy
   ```

   - If your account has no `workers.dev` subdomain yet, Cloudflare asks you to pick one.
   - The site is then at `https://gitrepos.<subdomain>.workers.dev`. Ours is <https://gitrepos.gitrepos.workers.dev>.

### 3. GitHub token (optional but recommended)

- Create a fine-grained PAT with **Public repositories (read-only)**. It needs no other permissions.
- Without it, Actions uses its built-in token, which allows 1,000 GraphQL points/hour per repo. That's enough for the defaults.

### 4. Gemini key (optional)

- Get a free key at <https://aistudio.google.com/apikey>.
- Without a key, every summary uses the template. Template summaries are retried with AI after 7 days.

### 5. GitHub Actions setup

In the repo, go to **Settings → Secrets and variables → Actions**.

| Secret | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| `CLOUDFLARE_API_TOKEN` | token from step 2.4 |
| `D1_DATABASE_ID` | from `wrangler d1 create` |
| `GH_PAT` | optional, from step 3. The name can't start with `GITHUB_` |
| `GEMINI_API_KEY` | optional, from step 4 |

| Variable (optional) | Default |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://gitrepos.gitrepos.workers.dev` (set this once you add a custom domain) |
| `D1_DAILY_WRITE_BUDGET` | `80000` |
| `TRACKED_LIMIT` | `5000` |
| `MAX_PREBUILT_REPOS` | `5000` |
| `MAX_ASSET_FILES` | `18000` (drives the page budget and `cf:check`) |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | empty (no analytics script) |
| `MIN_DAILY_STARS` | `3` |
| `SUMMARY_LIMIT` | `40` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |

- **Permissions.** The workflows declare their own `permissions` (`contents: write` is used only to push the `data` branch).
  - Checkout doesn't keep credentials (`persist-credentials: false`).
  - The data-branch push authenticates explicitly with the workflow's built-in token.
- **Kick off a run.** Go to **Actions → hourly → Run workflow**.
- **Before the Cloudflare secrets exist,** the workflows still run. They build star history on the `data` branch against a throwaway local D1, and skip deploying.
- **Expect thin lists at first.** Today needs about 24h of star history, Week about 7 days and Month about 30 days. Until then, gains are counted only from when tracking started, so lists fill in over the first few days.
- **Keepalive.** A monthly workflow re-enables the cron workflows, because GitHub disables them after 60 days without repository activity.

### 6. Running jobs locally

```bash
npm run job:ingest -- --hour=2026-11-23T14   # one GH Archive hour -> .data/branch/raw/hourly
npm run job:ingest                           # catch up the last 48h (max 6 hours per run)
npm run job:rank
npm run job:metadata                         # needs GITHUB_TOKEN
npm run job:snapshot
npm run job:prune
npm run job:summaries                        # Gemini if GEMINI_API_KEY is set, otherwise templates
npm run job:digests                          # weekly/monthly digests (idempotent)
npm run build:snapshot                       # .data/site.json for the site build
npm run build:static                         # public/ artifacts (add --no-og to skip OG images)
```

- **Which DB:** jobs use the **remote** D1 when `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `D1_DATABASE_ID` are all set. Otherwise they use the local D1.
- **Data files:** locally, these stay in `.data/branch`. Only CI (`DATA_PUSH=1`) pushes the `data` branch.

### 7. Tests

```bash
npm test          # vitest
npm run lint
npm run typecheck
```

The tests cover:
- the GH Archive parser
- ranking: all lists, ties, the Rising band, the New window, the HOT percentile, exclusions, the payload size guard
- the spam guard
- star-history gains and the daily rollup
- rollup/prune: file retention, D1 retention, the budget guard blocking deletes, stale-repo pruning that keeps ranked repos, topics
- write-minimal repo sync
- the D1 REST client: parameter/statement chunking, retries, budget
- the Gemini fallback paths
- the schema and seed, loaded into the real migrations on `node:sqlite`
- page selection and stable pages (priority, pins, budget, retirement, prune protection, first publication)
- early-days readiness, landing pages, related repos, search index, sitemaps, badges, the CC0 export, SEO helpers
- digests (ISO weeks, coverage, row picking, template intro)
- emitted artifacts: an empty snapshot builds cleanly, and no README text ever reaches the snapshot or `public/`

---

## Data and licences

- Sources are GitHub's API and [GH Archive](https://www.gharchive.org).
- Every repo links back to GitHub. We follow GitHub's API rate limits and send a descriptive User-Agent.
- Our computed trend data (rankings, counts) is CC0. GitHub content such as READMEs and avatars belongs to its owners and is **not** CC0.
- The `data` branch is machine-written. Each run replaces it with a single commit, so history doesn't grow. Only the `data` branch is ever force-pushed.

## Switching to ISR later (if you add a card)

1. Enable R2.
2. Swap `staticAssetsIncrementalCache` for the R2 incremental cache.
3. Add the DO queue in `open-next.config.ts` / `wrangler.jsonc`.
4. Add `revalidate` to pages.

The data layer doesn't change.

## Project layout

```
app/                  Next.js App Router: public pages, robots, badge fallback route
components/gr/        GitRepos design-system components (see DESIGN.md)
components/ui/        shadcn/ui primitives
lib/db/               Db interface, D1/sqlite adapters, public + server-only queries
lib/site-data/        snapshot types + pure page logic (selection, readiness, SEO, sitemap, search, badges)
lib/og/               OG image templates (rendered at build)
jobs/                 pipeline jobs (tsx) and jobs/lib shared logic
migrations/           D1 schema
scripts/              seed, build snapshot, emit static artifacts, asset-limit check
tests/                vitest
.github/workflows/    hourly, metadata, daily, ci, keepalive
DESIGN.md             design system (colours from brand/logo.png)
```
