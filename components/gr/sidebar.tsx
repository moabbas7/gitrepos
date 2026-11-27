import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { compactNumber } from "@/lib/format";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { digestLabel } from "@/lib/site-data/copy";
import type { Site } from "@/lib/site-data/load";
import { cn } from "@/lib/utils";
import { AdSlot } from "./ad-slot";
import { InstagramIcon } from "./brand-icons";

function Card({ title, href, cta, children, className }: { title: string; href?: string; cta?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("gr-glass rounded-2xl p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="gr-eyebrow">{title}</h2>
        {href && (
          <Link href={href} prefetch={false} className="inline-flex min-h-8 items-center gap-1 font-mono text-xs text-fg/50 transition-colors hover:text-fg">
            {cta ?? "All"} <ArrowRight aria-hidden className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function TopicsCard({ site, limit = 12 }: { site: Site; limit?: number }) {
  if (!site.topics.length) return null;
  return (
    <Card title="Trending topics" href="/topics">
      <ul className="flex flex-wrap gap-1.5">
        {site.topics.slice(0, limit).map((t) => (
          <li key={t.topic}>
            <Link
              href={`/topic/${t.topic}`}
              prefetch={false}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-fg/10 px-3 font-mono text-xs text-fg/64 transition-colors hover:border-fg/16 hover:text-fg"
            >
              #{t.topic}
              <span className="text-fg/50">{t.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function LanguagesCard({ site, limit = 16 }: { site: Site; limit?: number }) {
  if (!site.languages.length) return null;
  return (
    <Card title="Languages" href="/languages">
      <ul className="flex flex-wrap gap-1.5">
        {site.languages.slice(0, limit).map((l) => (
          <li key={l.slug}>
            <Link
              href={`/language/${l.slug}`}
              prefetch={false}
              className="inline-flex h-8 items-center rounded-full border border-fg/10 px-3 font-mono text-xs text-fg/64 transition-colors hover:border-fg/16 hover:text-fg"
            >
              {l.name}
              <span className="sr-only"> repositories</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DigestCard({ site }: { site: Site }) {
  const latest = site.snap.digests.find((d) => d.kind === "weekly") ?? site.snap.digests[0];
  return (
    <Card title="Digest" href="/digests" cta="Archive">
      {latest ? (
        <Link href={`/${latest.kind}/${latest.periodKey}`} prefetch={false} className="group block">
          <p className="font-heading text-[17px] font-semibold tracking-[-0.015em] text-fg group-hover:underline group-hover:decoration-fg/28 group-hover:underline-offset-4">
            {digestLabel(latest.kind, latest.periodKey)}
          </p>
          <p className="mt-1 text-sm text-fg/64">
            Top {latest.items.length} repositories{latest.items[0] ? `, led by ${latest.items[0].owner}/${latest.items[0].name}` : ""}.
          </p>
        </Link>
      ) : (
        <p className="text-sm leading-relaxed text-fg/64">The first weekly digest is published the Monday after our first full week of star history.</p>
      )}
    </Card>
  );
}

export function InstagramCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-fg/8 p-5">
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full opacity-30 blur-3xl [background:var(--gr-grad)]" />
      <h2 className="gr-eyebrow">On Instagram</h2>
      <p className="mt-3 text-sm leading-relaxed text-fg/64">Daily picks from the trending list, explained in under a minute.</p>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener"
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-fg/10 px-4 font-mono text-[13px] text-fg transition-colors hover:border-fg/16 hover:bg-fg/6"
      >
        <InstagramIcon className="size-4" />
        Follow @{INSTAGRAM_HANDLE}
      </a>
    </section>
  );
}

export function StatLine({ site }: { site: Site }) {
  const s = site.snap.stats;
  if (!s.trackedRepos) return <>Ranked every hour from real star counts.</>;
  return (
    <>
      Tracking <span className="gr-num text-fg">{compactNumber(s.trackedRepos)}</span> repositories ·{" "}
      <span className="gr-num text-fg">{s.rankedLists}</span> lists re-ranked every hour from real star counts.
    </>
  );
}

/** Sidebar column: sponsor/ad slot (collapsed until AdSense), topics, languages, digest, Instagram. */
export function Sidebar({ site, adsEnabled }: { site: Site; adsEnabled: boolean }) {
  return (
    <aside className="space-y-4" aria-label="More to explore">
      <AdSlot kind="sidebar" reserve={adsEnabled} />
      <TopicsCard site={site} />
      <LanguagesCard site={site} />
      <DigestCard site={site} />
      <InstagramCard />
    </aside>
  );
}
