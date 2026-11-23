# GitRepos — Full Build Spec

> Trending GitHub repositories site, fully automated, modelled on gittrend.io.
> Earns from: (1) self-serve sponsored placements, (2) paid Instagram repo promotion (Story / Reel), (3) Google AdSense (switched on once a custom domain is added).
> Payments: Dodo Payments. Build tool: Claude Code (Next.js). Captured 23 Nov 2026.

---

## 0. Decisions so far

| Item | Decision |
|---|---|
| Name | GitRepos (own brand, own copy — never copy GitTrend's name, logo or text) |
| Build | Claude Code, Next.js App Router + TypeScript |
| Pages | 3 main pages (Trending, Repo detail, Promote) + utility pages |
| Payments | Dodo Payments (merchant of record, handles VAT/sales tax) |
| Repo promo prices | Story ~~$15~~ **$2.99** · Post/Reel ~~$25~~ **$5** |
| Address | Free subdomain to start. `gitrepos.vercel.app` is **taken**. Free and unused on 23 Nov: `gitrepos-trending.vercel.app`, `gitreposhub.vercel.app`, `trendinggitrepos.vercel.app`, `gitrepos-io.vercel.app` (or a `*.pages.dev` name on Cloudflare) |
| AdSense | Built in, behind `ADSENSE_ENABLED=false` until a domain you own is added |
| SEO | Priority — server-rendered pages, thousands of indexable repo/topic/language/digest pages |

---

## 1. What gittrend.io does (reference capture)

### 1.1 Global
- Top banner strip: "Built something? Get a paid video reel about it on Instagram, YouTube and more. Promote your project →"
- Nav: Explore, Developers, Topics, Languages, Best, Rising, Hidden Gems, Insights · ⌘K search · "Promote your project"
- Floating "AI Search" pill bottom-right
- Cookie box "Advertising cookies" with "Accept ads / No thanks" (ads managed by Journey by Mediavine; AdSense publisher tag also present)
- Footer groups: Topics · Languages · Discover (AI Search, All repositories A–Z, Best of All Time, Rising Stars, Hidden Gems, Developers, Insights, Weekly Digest, Monthly Digest) · Resources (All Topics, All Tags, Methodology, Promote, Advertise, About, Contact, Privacy, Terms, DMCA) · Follow (X, YouTube, Instagram, TikTok, Threads, Facebook) · "Buy me a coffee"
- Footer line: **"Data from GitHub · CC0 open data"** (see section 4.4)

### 1.2 Home
- Mono eyebrow "TRENDING GITHUB REPOSITORIES TODAY", H1 "Discover what developers are building right now"
- Scale stat: "Tracking 50M+ GitHub repositories — 50,000+ actively ranked daily."
- Search box with ⌘K hint; "NEW AI search — What do you need? — Ask AI" bar
- "Sponsored by" row: 3 cards under search (empty ones say "+ Advertise here — Your product in front of developers")
- "Trending Repositories — Ranked by star velocity · <date>". Toggles Today / This Week / This Month. Language dropdown "Any language". Tabs Rising / Gems. "Load more repositories"
- Repo card: rank #N · owner avatar · owner/repo · "TRENDING" badge on #1 · "NEW 2026" badge · language · one-line description · topic tags (◇tag) · ★ stars · forks · **"+1.8k today"**
- Native sponsored card in feed after #4, then every 7th, styled like a repo, labelled "Sponsored"
- Sidebar: "Sponsor" card (rotates every few minutes) + "Advertise" link · Trending Topics with counts · Browse by language
- Sections: Digests (weekly `/weekly/2026-W46`, monthly `/monthly/2026-10`), "For maintainers — Built something? Put it in front of millions of developers."

### 1.3 Route patterns
`/repo/<owner>/<name>` · `/trending/<topic>` · `/languages/<lang>` · `/weekly/<YYYY-Www>` · `/monthly/<YYYY-MM>` · `/go/sponsor/<id>` · `/opengraph-image` · `/methodology` · `/promote` · `/advertise`

### 1.4 /advertise (sponsors)
- "GitTrend is where 100K+ developers a month watch what is trending on GitHub."
- 3 shared placements: **Sidebar** (top of sidebar on home + every repo page, rotates among live campaigns every few minutes) · **Feed** (after the 4th repo and another after every 7, marked Sponsored) · **Homepage row** (sponsor row under search box)
- Pricing: **$0.25 per click**, minimum **$50 (200 clicks)**, runs until clicks delivered then stops
- Reporting: clicks counted server-side, crawlers excluded · private live page with clicks day by day · report after week 1, then monthly, note on completion
- Billing: PayPal link or invoice · charged once accepted (usually within a day) · no refunds once live
- Good fit: SaaS, dev tools, APIs/platforms, cloud/infra, AI/ML, databases/data, security/DevOps, open source, dev education, tech hiring
- Not a fit: adult, betting/gambling, crypto/token sales, high-interest loans, misleading claims
- Form: Company or product · Where the card links · Work email · One line for the card · Start (ASAP / on a date) · Anything we should know

### 1.5 /promote (repo owners — Instagram)
- "Put your project in front of millions of developers" — they make a short reel from the repo and post on Instagram, YouTube, Facebook, Threads, X
- Stats shown: Instagram views 30 days 10M · followers 200K · site visitors 100K+/month
- Products: Story (24h, link) and Reel (made from repo + README + site, permanent, link in caption); custom requests quoted by email
- Checkout: Name, Email, GitHub repo (GitHub only), Anything to highlight · Story/Reel toggle · "card or PayPal, no account needed"
- After payment: receipt → front of queue → usually live within 24h → link emailed
- Results block: views + stars gained after the reel (e.g. +2,618 stars in a week), disclaimer that stars have many causes
- FAQ: Is it free? · How fast? · What do you need? · Website/app? (GitHub only) · Approve the video? (no) · How many views? (no promise) · Can't feature it? (full refund) · Who's behind this?

### 1.6 Design (observed)
Warm cream background · near-black text · orange primary · 2px black borders · hard offset "neo-brutalist" shadows · rounded buttons/cards · mono uppercase eyebrows · geometric sans headings · pill badges · light theme.

### 1.7 Stack hints
Next.js App Router · Cloudflare · data updated daily · "Data from GitHub · CC0 open data".

---

## 2. Site map (ours)

| # | Page | Route | Purpose |
|---|---|---|---|
| 1 | Trending | `/` | Hero, search, sponsor row, trending feed, sidebar |
| 2 | Repo detail | `/repo/[owner]/[name]` | Stats, star chart, summary, README excerpt, similar repos |
| 3 | Promote | `/promote` | Tab A "Promote your repo" (Instagram) · Tab B "Advertise your product" (sponsor slots) |

**SEO landing pages (same templates, no new design):** `/language/[lang]`, `/topic/[topic]`, `/weekly/[YYYY-Www]`, `/monthly/[YYYY-MM]`, `/rising`, `/new`.
**Utility:** `/promote/success`, `/stats/[token]` (customer private stats), `/go/[id]` (click tracker), `/admin` (protected), `/methodology`, `/about`, `/privacy`, `/terms`, `/refunds`, `/contact`, `/ads.txt`, `/robots.txt`, `/sitemap.xml`, `/data` (open data export).

---

## 3. Page details

### 3.1 Trending `/`
- Slim top banner → `/promote` ("Built something? Get a reel about it from $5")
- Hero: mono eyebrow, H1, live stat line from DB ("Tracking N repos — M ranked today"), ⌘K search (repos, topics, languages)
- Sponsor row: 3 cards; free cards show "+ Advertise here"
- Feed: period toggle (Today / Week / Month), language filter, tabs (Trending / Rising / New), 25 per page + Load more
- Repo card: rank, avatar, owner/repo, badges (TRENDING #1, NEW = created this year, 🔥 HOT = top 1% growth), language colour chip, description (1 line), up to 4 topic tags, ★ stars, forks, **+N today/week/month** in green, 7-day sparkline, bookmark (local only)
- Sponsored card after #4, then every 7th → if no sponsor, AdSense in-feed unit (when enabled) → else house ad
- Sidebar: sponsor card (rotates every 3 min), AdSense unit, Trending Topics (counts), Languages chips, "Promote your repo" CTA

### 3.2 Repo detail `/repo/[owner]/[name]`
- Header: avatar, name, description, language, licence, created date, homepage link, "View on GitHub"
- Stat tiles: stars, forks, open issues, watchers, +today/+week/+month, rank today
- 30/90-day star chart
- **Original summary** (AI-generated 2–3 sentences: what it is, who it's for) — key for SEO + AdSense approval
- README excerpt (first ~300 words, sanitised, links nofollow)
- Topics, similar repos (same topic/language), "Featured on GitRepos" README badge snippet
- Sidebar sponsor + AdSense in-article
- JSON-LD `SoftwareSourceCode`

### 3.3 Promote `/promote`
**Tab A — Promote your repo (Instagram)**

| Product | Was | Now | Includes |
|---|---|---|---|
| Story | ~~$15~~ | **$2.99** | Story on our Instagram with link sticker, live 24h |
| Post / Reel ⭐ Recommended | ~~$25~~ | **$5** | Reel made from repo + README, posted to Instagram (+ Facebook), link in caption, permanent |

- Live stats from Instagram API (followers, views last 30 days) — never hand-typed
- Results: auto-built from best paid reels (views + stars gained after posting)
- Recent paid reels list (repo, date, views) — auto
- Checkout form: name, email, GitHub repo URL (validated: public, not empty, exists), highlight note (optional), Story/Reel toggle, consent checkbox ("paid promotion, no view guarantee") → Dodo checkout
- How it works (3 steps), FAQ (adapted from 1.5), refund rule (unfeatureable repo = full refund)

**Tab B — Advertise your product (sponsor slots)**
- Mini mockups of the 3 placements
- Packages (placeholder prices — edit before launch):

| Package | Duration | Price |
|---|---|---|
| Feed card | 7 days | $49 |
| Sidebar (home + all repo pages, rotating) | 7 days | $39 |
| Homepage row (max 3, shows "2 of 3 left" / Sold out) | 7 days | $79 |
| Bundle (all 3) | 7 days | $129 |
| Optional CPC mode | until clicks used | $0.25/click, min $50 |

- Good fit / Not a fit list (copy 1.4 categories)
- Live sponsors ("Thanks to the companies that keep GitRepos free")
- Form: company/product, logo upload, one-line text (max 90 chars), click URL, work email, package, start (ASAP / date), notes → Dodo checkout

---

## 4. Data pipeline (fully automated)

### 4.1 Sources
1. **GitHub GraphQL + Search API** (free, token) — repo metadata: stars, forks, issues, language, topics, description, licence, created/pushed dates, avatar, homepage, README.
2. **GH Archive** (gharchive.org, free public hourly dumps of all public GitHub events) — count `WatchEvent` (= a star) per repo per hour → true "stars today" for every repo, not just ones we search for. Files: `https://data.gharchive.org/YYYY-MM-DD-H.json.gz`.

### 4.2 Jobs (GitHub Actions scheduled workflows — free, no timeout issues)
| Job | Schedule | Does |
|---|---|---|
| `ingest-gharchive` | hourly (+15 min) | Stream the last hour's file, count WatchEvents per repo, upsert into `star_events_hourly` |
| `refresh-metadata` | every 6h | For top ~5,000 repos by recent stars, pull metadata via GraphQL (batched 100/query), upsert `repos` |
| `snapshot` | daily 00:30 UTC | Write `star_snapshots` (total stars per repo per day) |
| `rank` | hourly after ingest | Compute Today / Week / Month / Rising / New into `rankings`; revalidate pages |
| `summaries` | daily | AI summary for new top repos without one |
| `digests` | Mon + 1st of month | Build weekly/monthly digest pages |
| `instagram-sync` | see 6.3 | Pull IG insights |
| `campaign-expiry` | every 15 min | End campaigns past end date / clicks used; promote next in queue |

Fallback if GH Archive fails: use GitHub Search (`created:>`, `pushed:>`, `stars:>50`, split by language to beat the 1,000-result cap) + daily snapshot deltas. Never wipe existing data on a failed run.

### 4.3 Ranking
- **Today** = stars gained in last 24h · **Week** = 7d · **Month** = 30d
- **Rising** = growth % (gained ÷ stars 7d ago) for repos with 50–5,000 stars
- **New** = created in last 30 days, sorted by stars gained
- **Hot badge** = top 1% of velocity
- Spam guard: ignore repos where >80% of stars come from accounts created <7 days ago (sample check), exclude archived/forks/empty
- Publish `/methodology` explaining all of this (trust + SEO)

### 4.4 "Data from GitHub · CC0 open data" — what it means for us
- GitTrend shows that line because its source is public GitHub data, and it releases its own derived trend data as **CC0** (public domain, anyone can reuse).
- Our footer: **"Data from GitHub & GH Archive · Trend data CC0"**.
- We offer `/data` with daily JSON/CSV exports of rankings under CC0 — free backlinks from people who reuse it (SEO win).
- Do not claim CC0 over GitHub's own content (READMEs, avatars) — only our computed rankings/counts. Respect GitHub API terms and rate limits; link every repo back to GitHub.

---

## 5. Payments — Dodo Payments

- Products in Dodo dashboard: `story_299`, `reel_500`, `sponsor_feed_7d`, `sponsor_sidebar_7d`, `sponsor_row_7d`, `sponsor_bundle_7d`, `cpc_topup` (pay-what-you-want ≥ $50).
- Flow: form submit → create row (`pending_payment`) → create Dodo checkout session with `metadata.order_id` → redirect → Dodo webhook `payment.succeeded` (verify signature) → mark paid → next step automatic.
- Sponsors: paid → `active` (or `in_review` if `APPROVAL_REQUIRED=true` → admin gets email with 1-click Approve / Reject+refund).
- IG promos: paid → `queued` → admin email → you post → paste Instagram URL in `/admin` → status `live` → customer emailed link + stats page.
- Refunds via Dodo API from `/admin` (one click).
- Test mode first (`DODO_ENV=test_mode`), then live.
- Check before launch: Dodo's fee on $2.99 / $5 orders, and that ad placements + promotion services are allowed under Dodo's acceptable-use policy. Dodo needs live Privacy, Terms and Refund pages.

---

## 6. Instagram analytics

### 6.1 Requirements
- Our Instagram account switched to **Business or Creator**
- Meta developer app using **Instagram API with Instagram Login**; long-lived token stored server-side, auto-refreshed before its 60-day expiry

### 6.2 What we store (time-series snapshots)
- **Reels/posts:** views, reach, likes, comments, shares, saves, total interactions, reels average watch time, caption, permalink, posted time
- **Stories:** views, reach, replies, navigation (taps forward/back, exits), profile visits, follows — **only available for 24h**, so poll while live
- **Account (daily):** followers, reach, views, profile link taps
- **Repo impact:** stars at post time, +24h, +3d, +7d (from our snapshots)

### 6.3 Polling schedule
Every 15 min for content <48h old · hourly to day 7 · daily after · stories every 30 min while live. Stay under Meta's rate limit (~200 calls/hour/account). Numbers can lag — show "updated X min ago".

### 6.4 Where it's shown
Customer `/stats/[token]` (live chart + stars gained) · public Results on `/promote` · `/admin` dashboard (orders, revenue, IG stats per post).

---

## 7. Ads — Google AdSense

- Units: feed in-feed (only where no sponsor), sidebar, repo-page in-article. Reserve fixed heights (no layout shift).
- `ADSENSE_ENABLED` flag + `NEXT_PUBLIC_ADSENSE_CLIENT`. `ads.txt` served from root.
- **Needs a domain you own** — AdSense won't approve `*.vercel.app` / `*.pages.dev`. Cheapest owned options checked: gitrepos.uk $5.66/yr, gitrepos.link $7.72/yr, gitrepos.dev $8.75 then $12.87/yr.
- UK/EEA: use AdSense's built-in Google-certified consent message (free); load ad script only after consent.
- Approval: original repo summaries, digests, methodology and about pages reduce "low-value content" risk.

---

## 8. SEO (rank higher — expect 3–6 months)

- Server-rendered pages (SSG/ISR, revalidate hourly) — Google sees full content
- Programmatic pages targeting real searches: "trending Python repos", "best AI agent GitHub repos", "trending repos this week", "[repo] alternatives" (similar-repos section)
- Original AI summary per repo; weekly/monthly digests with short written intros
- Metadata per page, dynamic OG images (repo name + stars + growth), canonical URLs
- JSON-LD: `WebSite` + `SearchAction`, `ItemList` on lists, `SoftwareSourceCode` on repos, `BreadcrumbList`
- `sitemap.xml` split (repos, topics, languages, digests), `robots.txt`
- Internal links: repo ↔ topic ↔ language ↔ digest
- Core Web Vitals: next/image, font subsetting, no layout shift from ads
- Google Search Console + Bing Webmaster on day 1
- Backlinks: **"Featured on GitRepos" README badge** (SVG with live rank) offered to trending repos and every paying customer · CC0 `/data` export · links from Instagram bio/posts
- Buy an owned domain as soon as possible — authority on a free subdomain doesn't transfer cleanly

---

## 9. Design system

- Neo-brutalist + colourful: cream `#FFF8EC` bg, ink `#111` text/borders, 2px borders, hard shadow `4px 4px 0 #111`, radius 14px
- Accents (rotate per card/topic): orange `#FF6B1A`, electric blue `#3A86FF`, lime `#B8F34A`, pink `#FF5DA2`, purple `#8B5CF6`, yellow `#FFD23F`
- Language chips use GitHub's language colours
- Type: geometric sans for headings (e.g. Space Grotesk), Inter for body, JetBrains Mono for eyebrows/numbers
- Motion (Framer Motion): card hover lift + shadow shift, count-up numbers, tab/filter transitions, confetti pulse on #1, skeleton loaders
- ⌘K command palette, dark mode toggle, mobile first (sidebar drops below feed)
- Every paid unit clearly labelled "Sponsored"; links `rel="sponsored nofollow"`

---

## 10. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion, Recharts |
| DB / storage | Supabase (Postgres + Storage for logos) |
| Jobs | GitHub Actions scheduled workflows (+ protected API routes for small tasks) |
| Hosting | Free start: Cloudflare Pages/Workers via OpenNext (free plan allows commercial use). Alt: Vercel — Hobby is non-commercial only; Pro $20/mo once selling |
| Payments | Dodo Payments |
| Email | Resend |
| AI summaries | Claude API (Haiku-class model, cheap) |
| Analytics | Plausible/Umami self-host or Cloudflare Web Analytics (free) |

### 10.1 Database tables
- `repos` (id, owner, name, description, language, topics[], stars, forks, issues, licence, homepage, avatar_url, created_at, pushed_at, summary, readme_excerpt, is_archived, updated_at)
- `star_events_hourly` (repo_id, hour, count)
- `star_snapshots` (repo_id, date, stars)
- `rankings` (period, list_type, language, rank, repo_id, gained, computed_at)
- `topics`, `digests`
- `campaigns` (id, type sponsor/cpc, placement, package, status, company, tagline, logo_url, url, email, starts_at, ends_at, clicks_bought, clicks_used, stats_token, dodo_payment_id, created_at)
- `promo_orders` (id, product story/reel, repo_full_name, name, email, note, status, price, dodo_payment_id, ig_media_id, ig_permalink, stars_at_post, posted_at, stats_token)
- `clicks` (campaign_id, ts, ip_hash, ua, referer) · `impressions` (campaign_id, date, count)
- `ig_media` · `ig_media_insights` (media_id, ts, metric, value) · `ig_account_insights` (date, metric, value)
- `admin_audit`
- RLS on; public read only on repos/rankings/topics/digests; everything else server-only.

### 10.2 Env vars (`.env.example`)
```
GITHUB_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DODO_PAYMENTS_API_KEY=
DODO_WEBHOOK_SECRET=
DODO_ENV=test_mode
IG_USER_ID=
IG_ACCESS_TOKEN=
META_APP_ID=
META_APP_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
CRON_SECRET=
APPROVAL_REQUIRED=true
ADSENSE_ENABLED=false
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_SITE_URL=
```

---

## 11. Admin `/admin` (password or magic link, single user)
Orders queue (IG promos: queued → live, paste permalink) · Campaigns (approve/reject/refund/pause) · Revenue totals · IG stats per post · Job health (last run, errors) · Manual re-run buttons.

---

## 12. Legal / trust pages
Privacy (cookies, ads, Instagram/Dodo data) · Terms · Refunds (unfeatureable repo = full refund; no refunds once live) · DMCA/removal request ("remove my repo") · About · Contact · Methodology.

---

## 13. Running costs (tools only)
| Item | Cost |
|---|---|
| Hosting (Cloudflare free / Vercel Pro if used) | $0 / $20 per month |
| Supabase | Free tier → $25/mo Pro when needed |
| GitHub API + GH Archive + Actions | Free (public repo for workflows = unlimited minutes) |
| Resend | Free tier (3,000 emails/mo) |
| Claude API summaries | A few $/month |
| Domain (later) | ~$6–13/year |
| Dodo | Per-transaction fee (check current rate) |

---

## 14. Build phases
1. Scaffold, design system, Supabase schema + migrations, seed script
2. Data pipeline (GH Archive + GitHub API) + rankings + tests
3. Trending page, repo page, SEO landing pages, sitemap, JSON-LD, OG images
4. Promote page, Dodo checkout + webhook, admin, emails, click tracker, stats pages
5. Instagram API sync + results/stats UI
6. AdSense slots (flagged off), legal pages, `/data` export, README badge
7. Deploy, Search Console, smoke tests, switch Dodo to live

---

## 15. Open decisions (answer before/at plan stage)
- [ ] Free subdomain name + host (Cloudflare `*.pages.dev` vs Vercel)
- [ ] Final sponsor package prices; offer CPC or not
- [ ] Manual approval for sponsors (recommended: yes)
- [ ] Instagram account to use (switch to Business/Creator) + Meta app
- [ ] Which owned domain to buy later for AdSense
- [ ] Social links for footer

---

## 16. Claude Code prompt (start in plan mode)

```
Read GITREPOS_SPEC.md in this folder. It is the source of truth for this build.

Build GitRepos: a fully automated trending GitHub repositories site in Next.js (App Router, TypeScript), following every section of the spec — pages (section 2–3), data pipeline with GH Archive + GitHub API on GitHub Actions (section 4), Dodo Payments checkout + webhooks for sponsor slots and Instagram repo promos priced Story $2.99 (was $15) and Reel/Post $5 (was $25) (section 5), Instagram analytics sync (section 6), AdSense behind ADSENSE_ENABLED=false (section 7), the SEO plan (section 8), the colourful neo-brutalist design system (section 9), the stack, schema and env vars (section 10), admin (section 11), legal pages (section 12).

Rules:
- Server-render everything that should rank; ISR hourly.
- Never wipe existing data on a failed job; log job health.
- Verify Dodo webhook signatures; make webhook handling idempotent.
- Check the current Dodo Payments and Instagram API docs before writing those integrations.
- Our own brand and copy only — do not copy gittrend.io text, name or logo.
- Write tests for ranking logic, webhook handler, click tracker and Instagram token refresh.
- Provide .env.example, Supabase migrations, seed script, GitHub Actions workflows and a README with setup + deploy steps.

First ask me every open decision in section 15, then give me a phased plan following section 14 and wait for approval before coding.
```
