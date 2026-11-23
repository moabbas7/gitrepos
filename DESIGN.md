---
version: 1
name: GitRepos
summary: Dark-first, orbit-themed developer-discovery system for gitrepos.si. It uses a deep-navy canvas, colours from the logo ring (blue → violet → magenta), amber headings with yellow sub-lines, mono type for anything code-shaped, and a softened neo-brutalist frame (hard offset shadows, visible borders) that reads like the brand's Instagram post cards.

colors:
  # Logo samples (brand/logo.png): ring at 180° / 90° / 0°, ink, mascot
  logo-blue: "#049DFF"
  logo-violet: "#612BFB"
  logo-purple: "#9340FF"
  logo-magenta: "#FD26FE"
  logo-ink: "#000000"
  logo-white: "#FEFEFE"

  # Dark theme (default)
  canvas: "#080B16"
  canvas-sunken: "#05070F"
  surface: "#0E1224"
  surface-raised: "#141A33"
  surface-hover: "#1A2142"
  hairline: "#232A4A"
  hairline-strong: "#343D66"
  shadow-hard: "#1E1650"
  shadow-glow: "#3A24A8"
  heading: "#FFA733"        # amber/orange — headings
  subline: "#FFD84A"        # yellow — sub-lines, eyebrows
  ink: "#F4F6FF"            # white body text
  body: "#C9CEE6"
  mute: "#8C93B8"
  ash: "#5D648A"
  peach: "#FFE2C6"          # cream/peach light accent
  peach-ink: "#2A1606"
  growth-bg: "#0E3B2B"
  growth-fg: "#5BF0A6"
  growth-border: "#1D6B4B"
  danger: "#FF6B6B"
  focus: "#7CC8FF"

  # Gradient-strong (logo hues darkened for AA white text on buttons)
  grad-strong-1: "#0677D6"
  grad-strong-2: "#5A22F0"
  grad-strong-3: "#C21BD0"

  # Rotating accents (tags, badges, sponsor cards only)
  accent-cyan: "#38BDF8"
  accent-violet: "#A78BFA"
  accent-magenta: "#F472D0"
  accent-amber: "#FFB547"
  accent-lime: "#A3E635"
  accent-peach: "#FFC9A3"
  hot: "#FF5A36"

  # Light theme (toggle)
  light-canvas: "#F5F6FB"
  light-surface: "#FFFFFF"
  light-surface-raised: "#EEF0F8"
  light-hairline: "#D6D9EA"
  light-frame: "#11142A"
  light-heading: "#B45309"
  light-subline: "#8A5A00"
  light-ink: "#0B0E1C"
  light-body: "#2C3150"
  light-mute: "#5A6080"
  light-growth-bg: "#DCFCE9"
  light-growth-fg: "#0B6B3A"
  light-growth-border: "#86E0AE"

gradients:
  brand: "linear-gradient(90deg, #049DFF 0%, #612BFB 50%, #FD26FE 100%)"
  brand-strong: "linear-gradient(90deg, #0677D6 0%, #5A22F0 55%, #C21BD0 100%)"
  ring: "conic-gradient(from 200deg, #049DFF, #612BFB, #9340FF, #FD26FE, #612BFB, #049DFF)"

typography:
  display: { fontFamily: Sora, weight: 700, size: 56px, lineHeight: 1.05, letterSpacing: -0.02em }
  h1: { fontFamily: Sora, weight: 700, size: 40px, lineHeight: 1.1, letterSpacing: -0.015em }
  h2: { fontFamily: Sora, weight: 650, size: 28px, lineHeight: 1.2, letterSpacing: -0.01em }
  h3: { fontFamily: Sora, weight: 600, size: 20px, lineHeight: 1.3 }
  subline: { fontFamily: Inter, weight: 500, size: 18px, lineHeight: 1.5 }
  body: { fontFamily: Inter, weight: 400, size: 16px, lineHeight: 1.6 }
  body-sm: { fontFamily: Inter, weight: 400, size: 14px, lineHeight: 1.55 }
  caption: { fontFamily: Inter, weight: 500, size: 12px, lineHeight: 1.4 }
  eyebrow: { fontFamily: JetBrains Mono, weight: 600, size: 12px, letterSpacing: 0.12em, transform: uppercase }
  mono-name: { fontFamily: JetBrains Mono, weight: 600, size: 16px, lineHeight: 1.3 }
  mono-num: { fontFamily: JetBrains Mono, weight: 600, size: 13px, fontFeature: '"tnum"' }

rounded: { xs: 6px, sm: 8px, md: 12px, lg: 16px, full: 9999px }
spacing: { 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 20px, 6: 24px, 8: 32px, 12: 48px, 16: 64px, section: 80px }
border: { hair: 1px, frame: 1.5px, frame-light: 2px }
shadow:
  dark-rest: "3px 3px 0 0 #1E1650"
  dark-hover: "5px 5px 0 0 #3A24A8"
  light-rest: "4px 4px 0 0 #11142A"
  light-hover: "6px 6px 0 0 #11142A"
---

# GitRepos Design System

## 1. Visual Theme & Atmosphere

GitRepos is the website for **gitrepos.si**, an Instagram account that posts curated GitHub finds. The site should feel like scrolling through those post cards: a **deep-navy night sky**, a glowing **blue → violet → magenta orbit ring** from the logo, an **amber headline** with a **yellow sub-line** under it, and white body copy. Repository names, commands and numbers are set in **mono**, because that's what developers expect them to look like.

The frame is **neo-brutalist, softened for dark**. Cards have visible 1.5px borders and **hard offset shadows with no blur**. On dark, those shadows are a **muted violet** (`#1E1650`, the logo violet sunk into the navy) at rest and turn a brighter violet (`#3A24A8`) on hover. That keeps the brutalist "stacked paper" depth without harsh white outlines. Light mode is an optional toggle, cool off-white with crisp ink frames. It is never cream.

**Key characteristics**
- Dark-first: `canvas #080B16` → `surface #0E1224` → `surface-raised #141A33`.
- The logo gradient is a **signal, not wallpaper**. It's used only for primary buttons, the #1 badge, focus/selection highlights and the orbit-ring motif.
- Amber `#FFA733` headings with yellow `#FFD84A` sub-lines carry the Instagram-card voice.
- Repo cards stay **neutral**. Colour rotates only on topic tags, badges and sponsor cards.
- Growth numbers always sit on a **green pill** (`#5BF0A6` on `#0E3B2B`, 8.6:1 contrast), never as bare coloured text.
- Mono (JetBrains Mono) for `owner/repo`, CLI snippets, star counts, ranks and dates.

## 2. Colour Palette & Roles

### Brand (sampled from `brand/logo.png`)
| Token | Hex | Role |
|---|---|---|
| `logo-blue` | `#049DFF` | Gradient start (ring at 9 o'clock) |
| `logo-violet` | `#612BFB` | Gradient mid (ring at 6 o'clock) |
| `logo-purple` | `#9340FF` | Secondary mid (ring at 12 o'clock) |
| `logo-magenta` | `#FD26FE` | Gradient end (ring at 3 o'clock) |
| `logo-ink` / `logo-white` | `#000000` / `#FEFEFE` | Logo disc and mascot |

- **`brand` gradient** (exact logo stops). Used for decorative strokes: the orbit ring, the 2px top rule on the hero, the #1 card's outline, and selected-tab underlines. It sits under no body text.
- **`brand-strong` gradient** (`#0677D6 → #5A22F0 → #C21BD0`). Same hues, darkened so **white text passes AA** (4.55:1 or better at every stop). Used as the fill for primary buttons and the TRENDING #1 badge.

### Surfaces (dark)
| Token | Hex | Role |
|---|---|---|
| `canvas` | `#080B16` | Page background |
| `canvas-sunken` | `#05070F` | Code blocks, inset wells, the ad-slot placeholder |
| `surface` | `#0E1224` | Cards (repo, sponsor, stat tiles) |
| `surface-raised` | `#141A33` | Inputs, popovers, active tab pill |
| `surface-hover` | `#1A2142` | Row/card hover fill |
| `hairline` | `#232A4A` | Dividers, quiet borders |
| `hairline-strong` | `#343D66` | Card frame (1.5px) |

### Text (dark)
| Token | Hex | Use | On canvas |
|---|---|---|---|
| `heading` | `#FFA733` | H1–H3, section titles | 10.1:1 |
| `subline` | `#FFD84A` | The line under a heading, eyebrows | 14.2:1 |
| `ink` | `#F4F6FF` | Primary body, repo names | 18.2:1 |
| `body` | `#C9CEE6` | Descriptions, paragraph copy | 12.6:1 |
| `mute` | `#8C93B8` | Metadata, captions | 6.5:1 |
| `ash` | `#5D648A` | Disabled only | 3.4:1 (not for content) |

### Accents (rotate; tags, badges and sponsor cards only)
`accent-cyan #38BDF8` · `accent-violet #A78BFA` · `accent-magenta #F472D0` · `accent-amber #FFB547` · `accent-lime #A3E635` · `accent-peach #FFC9A3`

Each accent has three uses: text in the accent colour, a 12% alpha fill and a 35% alpha border. A topic gets its accent from a stable hash of its name, so `#rust` always looks the same.

### Semantic
- **Growth:** `growth-fg #5BF0A6` on `growth-bg #0E3B2B`, with border `#1D6B4B`.
- **HOT:** `#FF5A36`.
- **Danger:** `#FF6B6B`.
- **Focus ring:** `#7CC8FF`, 2px with a 2px offset.
- **Peach:** `#FFE2C6` with text `#2A1606`, a warm light accent for keycaps, the "Sponsored" label chip and occasional callouts.

### Light theme (toggle)
- **Surfaces:**
  - canvas `#F5F6FB`
  - surface `#FFFFFF`
  - raised `#EEF0F8`
- **Frames:** `#11142A` at 2px, hairline `#D6D9EA`.
- **Text:**
  - heading `#B45309` (4.65:1; headings are 20px+ bold)
  - sub-line `#8A5A00` (5.5:1)
  - ink `#0B0E1C`
  - body `#2C3150`
  - mute `#5A6080` (5.7:1)
- **Growth:** `#0B6B3A` on `#DCFCE9`.
- The brand gradients don't change.

## 3. Typography

| Role | Family | Size / weight | Notes |
|---|---|---|---|
| Display | **Sora** | 56 / 700, -0.02em | Hero only; 36px on mobile |
| H1 | Sora | 40 / 700 | Colour `heading` |
| H2 | Sora | 28 / 650 | Colour `heading` |
| H3 | Sora | 20 / 600 | Card titles that aren't repo names |
| Sub-line | **Inter** | 18 / 500 | Colour `subline`; always right under a heading |
| Body | Inter | 16 / 400, lh 1.6 | `ink` / `body` |
| Small | Inter | 14 / 400 | Descriptions in cards |
| Caption | Inter | 12 / 500 | Metadata |
| Eyebrow | **JetBrains Mono** | 12 / 600, uppercase, +0.12em | Colour `subline` |
| Repo name | JetBrains Mono | 16 / 600 | `owner/` in `mute`, `repo` in `ink` |
| Numbers | JetBrains Mono | 13 / 600, `tnum` | Stars, forks, ranks, growth |

**Principles**
- Sora gives the headings a rounded, geometric, orbital feel that matches the planet-ring mascot. Inter keeps long text readable.
- Mono is used for **things you could paste into a terminal**: repo slugs, commands, counts. It is never used for paragraphs.
- Load fonts with `next/font/google`: `subsets: ['latin']`, variable weights, `display: 'swap'`, and automatic size-adjusted fallbacks, so there's no layout shift.

## 4. Component Stylings

**Button**
- **primary:** `brand-strong` fill, white text in Inter 14/600, 40px tall, `rounded.sm`, 1.5px `#02030A` frame, `dark-rest` shadow. Hover lifts −2px/−2px and uses `dark-hover`.
- **secondary:** `surface-raised` fill, `ink` text, `hairline-strong` frame, same shadow logic.
- **ghost:** transparent, `body` text; hover fill `surface-hover`.
- All variants have sizes sm (32) / md (40) / lg (48).
- Pressed: translate to 0 and the shadow collapses to 1px.

**Badge** (mono 11/700 uppercase, 22px tall, `rounded.full`)
- **TRENDING:** `brand-strong` fill with white text; only on #1.
- **NEW:** cyan soft (fill, border, text).
- **HOT:** `#FF5A36` soft with a 🔥 glyph; only for the top 1% by velocity.
- **SPONSORED:** peach fill with `peach-ink` text.

**LanguageChip:** an 8px dot in the GitHub linguist colour plus the language name in Inter 13 `body`. There's no fill. The dot gets a 1px `hairline-strong` ring so dark language colours stay visible.

**TopicTag:** a rotating accent soft chip with a mono 12 label, prefixed with `#`, `rounded.full`, 24px tall. It links to `/topic/[topic]`.

**GrowthPill:** `growth-bg` fill, `growth-border` 1px, mono 12/700 `growth-fg`, content like "▲ +1.8k today", `rounded.full`, 24px tall.

**Sparkline:** inline SVG, 96×28. A 1.75px stroke filled with the `brand` gradient, plus a soft area fill at 15% alpha. It has `aria-hidden` and the numbers sit next to it as text.

**RepoCard** (neutral)
- **Frame:** `surface` fill, 1.5px `hairline-strong` frame, `rounded.md`, padding 20, `dark-rest` shadow. Hover lifts −2px and uses `dark-hover` (CSS only).
- **Row 1:** rank (mono `mute`, `#01`), a 32px rounded-sm avatar, the repo name, badges.
- **Row 2:** a one-line description (`body`, clamp 1).
- **Row 3:** up to 4 topic tags.
- **Row 4:** language chip · ★ stars · ⑂ forks (mono `mute`) · growth pill · sparkline (right).
- **Card #1:** gets a 1.5px **brand gradient outline** (border-image via background-clip) instead of `hairline-strong`.
- **Links:** the whole card links to `/repo/owner/name`. There's also a "GitHub ↗" icon link.

**SponsorCard shell:** same structure as RepoCard, but the frame colour comes from the rotating accent at 60%, with a SPONSORED badge in the top-right. Links use `rel="sponsored nofollow noopener"`. The empty state is a dashed `hairline-strong` frame with "+ Advertise here".

**AdSlot:** a fixed-height reserved box (`feed` 250px, `sidebar` 600px, `inline` 280px). It renders **nothing** while ads are off: no border and no label, just reserved space with `aria-hidden`.

**Skeleton:** `surface-raised` blocks with a 1.4s shimmer of `surface-hover`. The shimmer is disabled under reduced motion.

**Tabs / filters:** a pill group on `canvas-sunken` with a 1px hairline. The active pill is `surface-raised` with a 2px `brand` underline. The underline animates with `motion` `layoutId`, and that's the **only** Framer Motion use.

**Inputs:** `surface-raised`, 1.5px `hairline-strong`, 44px tall, `rounded.sm`. Focus gives a `focus` ring and a `logo-blue` border. A ⌘K keycap sits on the right in peach.

## 5. Layout Principles

- **Container:** max 1200px, 16px side gutter on mobile, 24px from `md` up.
- **Home grid:** feed `minmax(0,1fr)` plus a 320px sidebar from `lg` up. Gap 32.
- **Spacing:** 4px base scale (4/8/12/16/20/24/32/48/64). Sections are 80px apart (48px on mobile).
- **Feed cards** stack at 12px gap. The sponsor card comes after #4 and then after every 7th card.
- Each heading block = eyebrow (mono, yellow) → H1/H2 (amber) → sub-line (yellow) → content.
- Numbers are right-aligned in tables and tiles, using tabular figures.

## 6. Depth & Elevation

| Level | Dark | Light | Use |
|---|---|---|---|
| 0 Flat | no frame | no frame | Page, hero band |
| 1 Framed | 1px `hairline` | 1px `light-hairline` | Inset wells, tables |
| 2 Card | 1.5px `hairline-strong` + `3px 3px 0 #1E1650` | 2px `#11142A` + `4px 4px 0 #11142A` | Repo/sponsor cards, buttons, stat tiles |
| 3 Lifted (hover) | translate(−2px,−2px) + `5px 5px 0 #3A24A8` | translate(−2px,−2px) + `6px 6px 0 #11142A` | Hover/focus-visible on level 2 |
| Glow | 0 0 0 1.5px brand gradient | same | #1 card, selected states |

There are no blurred drop shadows. Depth comes from offset, frame and surface steps.

## 7. Do's and Don'ts

**Do**
- Use the exact logo stops for decorative gradient strokes, and `brand-strong` for anything carrying text.
- Keep repo cards neutral and let the data stand out: name, growth pill, sparkline.
- Rotate accents only on topic tags, badges and sponsor frames, with a stable hash per topic.
- Put every growth number on a GrowthPill.
- Set repo slugs, commands and counts in mono.
- Label every paid unit "Sponsored" and link it with `rel="sponsored nofollow"`.
- Reserve ad and image space with fixed dimensions (zero CLS).
- Respect `prefers-reduced-motion`: no lift, no shimmer, instant tab changes.

**Don't**
- Don't use a cream or beige page background with an orange primary button. That's another site's identity, not ours.
- Don't fill large areas (hero backgrounds, whole cards) with the brand gradient.
- Don't put body text in amber or yellow. Those colours are for headings and sub-lines only.
- Don't use blurred, soft drop shadows, or white offset shadows on dark.
- Don't show growth as bare green text, or show any colour without a text equivalent.
- Don't copy another site's copy, name, logo or layout signatures.

## 8. Responsive Behaviour

| Breakpoint | Width | Changes |
|---|---|---|
| base | <640 | Single column; display 36px; cards hide the sparkline and show 2 tags max; filters scroll horizontally |
| sm | ≥640 | Sparkline returns; 3 tags |
| md | ≥768 | 24px gutters; stat tiles in 3 columns |
| lg | ≥1024 | Sidebar column appears (sponsor, topics, languages) |
| xl | ≥1280 | Container capped at 1200 |

- Touch targets are at least 40px (buttons, tabs, tags have 24px visual height with a 40px hit area via padding).
- On mobile the sidebar content moves below the feed, in this order: sponsor → topics → languages.

## 9. Agent Prompt Guide

When building UI for GitRepos:
1. Start dark. Use the CSS variables (`--gr-*`) defined in `app/globals.css`. Never hard-code hex values in components.
2. Every page heading follows the same pattern: **mono yellow eyebrow → amber Sora heading → yellow Inter sub-line**.
3. The primary action is `<Button variant="primary">` (`brand-strong` fill, white text). Use only one per view region.
4. Repo data goes in `RepoCard`: neutral frame, mono name, `GrowthPill` for growth, `Sparkline` for the trend, `LanguageChip`, at most 4 `TopicTag`s.
5. Hover lift is CSS (`.gr-lift`). Use `motion` only for tab/filter indicator transitions, always behind `useReducedMotion()`.
6. Light mode is `[data-theme="light"]` on `<html>`. Check both themes and keep AA contrast (4.5:1 for text, 3:1 for UI strokes).
7. Leave ad space with `<AdSlot kind="feed|sidebar|inline" />`. It renders an empty fixed-height box until AdSense is enabled in a later phase.

Example prompt: *"Build a stat tile row for a repo page in the GitRepos system: four level-2 cards on `surface`, mono numbers in `ink`, captions in `mute`, and +today shown as a GrowthPill; amber H2 'Stats' with yellow sub-line 'Updated hourly from GH Archive'."*
