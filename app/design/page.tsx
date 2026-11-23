import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { AdSlot, AD_SLOT_HEIGHTS } from "@/components/gr/ad-slot";
import { AccentBadge, Badge } from "@/components/gr/badges";
import { Button } from "@/components/gr/button";
import { GrowthPill, Keycap, LanguageChip, RepoName, TopicTag } from "@/components/gr/chips";
import { RepoCard } from "@/components/gr/repo-card";
import { RepoCardSkeleton, StatTileSkeleton } from "@/components/gr/skeletons";
import { Sparkline } from "@/components/gr/sparkline";
import { SponsorCard, SponsorCardEmpty } from "@/components/gr/sponsor-card";
import { ThemeToggle } from "@/components/gr/theme-toggle";
import { ACCENTS } from "@/lib/accents";
import { FeedDemo, StarChartDemo } from "./demos";
import { SAMPLE_REPOS, SAMPLE_SPONSORS, SAMPLE_STAR_HISTORY } from "./sample";

// Temporary review page for the design system — removed in prompt 2.
export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

function Section({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-hairline pt-10">
      <header className="space-y-1.5">
        <p className="gr-eyebrow">{eyebrow}</p>
        <h2 className="text-2xl font-semibold sm:text-[28px]">{title}</h2>
        {sub && <p className="gr-subline">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

const SWATCHES: { name: string; v: string }[] = [
  { name: "canvas", v: "--gr-canvas" },
  { name: "surface", v: "--gr-surface" },
  { name: "surface-raised", v: "--gr-surface-raised" },
  { name: "frame", v: "--gr-frame" },
  { name: "heading", v: "--gr-heading" },
  { name: "subline", v: "--gr-subline" },
  { name: "ink", v: "--gr-ink" },
  { name: "mute", v: "--gr-mute" },
  { name: "peach", v: "--gr-peach" },
  { name: "growth", v: "--gr-growth-fg" },
  { name: "logo-blue", v: "--gr-logo-blue" },
  { name: "logo-violet", v: "--gr-logo-violet" },
  { name: "logo-magenta", v: "--gr-logo-magenta" },
];

export default function DesignPage() {
  const [first, ...rest] = SAMPLE_REPOS;
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-12 px-4 py-10 md:px-6">
      {/* Hero */}
      <header className="relative space-y-6">
        <div aria-hidden className="absolute inset-x-0 -top-10 h-0.5 [background:var(--gr-grad-brand)]" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GitRepos logo" width={44} height={44} priority className="size-11" />
            <span className="font-heading text-xl font-bold text-ink">GitRepos</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="max-w-3xl space-y-3">
          <p className="gr-eyebrow">Design system · temporary review page</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-[56px] sm:leading-[1.05]">
            What developers are starring <span className="gr-grad-text">right now</span>
          </h1>
          <p className="gr-subline text-lg">Fresh repos from GH Archive every hour. The same picks as @gitrepos.si.</p>
          <p className="max-w-2xl text-body">
            Body copy is white-ish Inter. Repo names, commands and numbers use mono, like{" "}
            <code className="rounded-[5px] border border-hairline bg-surface-raised px-1.5 py-0.5 font-mono text-sm text-ink">npx gitrepos</code>{" "}
            and <span className="gr-num text-ink">12,480</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">Promote your repo</Button>
          <Button size="lg" variant="secondary">
            Browse trending
          </Button>
          <Button size="lg" variant="ghost">
            Methodology
          </Button>
        </div>
      </header>

      <Section eyebrow="01 · Colour" title="Palette" sub="Dark-first tokens. Toggle the theme to see light mode.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map((s) => (
            <div key={s.name} className="gr-frame overflow-hidden rounded-sm">
              <div className="h-14" style={{ background: `var(${s.v})` }} />
              <p className="px-2 py-1.5 font-mono text-[11px] text-mute">{s.name}</p>
            </div>
          ))}
          <div className="gr-frame col-span-2 overflow-hidden rounded-sm sm:col-span-4 lg:col-span-1">
            <div className="h-14 [background:var(--gr-grad-brand)]" />
            <p className="px-2 py-1.5 font-mono text-[11px] text-mute">grad-brand</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="02 · Type" title="Typography" sub="Sora headings, Inter body, JetBrains Mono for code-shaped things.">
        <div className="gr-frame space-y-3 rounded-md p-5">
          <p className="font-heading text-[40px] leading-tight font-bold text-heading">Heading 1 · Sora 40</p>
          <p className="font-heading text-[28px] font-semibold text-heading">Heading 2 · Sora 28</p>
          <p className="font-heading text-xl font-semibold text-heading">Heading 3 · Sora 20</p>
          <p className="gr-subline text-lg">Sub-line · Inter 18 in yellow</p>
          <p className="text-ink">Body · Inter 16. The quick brown fox jumps over the lazy dog.</p>
          <p className="text-sm text-mute">Caption / metadata · Inter 14 muted</p>
          <p className="gr-eyebrow">Eyebrow · JetBrains Mono</p>
          <RepoName owner="orbitlabs" name="nebula-db" />
        </div>
      </Section>

      <Section eyebrow="03 · Buttons" title="Buttons" sub="Gradient primary (white text passes AA), secondary, ghost.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Medium</Button>
          <Button size="lg">Large</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <ThemeToggle />
        </div>
      </Section>

      <Section eyebrow="04 · Labels" title="Badges, chips, tags, growth" sub="Accents rotate only here, never on repo cards.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind="trending" />
          <Badge kind="new" />
          <Badge kind="hot" />
          <Badge kind="sponsored" />
          {ACCENTS.map((a) => (
            <AccentBadge key={a} accent={a}>
              {a}
            </AccentBadge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {["TypeScript", "Python", "Rust", "Go", "C++", "Jupyter Notebook", "Zig", "Lua"].map((l) => (
            <LanguageChip key={l} language={l} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ai-agents", "rust", "cli", "database", "llm", "self-hosted", "react", "gamedev", "security"].map((t) => (
            <TopicTag key={t} topic={t} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GrowthPill gained={1834} />
          <GrowthPill gained={12400} period="week" />
          <GrowthPill gained={98200} period="month" />
          <GrowthPill gained={42} showPeriod={false} />
          <Sparkline values={[3, 5, 4, 9, 14, 22, 31]} />
          <Keycap>⌘K</Keycap>
        </div>
      </Section>

      <Section eyebrow="05 · Cards" title="Repo cards" sub="Neutral frame; #1 gets the gradient ring and the TRENDING badge.">
        <div className="grid gap-3">
          <RepoCard repo={first} />
          {rest.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      </Section>

      <Section eyebrow="06 · Motion" title="Tabs + filter transition" sub="The only Framer Motion use. Instant with reduced motion.">
        <FeedDemo repos={SAMPLE_REPOS} />
      </Section>

      <Section eyebrow="07 · Sponsors" title="Sponsor cards" sub='Always labelled "Sponsored" and rel="sponsored nofollow".'>
        <div className="grid gap-3 md:grid-cols-3">
          <SponsorCard sponsor={SAMPLE_SPONSORS[0]} accent="cyan" />
          <SponsorCard sponsor={SAMPLE_SPONSORS[1]} accent="magenta" />
          <SponsorCardEmpty />
        </div>
      </Section>

      <Section eyebrow="08 · Data" title="Star chart" sub="Recharts, client-only and lazy-loaded.">
        <div className="gr-frame rounded-md p-4">
          <StarChartDemo data={SAMPLE_STAR_HISTORY} />
        </div>
      </Section>

      <Section eyebrow="09 · Loading" title="Skeletons" sub="Same footprint as real content, so nothing jumps.">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTileSkeleton />
          <StatTileSkeleton />
          <StatTileSkeleton />
        </div>
        <RepoCardSkeleton />
      </Section>

      <Section
        eyebrow="10 · Ads"
        title="Empty ad slot"
        sub="Reserves a fixed height and renders nothing. AdSense is added at the very end."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(AD_SLOT_HEIGHTS) as (keyof typeof AD_SLOT_HEIGHTS)[]).map((k) => (
            <div key={k} className="rounded-md border border-dashed border-hairline">
              <p className="px-3 pt-2 font-mono text-[11px] text-mute">
                {k} · {AD_SLOT_HEIGHTS[k]}px (outline shown only on this page)
              </p>
              <AdSlot kind={k} />
            </div>
          ))}
        </div>
      </Section>

      <footer className="border-t border-hairline pt-6 text-sm text-mute">
        Data from GitHub &amp; GH Archive · Trend data CC0
      </footer>
    </main>
  );
}
