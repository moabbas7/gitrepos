---
version: 2
name: GitRepos
summary: Dark-only, three-colour system for gitrepos.si. A near-black canvas, white text whose greys are only white at lower opacity, and one accent, the logo's blue → violet → magenta gradient, used as light (glows, rings, key numbers) rather than paint. It uses hairline borders, light glass, soft glows instead of shadows, tight Geist display type and mono data. Motion is slow, subtle and transform/opacity only.

colors:
  # The entire palette. Nothing else is allowed.
  black: "#07070B"      # background
  white: "#FAFAFA"      # text; every grey is white at an opacity
  gradient-1: "#049DFF" # logo ring, 9 o'clock
  gradient-2: "#612BFB" # logo ring, 6 o'clock
  gradient-3: "#FD26FE" # logo ring, 3 o'clock

opacity-ladder:          # the only "greys": white at these alphas
  text-primary: 1.00
  text-secondary: 0.64
  text-tertiary: 0.50
  text-disabled: 0.28
  border-strong: 0.16
  border: 0.10
  hairline: 0.08
  surface-raised: 0.06
  surface: 0.03

gradients:
  brand: "linear-gradient(90deg, #049DFF 0%, #612BFB 50%, #FD26FE 100%)"
  brand-conic: "conic-gradient(from 0deg, #049DFF, #612BFB, #FD26FE, #612BFB, #049DFF)"
  # For text on a gradient fill: the same gradient under a 30% veil of the background colour.
  # White text then passes AA at every stop (≥ 5.0:1). Still three colours: black, white, gradient.
  brand-veiled: "linear-gradient(rgba(7,7,11,.3), rgba(7,7,11,.3)), linear-gradient(90deg, #049DFF, #612BFB, #FD26FE)"

typography:
  display: { fontFamily: Geist, weight: 600, size: 64px, lineHeight: 1.02, letterSpacing: -0.045em }
  h1: { fontFamily: Geist, weight: 600, size: 44px, lineHeight: 1.08, letterSpacing: -0.035em }
  h2: { fontFamily: Geist, weight: 600, size: 28px, lineHeight: 1.15, letterSpacing: -0.025em }
  h3: { fontFamily: Geist, weight: 600, size: 18px, lineHeight: 1.3, letterSpacing: -0.015em }
  lead: { fontFamily: Inter, weight: 400, size: 18px, lineHeight: 1.6, color: "white/64" }
  body: { fontFamily: Inter, weight: 400, size: 15px, lineHeight: 1.6 }
  small: { fontFamily: Inter, weight: 400, size: 13px, lineHeight: 1.5 }
  eyebrow: { fontFamily: JetBrains Mono, weight: 500, size: 12px, letterSpacing: 0.08em, transform: uppercase, color: "white/50" }
  mono-name: { fontFamily: JetBrains Mono, weight: 500, size: 15px }
  mono-num: { fontFamily: JetBrains Mono, weight: 500, size: 13px, fontFeature: '"tnum"' }

rounded: { sm: 8px, md: 12px, lg: 16px, full: 9999px }
spacing: { 1: 4px, 2: 8px, 3: 12px, 4: 16px, 6: 24px, 8: 32px, 12: 48px, 16: 64px, 24: 96px, section: 128px }
blur: { glass: 16px, header: 20px }
motion:
  ease-out: "cubic-bezier(0.22, 1, 0.36, 1)"
  fast: 160ms
  base: 320ms
  slow: 700ms
  ambient: 24s
---

# GitRepos Design System v2

## 1. Visual Theme & Atmosphere

GitRepos is the website for the **gitrepos.si** Instagram account. The site is a dark instrument panel for what developers are starring right now. It's calm, precise and quiet, so the data and one ribbon of colour can speak. The feel is closer to Linear, Vercel and Raycast than to a poster: hairlines instead of frames, glows instead of shadows, and type that does the work.

There are **exactly three colours**:
- **Black `#07070B`** is the canvas, everywhere.
- **White `#FAFAFA`** is the text. Every grey in the system is this white at a lower opacity. There is no grey hex, and no tinted grey.
- **The logo gradient `#049DFF → #612BFB → #FD26FE`** is the single accent. It behaves like **light**: a glow behind the hero, a ring around the focused or #1 element, the underline of the active tab, the fill of the primary button, and the colour of a key number. It never fills large areas and never decorates for its own sake.

There is no light mode, no secondary accent, no semantic colours, and no coloured language dots. Status comes from words, icons and position.

**Key characteristics**
- **Surfaces** are white at 3% / 6% over black, with **1px white/8–10% hairlines** and 12–16px radius.
- **Glass:** the header and cards use `backdrop-filter: blur(16–20px)` over translucent white/3%.
- **Depth** comes from *soft gradient glows* (large, low-opacity, blurred). There are no drop shadows and no hard offsets.
- **Type:** tight **Geist** display (negative tracking) for headings, **Inter** for body, **JetBrains Mono** for repo names, numbers and commands.
- **Motion:** slow and subtle. It animates **transform and opacity only**, honours `prefers-reduced-motion`, and causes no layout shift.

## 2. Colour Palette & Roles

| Role | Value | Notes |
|---|---|---|
| Canvas | `#07070B` | Page and body background. `color-scheme: dark` |
| Text, primary | `#FAFAFA` | Headings, repo names, numbers |
| Text, secondary | white / 64% | Descriptions, lead paragraphs (7.9:1 on canvas) |
| Text, tertiary | white / 50% | Metadata, eyebrows, axis labels (5.0:1). The lowest grey allowed for content |
| Text, disabled | white / 28% | Disabled only; never for content |
| Border, strong | white / 16% | Inputs, hovered hairlines |
| Border | white / 10% | Topic tags, chips, buttons (secondary) |
| Hairline | white / 8% | Cards, dividers, header bottom edge |
| Surface, raised | white / 6% | Active tab pill, keycaps, hovered rows |
| Surface | white / 3% | Cards (glass), inputs |
| Accent | `brand` gradient | Primary buttons, active tab, #1 badge and ring, focus rings, key numbers, glows |

**Accent rules**
- **Gradient text** is used only for display-size words (≥ 24px) and key numbers. The darkest stop, `#612BFB`, gives 3.1:1 on the canvas, which passes for large text only.
- **White text on a gradient fill** must use `brand-veiled`, the gradient under a 30% veil of the canvas colour. That gives white ≥ 5.0:1 at every stop. It is still the same three colours.
- **Focus** shows as a 2px ring. Gradient rings are on buttons, tabs and cards. Elsewhere the fallback is a solid 2px `#049DFF` outline (7.0:1).
- **Glows** are radial or blurred gradient layers at 10–35% opacity, placed behind the hero, behind a hovered card (cursor spotlight), and around primary buttons.

## 3. Typography

| Role | Family | Size / weight / tracking | Colour |
|---|---|---|---|
| Display | **Geist** | 64 / 600 / −0.045em (40px on mobile) | white; one or two words can be gradient |
| H1 | Geist | 44 / 600 / −0.035em | white |
| H2 | Geist | 28 / 600 / −0.025em | white |
| H3 | Geist | 18 / 600 / −0.015em | white |
| Lead | **Inter** | 18 / 400 / 1.6 | white/64 |
| Body | Inter | 15 / 400 / 1.6 | white/64–100 |
| Small | Inter | 13 / 400 | white/50–64 |
| Eyebrow | **JetBrains Mono** | 12 / 500 / +0.08em / uppercase | white/50 |
| Repo name | JetBrains Mono | 15 / 500 | `owner/` at white/50, `repo` in white |
| Numbers | JetBrains Mono | 13 / 500 / tabular | white, or gradient for key stats |

- **Fonts** load through `next/font/google`: latin subset, `display: swap`, automatic size-adjusted fallbacks, so there's no CLS.
- **Headings** are sentence-case with negative tracking, never all-caps. Uppercase is reserved for mono eyebrows.
- **Mono** is for anything you could paste into a terminal: slugs, commands, counts, dates, languages.

## 4. Component Stylings

All components live in `components/gr/*` and keep their public props.

**Button** (`variant: primary | secondary | ghost`, `size: sm | md | lg`)
- **primary:**
  - `brand-veiled` fill, white Inter 14/500, `rounded.full`, 1px white/16 inner edge
  - **soft gradient glow** behind it, opacity 0.35 → 0.6 on hover
- **secondary:** white/3 glass fill, 1px white/10 border, white text. On hover the border goes to white/16 and the fill to white/6.
- **ghost:** transparent with white/64 text. On hover the text turns white and the fill goes to white/6.
- **Interaction, all variants:**
  - **Magnetic hover:** the button translates up to 6px towards the cursor, then springs back.
  - **Press:** scales to 0.97.
  - **Focus:** gradient ring.
  - All of it is transform-only and disabled under reduced motion.

**Badge** (`kind: trending | new | hot | sponsored`). Mono 11/500, uppercase, 22px tall, `rounded.full`.
- **TRENDING (#1 only):** `brand-veiled` fill, white text, faint glow.
- **NEW / HOT:** transparent, 1px white/10 border, white/64 text, with a small gradient glyph (✦ / ▲).
- **SPONSORED:** 1px white/10 border, white/50 text.
- **`AccentBadge`:** keeps its `accent` prop for compatibility but renders the neutral outlined style. Accents no longer exist.

**LanguageChip:** mono 12, white/50, with no dot and no colour.

**TopicTag:** mono 12, white/64, 1px white/10 outline, `rounded.full`, 24px tall. On hover the border goes to white/16 and the text turns white.

**GrowthPill:** white mono 12/500 with tabular figures, e.g. `▲ +1.8k today`. The ▲ is a 9px SVG arrow filled with the brand gradient. It sits in a white/3 fill with a 1px white/8 hairline and `rounded.full`.

**Sparkline:** inline SVG with a 1.5px brand-gradient stroke and a 10% gradient area fill. It **draws in** (stroke-dashoffset) when its card enters the viewport.

**RepoCard** (`repo`, `period`)
- **Frame:** white/3 glass, 1px white/8 hairline, `rounded.lg`, 20px padding.
- **Spotlight:** a 360px radial gradient glow follows the cursor. It is a translated layer, so only transform moves.
- **Hover:** the **border lights up** with the brand gradient through a masked ring that fades in.
- **#1:** an **animated gradient border**, a conic gradient rotating slowly (12s) inside a masked 1px ring, plus the TRENDING badge.
- **Contents, top to bottom:**
  1. rank (mono white/50)
  2. 32px avatar, mono name, badges
  3. one-line description
  4. ≤ 4 topic tags
  5. language · ★ stars · ⑂ forks (mono white/50) · GrowthPill · sparkline

- **`crown` / `showRank` (prompt 2):** only a Trending feed sets `crown`, which adds the rotating ring and TRENDING badge to its #1. Topic, related and digest lists never crown their first card. Related repos hide the rank.

**SponsorCard:** same glass frame and spotlight as RepoCard, with a SPONSORED badge. Links use `rel="sponsored nofollow noopener"`. The `accent` prop is accepted and ignored. The empty state is a dashed white/10 frame reading "Advertise here".

**FilterTabs:** a white/3 track with a 1px white/8 hairline, inactive labels at white/50, the active label in white, and a **sliding 2px gradient underline** shared through `layoutId`.

**Skeletons:** white/4 blocks with a shimmer band (a white/6 gradient) translated across, transform only.

**AdSlot:** a fixed-height empty box (feed 250 / sidebar 600 / inline 280). It renders nothing.

**Shared SVG gradients:** `SvgDefs` (rendered once in the root layout) defines the brand gradients. Growth arrows, badge glyphs and sparklines reference them by id instead of repeating `<defs>` on every icon.

**Motion primitives**
- **`Aurora`:** a slow gradient glow behind the hero. Three blurred radial blobs drift over a 24–32s cycle. Pure CSS transform.
- **`WordReveal`:** the headline reveals word by word (opacity plus 0.4em rise, 60ms stagger). Pure CSS, so it doesn't wait for JS.
- **`GradientText`:** a gradient word with a gentle shimmer, a white sheen band translated across it with `mix-blend-mode: overlay`.
- **`Reveal`:** a scroll-triggered fade-up with a stagger for children (IntersectionObserver plus CSS transitions).
- **`CountUp`:** numbers count up the first time they scroll into view. A hidden final-value layer reserves the width, so there's no CLS.
- **`LiveDot`:** a pulsing gradient dot plus "updated X min ago".
- **Page transition:** a short fade and rise on client-side navigations, skipped on first load.

## 5. Layout Principles

- **Container:** max 1120px, with a 16px gutter on mobile and 24px from `md` up.
- **Spacing:** generous. Sections are 128px apart on desktop and 80px on mobile. Card padding is 20–24px. Feed gap is 12px.
- **Heading block:** mono eyebrow → Geist heading → Inter lead at white/64.
- **Home (prompt 2):** feed `minmax(0,1fr)` plus a 320px sidebar from `lg` up.
- **Numbers** are right-aligned and tabular in tiles and tables.

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| 0 | Canvas, no border | Page, hero |
| 1 | white/3 fill + 1px white/8 hairline + `backdrop-blur(16px)` | Cards, inputs, tab track |
| 2 | white/6 fill + 1px white/10–16 | Hovered rows, active tab pill, popovers |
| Glow | Brand-gradient radial layer, 10–35% opacity, blurred | Hero aurora, card spotlight, primary button halo |
| Ring | 1px masked gradient ring (static on hover, rotating on #1) | Card hover, #1 repo, focus |

There are no drop shadows, no hard offset shadows and no borders thicker than 1px. A faint top-edge highlight (inset 1px white/6) on cards is allowed.

## 7. Do's and Don'ts

**Do**
- Use only `#07070B`, `#FAFAFA` (at the opacity ladder) and the logo gradient.
- Treat the gradient as light: glows, rings, the underline, key numbers, the primary fill.
- Use 1px hairlines at white/8–10% and 12–16px radius.
- Set repo names, numbers, languages and commands in mono.
- Animate transform and opacity only, slowly. Respect `prefers-reduced-motion` by making every motion instant or static.
- Reserve the space of anything that animates in (count-ups, reveals, ads), so there's no CLS.
- Label paid units "Sponsored" with `rel="sponsored nofollow"`.

**Don't**
- Don't use any other hue: no orange, yellow, peach, green or red, and no coloured language dots.
- Don't add a light mode or a theme toggle.
- Don't use hard offset shadows, thick borders, neo-brutalist frames or drop shadows.
- Don't put the gradient on large surfaces, body text or small gradient text (< 24px).
- Don't animate width, height, top/left, filter or box-shadow, and don't loop motion fast.
- Don't copy another site's copy, name, logo or look.

## 8. Responsive Behaviour

| Breakpoint | Width | Changes |
|---|---|---|
| base | < 640 | Display 40px, single column. Cards hide the sparkline and show 2 tags. Tabs scroll horizontally. Card glass blur is off (header only) to save GPU |
| sm | ≥ 640 | Sparkline and 3 tags |
| md | ≥ 768 | 24px gutters, card glass on |
| lg | ≥ 1024 | Sidebar column, spotlight hover enabled (fine pointers only) |

- **Pointer effects:** magnetic and spotlight effects run only on `(hover: hover) and (pointer: fine)`.
- **Touch targets:** at least 40px.
- **Aurora on mobile:** smaller and lower opacity.

## 9. Agent Prompt Guide

1. Use the tokens in `app/globals.css`: `--gr-*` variables and Tailwind utilities such as `text-fg/64`, `border-fg/8`, `bg-fg/3`. Never introduce a hex beyond the three colours.
2. Every section starts with **mono eyebrow → Geist heading → white/64 lead**.
3. Use one primary `<Button>` per region. Everything else is secondary or ghost.
4. Repo data always goes through `RepoCard`: mono name, GrowthPill, Sparkline, LanguageChip (mono, no dot), up to 4 outlined TopicTags.
5. Wrap lists in `<Reveal stagger>` for the fade-up. Wrap stats in `<CountUp>`. Hero headlines use `<WordReveal>` and `<GradientText>` for one or two words.
6. Use `motion` (lazy-loaded via `LazyMotion`, `m.*` components) only where springs or layout are needed: tabs `layoutId`, page transitions, count-ups. Everything else is CSS.
7. Check reduced motion, no CLS, and AA contrast: white/50 is the lowest grey for content.

Example prompt: *"Build a stats row for a repo page in GitRepos v2: four level-1 glass tiles with white/8 hairlines, mono numbers wrapped in CountUp (the first one in gradient text), white/50 mono captions, +today shown with GrowthPill; heading 'Stats' in Geist 28/600 with a white/64 lead 'Updated hourly'."*
