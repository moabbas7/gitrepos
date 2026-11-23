-- GitRepos D1 schema (SQLite). Full schema for prompts 1–3 so later prompts need no breaking changes.
--
-- D1 Free budget notes (see README "Free-tier budget"):
--   * Every row written costs 1 write, plus 1 per index touched by that write. Deletes count too.
--   * Hot tables use WITHOUT ROWID with a natural composite PK, so the PK *is* the table (no extra index).
--   * Secondary indexes exist only where a read path needs them and the indexed column is rarely rewritten.
--   * Timestamps are ISO-8601 UTC TEXT; JSON is TEXT; booleans are INTEGER 0/1.
--
-- Access model (replaces Supabase RLS): D1 is only reachable through the Worker binding and from
-- GitHub Actions with a scoped API token. Public pages are prerendered from a read-only snapshot of
-- repos / rankings / topics / digests. Every other table is server-only (lib/db/server-only.ts).

-- ============================================================================
-- PUBLIC DATA (read by the build snapshot)
-- ============================================================================

-- Published repos: tracked (~5k by recent stars) + anything that appears in a ranking.
CREATE TABLE repos (
  id               INTEGER PRIMARY KEY,          -- GitHub repository databaseId (stable across renames)
  owner            TEXT    NOT NULL,
  name             TEXT    NOT NULL,
  full_name        TEXT    NOT NULL,             -- lower(owner/name), lookup key for /repo/[owner]/[name]
  description      TEXT,
  language         TEXT,
  topics           TEXT    NOT NULL DEFAULT '[]',-- JSON array of strings
  stars            INTEGER NOT NULL DEFAULT 0,
  forks            INTEGER NOT NULL DEFAULT 0,
  issues           INTEGER NOT NULL DEFAULT 0,
  watchers         INTEGER NOT NULL DEFAULT 0,
  licence          TEXT,                         -- SPDX id
  homepage         TEXT,
  avatar_url       TEXT,
  created_at       TEXT,
  pushed_at        TEXT,
  summary          TEXT,
  summary_source   TEXT CHECK (summary_source IN ('ai', 'template')),
  summary_at       TEXT,
  readme_excerpt   TEXT,
  is_archived      INTEGER NOT NULL DEFAULT 0,
  is_fork          INTEGER NOT NULL DEFAULT 0,
  is_empty         INTEGER NOT NULL DEFAULT 0,
  is_spam          INTEGER NOT NULL DEFAULT 0,
  spam_checked_at  TEXT,
  gained_24h       INTEGER NOT NULL DEFAULT 0,
  gained_7d        INTEGER NOT NULL DEFAULT 0,
  gained_30d       INTEGER NOT NULL DEFAULT 0,
  rank_today       INTEGER,
  tracked_at       TEXT,                         -- first time it entered the published set
  meta_refreshed_at TEXT,
  updated_at       TEXT    NOT NULL
);
-- Only written on insert/rename, so it rarely costs an extra write.
CREATE UNIQUE INDEX repos_full_name ON repos (full_name);

-- Daily totals for published repos: stars gained that day (>= MIN_DAILY_STARS) + total-stars snapshot.
CREATE TABLE repo_daily (
  repo_id  INTEGER NOT NULL,
  date     TEXT    NOT NULL,                     -- YYYY-MM-DD (UTC)
  gained   INTEGER NOT NULL DEFAULT 0,
  stars    INTEGER,                              -- total stars at end of day (NULL if unknown)
  PRIMARY KEY (repo_id, date)
) WITHOUT ROWID;

-- One row per list: the top-N payload as JSON (RepoCardData[]). Hourly upsert = ~1 write per list.
CREATE TABLE rankings (
  list_type    TEXT    NOT NULL CHECK (list_type IN ('trending', 'rising', 'new')),
  period       TEXT    NOT NULL CHECK (period IN ('today', 'week', 'month')),
  language     TEXT    NOT NULL DEFAULT 'all',   -- 'all' or a language slug
  payload      TEXT    NOT NULL,                 -- JSON RepoCardData[]
  item_count   INTEGER NOT NULL,
  source       TEXT    NOT NULL DEFAULT 'gharchive' CHECK (source IN ('gharchive', 'search', 'seed')),
  computed_at  TEXT    NOT NULL,
  PRIMARY KEY (list_type, period, language)
) WITHOUT ROWID;

-- Daily archive of the all-language lists (for digests, "rank history").
CREATE TABLE ranking_history (
  date       TEXT    NOT NULL,
  list_type  TEXT    NOT NULL,
  period     TEXT    NOT NULL,
  rank       INTEGER NOT NULL,
  repo_id    INTEGER NOT NULL,
  gained     INTEGER NOT NULL,
  PRIMARY KEY (date, list_type, period, rank)
) WITHOUT ROWID;

CREATE TABLE topics (
  topic          TEXT    PRIMARY KEY,
  repo_count     INTEGER NOT NULL DEFAULT 0,     -- published repos tagged with it
  gained_7d      INTEGER NOT NULL DEFAULT 0,     -- sum of stars gained this week by those repos
  updated_at     TEXT    NOT NULL
) WITHOUT ROWID;

CREATE TABLE digests (
  id            TEXT PRIMARY KEY,                -- 'weekly-2026-W46' | 'monthly-2026-10'
  kind          TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly')),
  period_key    TEXT NOT NULL,                   -- '2026-W46' | '2026-10'
  title         TEXT NOT NULL,
  intro         TEXT,
  payload       TEXT NOT NULL,                   -- JSON RepoCardData[]
  published_at  TEXT NOT NULL
) WITHOUT ROWID;

-- ============================================================================
-- COMMERCE (server-only) — used in prompt 2
-- ============================================================================

CREATE TABLE campaigns (
  id               TEXT PRIMARY KEY,             -- uuid
  type             TEXT NOT NULL CHECK (type IN ('sponsor', 'cpc')),
  placement        TEXT NOT NULL CHECK (placement IN ('feed', 'sidebar', 'row', 'bundle')),
  package          TEXT NOT NULL,                -- e.g. sponsor_feed_7d, cpc_topup
  status           TEXT NOT NULL DEFAULT 'pending_payment'
                     CHECK (status IN ('pending_payment', 'in_review', 'scheduled', 'active', 'paused',
                                       'completed', 'rejected', 'refunded', 'cancelled')),
  company          TEXT NOT NULL,
  tagline          TEXT NOT NULL CHECK (length(tagline) <= 90),
  logo_url         TEXT,                         -- '/logo/<logos.id>' when uploaded
  url              TEXT NOT NULL,
  email            TEXT NOT NULL,
  notes            TEXT,
  starts_at        TEXT,
  ends_at          TEXT,
  clicks_bought    INTEGER,
  clicks_used      INTEGER NOT NULL DEFAULT 0,
  price_cents      INTEGER,
  currency         TEXT DEFAULT 'USD',
  stats_token      TEXT NOT NULL UNIQUE,
  dodo_payment_id  TEXT UNIQUE,
  dodo_checkout_id TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX campaigns_status ON campaigns (status, placement);

CREATE TABLE promo_orders (
  id               TEXT PRIMARY KEY,             -- uuid
  product          TEXT NOT NULL CHECK (product IN ('story', 'reel')),
  repo_full_name   TEXT NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  note             TEXT,
  status           TEXT NOT NULL DEFAULT 'pending_payment'
                     CHECK (status IN ('pending_payment', 'queued', 'live', 'completed', 'refunded', 'cancelled')),
  price_cents      INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  dodo_payment_id  TEXT UNIQUE,
  dodo_checkout_id TEXT,
  ig_media_id      TEXT,
  ig_permalink     TEXT,
  stars_at_post    INTEGER,
  posted_at        TEXT,
  stats_token      TEXT NOT NULL UNIQUE,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX promo_orders_status ON promo_orders (status, created_at);

-- Sponsor logos stored in D1 (no R2 on the no-card plan). Capped at ~100 KB by the upload handler.
CREATE TABLE logos (
  id            TEXT PRIMARY KEY,
  campaign_id   TEXT,
  content_type  TEXT NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
  bytes         BLOB NOT NULL CHECK (length(bytes) <= 150000),
  created_at    TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE clicks (
  id           INTEGER PRIMARY KEY,
  campaign_id  TEXT NOT NULL,
  ts           TEXT NOT NULL,
  ip_hash      TEXT,                             -- salted hash, never the raw IP
  ua           TEXT,
  referer      TEXT
);
CREATE INDEX clicks_campaign_ts ON clicks (campaign_id, ts);

CREATE TABLE impressions (
  campaign_id  TEXT    NOT NULL,
  date         TEXT    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, date)
) WITHOUT ROWID;

-- Idempotency for payment webhooks (Dodo) — insert-or-ignore on the provider's event id.
CREATE TABLE webhook_events (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL,
  type          TEXT NOT NULL,
  received_at   TEXT NOT NULL,
  processed_at  TEXT,
  error         TEXT
) WITHOUT ROWID;

-- ============================================================================
-- INSTAGRAM (server-only) — used in prompt 3
-- ============================================================================

CREATE TABLE ig_media (
  id                  TEXT PRIMARY KEY,          -- IG media id
  media_type          TEXT,                      -- IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type  TEXT,                      -- FEED | REELS | STORY
  caption             TEXT,
  permalink           TEXT,
  thumbnail_url       TEXT,
  posted_at           TEXT,
  promo_order_id      TEXT,
  last_polled_at      TEXT,
  updated_at          TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE ig_media_insights (
  media_id  TEXT    NOT NULL,
  ts        TEXT    NOT NULL,
  metric    TEXT    NOT NULL,
  value     REAL    NOT NULL,
  PRIMARY KEY (media_id, ts, metric)
) WITHOUT ROWID;

CREATE TABLE ig_account_insights (
  date    TEXT NOT NULL,
  metric  TEXT NOT NULL,
  value   REAL NOT NULL,
  PRIMARY KEY (date, metric)
) WITHOUT ROWID;

-- ============================================================================
-- ADMIN / OPS (server-only)
-- ============================================================================

-- Small key/value store for server state, e.g. the auto-refreshed IG long-lived token.
CREATE TABLE app_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE admin_audit (
  id         INTEGER PRIMARY KEY,
  ts         TEXT NOT NULL,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,                      -- e.g. campaign.approve, order.refund
  entity     TEXT,
  entity_id  TEXT,
  detail     TEXT                                -- JSON
);

-- Job health. rows_written is summed per UTC day by the D1 write-budget guard.
CREATE TABLE job_runs (
  id             INTEGER PRIMARY KEY,
  job            TEXT    NOT NULL,
  started_at     TEXT    NOT NULL,
  ended_at       TEXT,
  status         TEXT    NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'success', 'partial', 'throttled', 'failed', 'skipped')),
  source         TEXT,                           -- gharchive | search | gemini | template | ...
  rows_read      INTEGER NOT NULL DEFAULT 0,
  rows_written   INTEGER NOT NULL DEFAULT 0,
  db_size_bytes  INTEGER,
  error          TEXT,
  meta           TEXT                            -- JSON
);
CREATE INDEX job_runs_started ON job_runs (started_at);
