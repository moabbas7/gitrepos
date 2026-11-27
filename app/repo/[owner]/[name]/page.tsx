import { ArrowUpRight, Calendar, ExternalLink, Scale } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/gr/ad-slot";
import { Badge } from "@/components/gr/badges";
import { GitHubIcon } from "@/components/gr/brand-icons";
import { Breadcrumbs } from "@/components/gr/breadcrumbs";
import { Button } from "@/components/gr/button";
import { GrowthPill, RepoName, TopicTag } from "@/components/gr/chips";
import { Container } from "@/components/gr/container";
import { CopyButton } from "@/components/gr/copy-button";
import { CountUp } from "@/components/gr/count-up";
import { EmptyState } from "@/components/gr/empty-state";
import { Aurora } from "@/components/gr/hero-fx";
import { JsonLd } from "@/components/gr/json-ld";
import { LiveDot } from "@/components/gr/live-dot";
import { RepoList } from "@/components/gr/repo-list";
import { RepoStarChart } from "@/components/gr/repo-star-chart";
import { StatTile } from "@/components/gr/stat-tile";
import { compactNumber, groupedNumber } from "@/lib/format";
import { ADS_ENABLED, SITE_URL } from "@/lib/site";
import { badgeMarkdown, badgeSvg, featuredBadgeSvg } from "@/lib/site-data/badge";
import { getSite, repoPath } from "@/lib/site-data/load";
import { relatedRepos } from "@/lib/site-data/related";
import { pageMetadata, repoDescription, repoJsonLd, repoOgPath, repoTitle } from "@/lib/site-data/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSite().repos.map((r) => ({ owner: r.owner, name: r.name }));
}

async function load(params: PageProps<"/repo/[owner]/[name]">["params"]) {
  const { owner, name } = await params;
  return getSite().repoByPath.get(repoPath(decodeURIComponent(owner), decodeURIComponent(name))) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/repo/[owner]/[name]">): Promise<Metadata> {
  const r = await load(params);
  if (!r) return {};
  return pageMetadata({ title: repoTitle(r), description: repoDescription(r), path: `/repo/${r.owner}/${r.name}`, og: repoOgPath(r.owner, r.name) });
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null);

export default async function RepoPage({ params }: PageProps<"/repo/[owner]/[name]">) {
  const r = await load(params);
  if (!r) notFound();
  const site = getSite();
  const gh = `https://github.com/${r.owner}/${r.name}`;
  const placement = site.placement.get(r.id) ?? null;
  const rankToday = site.ranking("trending", "today")?.items.find((i) => i.id === r.id)?.rank ?? null;
  const isHot = site.snap.rankings.some((l) => l.items.some((i) => i.id === r.id && i.isHot));
  const isNew = !!r.createdAt && new Date(r.createdAt).getUTCFullYear() === new Date(site.snap.generatedAt).getUTCFullYear();
  const lang = r.language ? site.languages.find((l) => l.name === r.language) : undefined;
  const topicPages = site.topics.map((t) => t.topic);
  const history = (site.snap.history[r.id] ?? []).filter((p): p is [string, number, number] => p[2] !== null);
  const points = history.map(([date, , stars]) => ({ date, stars }));
  const related = relatedRepos(r, site.repos, 6).map((x, i) => site.card(x, x.gained7d, i + 1));
  const badgePreview = placement ? badgeSvg(placement) : featuredBadgeSvg();
  const snippet = badgeMarkdown(SITE_URL, r.owner, r.name, !!placement);
  const crumbs = [
    { name: "Home", path: "/" },
    ...(lang ? [{ name: `${lang.name} repos`, path: `/language/${lang.slug}` }] : []),
    { name: `${r.owner}/${r.name}`, path: `/repo/${r.owner}/${r.name}` },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Aurora className="-inset-x-[30vw] -top-48 bottom-0 opacity-50" />
        <Container className="space-y-6 pt-10 pb-8 sm:pt-14">
          <Breadcrumbs items={crumbs} />
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Image src={r.avatarUrl} alt="" width={56} height={56} unoptimized priority className="size-14 shrink-0 rounded-2xl border border-fg/8 bg-fg/6" />
              <div className="min-w-0 space-y-2">
                <h1 className="m-0 text-[26px] leading-tight sm:text-[32px]">
                  <RepoName owner={r.owner} name={r.name} className="text-[24px] sm:text-[30px]" />
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {rankToday === 1 && <Badge kind="trending" />}
                  {isNew && <Badge kind="new" />}
                  {isHot && <Badge kind="hot" />}
                  {r.isArchived && <Badge kind="sponsored">Archived</Badge>}
                </div>
                {r.description && <p className="max-w-2xl text-[16px] leading-relaxed text-fg/64 sm:text-[17px]">{r.description}</p>}
                <ul className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-fg/50">
                  {r.language && (
                    <li>
                      {lang ? (
                        <Link href={`/language/${lang.slug}`} prefetch={false} className="hover:text-fg">
                          {r.language}
                          <span className="sr-only"> repositories</span>
                        </Link>
                      ) : (
                        r.language
                      )}
                    </li>
                  )}
                  {r.licence && (
                    <li className="inline-flex items-center gap-1.5">
                      <Scale aria-hidden className="size-3.5" />
                      {r.licence}
                    </li>
                  )}
                  {r.createdAt && (
                    <li className="inline-flex items-center gap-1.5">
                      <Calendar aria-hidden className="size-3.5" />
                      Created {fmtDate(r.createdAt)}
                    </li>
                  )}
                  {r.homepage && (
                    <li>
                      <a href={r.homepage} target="_blank" rel="nofollow noopener ugc" className="inline-flex items-center gap-1.5 hover:text-fg">
                        <ExternalLink aria-hidden className="size-3.5" />
                        {r.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0 self-start">
              <a href={gh} target="_blank" rel="noopener">
                <GitHubIcon className="size-4" />
                View on GitHub
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {placement ? (
              <>
                <span className="inline-flex h-8 items-center rounded-full border border-fg/10 px-3 font-mono text-xs uppercase tracking-[0.06em] text-fg">{placement}</span>
                <LiveDot updatedAt={site.snap.rankingsComputedAt ?? site.snap.generatedAt} />
              </>
            ) : (
              <p className="font-mono text-xs text-fg/50">
                {r.reason === "published" ? "No longer trending" : "Not in the top lists right now"}
                {r.firstPublishedAt ? ` · first featured on GitRepos ${fmtDate(r.firstPublishedAt)}` : ""}. Stats as of our last check.
              </p>
            )}
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="stats" className="space-y-4">
            <h2 id="stats" className="sr-only">
              Stats
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Stars">
                <CountUp value={r.stars} notation={r.stars >= 100_000 ? "compact" : "grouped"} className="gr-grad-text" />
              </StatTile>
              <StatTile label="Forks">
                <CountUp value={r.forks} notation={r.forks >= 100_000 ? "compact" : "grouped"} />
              </StatTile>
              <StatTile label="Open issues">{groupedNumber(r.issues)}</StatTile>
              <StatTile label="Rank today">{rankToday ? `#${rankToday}` : "—"}</StatTile>
            </dl>
            <div className="flex flex-wrap gap-2">
              <GrowthPill gained={r.gained24h} period="today" />
              <GrowthPill gained={r.gained7d} period="week" />
              <GrowthPill gained={r.gained30d} period="month" />
              <span className="inline-flex h-6 items-center font-mono text-xs text-fg/50">{groupedNumber(r.watchers)} watchers</span>
            </div>
          </section>

          <section aria-labelledby="history" className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="history" className="text-[22px] tracking-[-0.025em]">
                Star history
              </h2>
              {points.length >= 2 && (
                <p className="font-mono text-xs text-fg/50">
                  {points.length} days · +{compactNumber(points[points.length - 1].stars - points[0].stars)}
                </p>
              )}
            </div>
            {points.length >= 3 ? (
              <>
                <p className="sr-only">
                  Stars went from {groupedNumber(points[0].stars)} on {points[0].date} to {groupedNumber(points[points.length - 1].stars)} on{" "}
                  {points[points.length - 1].date}.
                </p>
                <RepoStarChart points={points} />
              </>
            ) : (
              <EmptyState eyebrow="Collecting star history" title="The chart fills in as daily snapshots arrive.">
                We record total stars once a day. {points.length ? `${points.length} of 3 days so far.` : "The first snapshot lands tonight."} The
                30-day view is complete after a month.
              </EmptyState>
            )}
          </section>

          {r.summary && (
            <section aria-labelledby="about" className="space-y-3">
              <h2 id="about" className="text-[22px] tracking-[-0.025em]">
                About {r.name}
              </h2>
              <p className="max-w-2xl text-[16px] leading-relaxed text-fg/64">{r.summary}</p>
              <p className="font-mono text-xs text-fg/50">
                {r.summarySource === "ai" ? "Summary written by AI from public repository data." : "Summary generated from public repository data."}{" "}
                For details, read the README{" "}
                <a href={gh} target="_blank" rel="noopener" className="underline decoration-fg/28 underline-offset-2 hover:text-fg">
                  on GitHub
                </a>
                .
              </p>
            </section>
          )}

          {r.topics.length > 0 && (
            <section aria-labelledby="topics" className="space-y-3">
              <h2 id="topics" className="text-[22px] tracking-[-0.025em]">
                Topics
              </h2>
              <ul className="flex flex-wrap gap-2">
                {r.topics.map((t) => (
                  <li key={t}>
                    <TopicTag topic={t} href={topicPages.includes(t) ? `/topic/${t}` : undefined} className="h-8 px-3" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AdSlot kind="inline" reserve={ADS_ENABLED} />

          <section aria-labelledby="similar" className="space-y-4">
            <h2 id="similar" className="text-[22px] tracking-[-0.025em]">
              Similar repositories
            </h2>
            {related.length ? (
              <RepoList items={related} period="week" topicPages={site.linkedTopics(related)} showRank={false} />
            ) : (
              <p className="text-sm text-fg/64">No similar repositories tracked yet.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4" aria-label="Badge and links">
          <section className="gr-glass space-y-4 rounded-2xl p-5" aria-labelledby="badge">
            <h2 id="badge" className="gr-eyebrow">
              README badge
            </h2>
            <div className="flex min-h-5 items-center" aria-hidden dangerouslySetInnerHTML={{ __html: badgePreview }} />
            <p className="text-sm leading-relaxed text-fg/64">
              {placement ? "Shows this repo's current rank, updated every hour." : "Show that this repo was featured on GitRepos."} Paste it into the README.
            </p>
            <pre className="overflow-x-auto rounded-xl border border-fg/8 bg-fg/3 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-fg/64">
              {snippet}
            </pre>
            <CopyButton text={snippet} label="Copy markdown" />
          </section>
          <AdSlot kind="sidebar" reserve={ADS_ENABLED} />
          <section className="gr-glass space-y-3 rounded-2xl p-5" aria-labelledby="source">
            <h2 id="source" className="gr-eyebrow">
              Source
            </h2>
            <p className="text-sm leading-relaxed text-fg/64">
              Code, README, issues and releases live on GitHub. Stars and trends here are measured by GitRepos.
            </p>
            <a href={gh} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 font-mono text-[13px] text-fg hover:underline hover:decoration-fg/28 hover:underline-offset-4">
              <GitHubIcon className="size-4" />
              github.com/{r.owner}/{r.name}
            </a>
          </section>
        </aside>
      </Container>
      <JsonLd data={repoJsonLd(r)} />
    </>
  );
}
