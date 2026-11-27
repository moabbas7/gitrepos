-- Prompt 2: stable public pages.
--
-- first_published_at: set once, the first time a repo page is prerendered. Published repos keep
-- their page (showing "no longer trending") instead of 404ing when they leave the lists, and the
-- stale-repo prune skips them unless the page selection has retired them (asset-file cap).
-- Written only for newly published repos (a handful per hour), never rewritten.
ALTER TABLE repos ADD COLUMN first_published_at TEXT;

-- Repos whose page must be prebuilt regardless of ranking, e.g. paid Instagram promos (prompt 3)
-- or manual pins. Highest priority in the page selection. `until` NULL = no expiry.
CREATE TABLE page_pins (
  repo_id     INTEGER PRIMARY KEY,
  reason      TEXT    NOT NULL CHECK (reason IN ('promo', 'manual')),
  until       TEXT,
  created_at  TEXT    NOT NULL
) WITHOUT ROWID;
