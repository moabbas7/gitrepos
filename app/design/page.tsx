import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdSlot, AD_SLOT_HEIGHTS } from "@/components/gr/ad-slot";
import { AccentBadge, Badge } from "@/components/gr/badges";
import { Button } from "@/components/gr/button";
import { GradientArrow, GrowthPill, Keycap, LanguageChip, RepoName, TopicTag } from "@/components/gr/chips";
import { CountUp } from "@/components/gr/count-up";
import { Aurora, GradientText, WordReveal } from "@/components/gr/hero-fx";
import { LiveDot } from "@/components/gr/live-dot";
import { RepoCard } from "@/components/gr/repo-card";
import { Reveal } from "@/components/gr/reveal";
import { RepoCardSkeleton, StatTileSkeleton } from "@/components/gr/skeletons";
import { Sparkline } from "@/components/gr/sparkline";
import { SponsorCard, SponsorCardEmpty } from "@/components/gr/sponsor-card";
import { SpotlightCard } from "@/components/gr/spotlight";
import { FeedDemo, StarChartDemo } from "./demos";
import { SAMPLE_REPOS, SAMPLE_SPONSORS, SAMPLE_STAR_HISTORY } from "./sample";

// Temporary review page for the design system — removed in prompt 2.
export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const BUILT_AT = new Date().toISOString();

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-8 border-t border-fg/8 pt-16 sm:pt-24">
      <Reveal as="header" className="max-w-2xl space-y-3">
        <p className="gr-eyebrow">{eyebrow}</p>
        <h2 className="text-[28px] leading-[1.15] tracking-[-0.025em]">{title}</h2>
        {lead && <p className="text-[17px] leading-relaxed text-fg/64">{lead}</p>}
      </Reveal>
      {children}
    </section>
  );
}

const LADDER: [string, string][] = [
  ["100", "text"],
  ["64", "secondary"],
  ["50", "tertiary"],
  ["28", "disabled"],
  ["16", "border strong"],
  ["10", "border"],
  ["8", "hairline"],
  ["6", "raised"],
  ["3", "surface"],
];

export default function DesignPage() {
  const [first, ...rest] = SAMPLE_REPOS;
  return (
    <>
      {/* Glass header */}
      <header className="gr-header-glass sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-full">
            <Image src="/logo.png" alt="" width={28} height={28} priority className="size-7" />
            <span className="font-heading text-[15px] font-semibold tracking-[-0.01em]">GitRepos</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-fg/64 md:flex">
            {["colour", "type", "buttons", "cards", "motion", "data"].map((s) => (
              <a key={s} href={`#${s}`} className="rounded-full px-3 py-1.5 capitalize transition-colors hover:bg-fg/6 hover:text-fg">
                {s}
              </a>
            ))}
          </nav>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/">Home · page transition</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-32 md:px-6">
        {/* Hero */}
        <section className="relative isolate pb-20 pt-20 sm:pb-28 sm:pt-32">
          <Aurora className="-inset-x-[30vw] -top-24 bottom-0" />
          <div className="max-w-3xl space-y-6">
            <LiveDot updatedAt={BUILT_AT} label="Design system · updated" />
            <h1 className="text-[40px] leading-[1.04] tracking-[-0.045em] sm:text-[64px] sm:leading-[1.02]">
              <WordReveal parts={["What developers are starring ", <GradientText key="g">right now.</GradientText>]} />
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-fg/64">
              Real star counts from GitHub, ranked every hour. The same picks as{" "}
              <span className="font-mono text-fg">@gitrepos.si</span>, with the data behind them.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg">Promote your repo</Button>
              <Button size="lg" variant="secondary">
                Browse trending
              </Button>
              <Button size="lg" variant="ghost">
                Methodology
              </Button>
            </div>
          </div>
          <Reveal stagger className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Repos tracked", value: 5000 },
              { label: "Stars counted today", value: 182_430 },
              { label: "Lists ranked", value: 234 },
              { label: "Updated every", value: 60, suffix: " min" },
            ].map((s, i) => (
              <div key={s.label} className="gr-glass rounded-2xl p-5">
                <p className="gr-eyebrow">{s.label}</p>
                <p className="mt-2 font-mono text-2xl font-medium tracking-tight">
                  <span className={i === 0 ? "gr-grad-text inline-block" : undefined}>
                    <CountUp value={s.value} suffix={s.suffix} />
                  </span>
                </p>
              </div>
            ))}
          </Reveal>
        </section>

        <Section id="colour" eyebrow="01 · Colour" title="Three colours. That's all." lead="Black canvas, white text (greys are white at lower opacity), and one accent: the logo gradient, used as light.">
          <Reveal stagger className="grid gap-3 sm:grid-cols-3">
            <div className="gr-glass overflow-hidden rounded-2xl">
              <div className="h-24 border-b border-fg/8 bg-bg" />
              <p className="p-4 font-mono text-xs text-fg/64">black · #07070B</p>
            </div>
            <div className="gr-glass overflow-hidden rounded-2xl">
              <div className="h-24 bg-fg" />
              <p className="p-4 font-mono text-xs text-fg/64">white · #FAFAFA</p>
            </div>
            <div className="gr-glass overflow-hidden rounded-2xl">
              <div className="h-24 [background:var(--gr-grad)]" />
              <p className="p-4 font-mono text-xs text-fg/64">#049DFF → #612BFB → #FD26FE</p>
            </div>
          </Reveal>
          <Reveal stagger className="grid grid-cols-3 gap-2 sm:grid-cols-9">
            {LADDER.map(([a, name]) => (
              <div key={a} className="space-y-2">
                <div className="h-12 rounded-xl border border-fg/8" style={{ background: `rgb(250 250 250 / ${Number(a) / 100})` }} />
                <p className="font-mono text-[11px] text-fg/50">
                  white/{a}
                  <br />
                  {name}
                </p>
              </div>
            ))}
          </Reveal>
        </Section>

        <Section id="type" eyebrow="02 · Type" title="Tight display, quiet body, mono data." lead="Geist for headings, Inter for reading, JetBrains Mono for repo names, numbers and commands.">
          <Reveal className="gr-glass space-y-4 rounded-2xl p-6 sm:p-8">
            <p className="font-heading text-[44px] font-semibold leading-[1.08] tracking-[-0.035em]">Display · Geist 600</p>
            <p className="font-heading text-[28px] font-semibold tracking-[-0.025em]">Heading 2 · Geist 28</p>
            <p className="font-heading text-lg font-semibold tracking-[-0.015em]">Heading 3 · Geist 18</p>
            <p className="max-w-xl text-lg text-fg/64">Lead · Inter 18 at white/64. Calm enough to read for a while.</p>
            <p className="text-[15px]">Body · Inter 15. The quick brown fox jumps over the lazy dog.</p>
            <p className="gr-eyebrow">Eyebrow · JetBrains Mono</p>
            <div className="flex flex-wrap items-center gap-4">
              <RepoName owner="orbitlabs" name="nebula-db" />
              <code className="rounded-lg border border-fg/8 bg-fg/3 px-2 py-1 font-mono text-[13px] text-fg/64">npx gitrepos</code>
              <span className="gr-num text-sm">12,480</span>
            </div>
          </Reveal>
        </Section>

        <Section id="buttons" eyebrow="03 · Buttons" title="Magnetic, glowing, pressable." lead="Hover to feel the magnetic pull, press for the scale. The primary glow is the only colour. Tab to see the gradient focus ring.">
          <Reveal className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Primary</Button>
            <Button size="lg">Large primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </Reveal>
        </Section>

        <Section id="labels" eyebrow="04 · Labels" title="Badges, languages, tags and growth." lead="No coloured dots, no rainbow tags. Growth is white mono with a small gradient arrow.">
          <Reveal className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge kind="trending" />
              <Badge kind="new" />
              <Badge kind="hot" />
              <Badge kind="sponsored" />
              <AccentBadge accent="cyan">Rising</AccentBadge>
              <AccentBadge accent="violet">Gem</AccentBadge>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              {["TypeScript", "Python", "Rust", "Go", "C++", "Zig"].map((l) => (
                <LanguageChip key={l} language={l} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["ai-agents", "rust", "cli", "database", "llm", "self-hosted", "react"].map((t) => (
                <TopicTag key={t} topic={t} href="#labels" />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <GrowthPill gained={1834} />
              <GrowthPill gained={12400} period="week" />
              <GrowthPill gained={98200} period="month" />
              <GrowthPill gained={42} showPeriod={false} />
              <Keycap>⌘K</Keycap>
            </div>
          </Reveal>
        </Section>

        <Section id="cards" eyebrow="05 · Cards" title="Glass cards with a spotlight." lead="Cards fade up in sequence as they scroll in, and sparklines draw themselves. Move the cursor over a card for the spotlight and the gradient border. #1 has a slowly rotating border.">
          <Reveal stagger className="grid gap-3">
            {[first, ...rest].map((r) => (
              <RepoCard key={r.id} repo={r} />
            ))}
          </Reveal>
        </Section>

        <Section id="motion" eyebrow="06 · Motion" title="Tabs, filters, numbers, live." lead="The sliding gradient underline uses a shared layoutId. Lists cross-fade without shifting the page.">
          <Reveal>
            <FeedDemo repos={SAMPLE_REPOS} />
          </Reveal>
          <Reveal stagger className="grid gap-3 sm:grid-cols-3">
            <SpotlightCard className="space-y-3 rounded-2xl p-5">
              <p className="gr-eyebrow">Count-up on scroll</p>
              <p className="font-mono text-4xl font-medium tracking-tight">
                <CountUp value={48213} notation="compact" />
              </p>
              <p className="text-sm text-fg/50">stars this month</p>
            </SpotlightCard>
            <SpotlightCard className="space-y-3 rounded-2xl p-5">
              <p className="gr-eyebrow">Sparkline draw-in</p>
              <Sparkline values={[4, 6, 5, 9, 14, 22, 31, 29, 40]} width={220} height={56} />
              <p className="flex items-center gap-1.5 font-mono text-sm">
                <GradientArrow /> +31% this week
              </p>
            </SpotlightCard>
            <SpotlightCard className="space-y-3 rounded-2xl p-5">
              <p className="gr-eyebrow">Live status</p>
              <LiveDot updatedAt={BUILT_AT} />
              <p className="text-sm text-fg/50">
                The relative time is computed in the browser, so prerendered pages never show a stale value.
              </p>
            </SpotlightCard>
          </Reveal>
        </Section>

        <Section id="sponsors" eyebrow="07 · Sponsors" title="Sponsor cards" lead='Same frame as repos, always labelled "Sponsored" and linked rel="sponsored nofollow".'>
          <Reveal stagger className="grid gap-3 md:grid-cols-3">
            <SponsorCard sponsor={SAMPLE_SPONSORS[0]} />
            <SponsorCard sponsor={SAMPLE_SPONSORS[1]} />
            <SponsorCardEmpty />
          </Reveal>
        </Section>

        <Section id="data" eyebrow="08 · Data" title="Star history" lead="Recharts, loaded only on the client and only when needed.">
          <Reveal className="gr-glass rounded-2xl p-4 sm:p-6">
            <StarChartDemo data={SAMPLE_STAR_HISTORY} />
          </Reveal>
        </Section>

        <Section id="loading" eyebrow="09 · Loading" title="Skeletons" lead="The same footprint as real content, so nothing jumps when data arrives.">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTileSkeleton />
            <StatTileSkeleton />
            <StatTileSkeleton />
          </div>
          <RepoCardSkeleton />
        </Section>

        <Section id="ads" eyebrow="10 · Ads" title="Empty ad slot" lead="Reserves a fixed height and renders nothing. AdSense is added at the very end.">
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(AD_SLOT_HEIGHTS) as (keyof typeof AD_SLOT_HEIGHTS)[]).map((k) => (
              <div key={k} className="rounded-2xl border border-dashed border-fg/10">
                <p className="px-4 pt-3 font-mono text-[11px] text-fg/50">
                  {k} · {AD_SLOT_HEIGHTS[k]}px (outline shown only here)
                </p>
                <AdSlot kind={k} />
              </div>
            ))}
          </div>
        </Section>

        <footer className="mt-24 border-t border-fg/8 pt-8 font-mono text-xs text-fg/50">
          Data from GitHub &amp; GH Archive · Trend data CC0
        </footer>
      </main>
    </>
  );
}
