import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Container } from "@/components/gr/container";
import { EmptyState } from "@/components/gr/empty-state";
import { PageHero } from "@/components/gr/page-hero";
import { Prose } from "@/components/gr/prose";
import { DATA_REPO_URL } from "@/lib/site";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { CSV_HEADER } from "@/lib/site-data/export";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.data;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/data", og: pageOgPath(copy.ogKey) });

function FileLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex h-10 items-center gap-2 rounded-full border border-fg/10 px-4 font-mono text-[13px] text-fg transition-colors hover:border-fg/16 hover:bg-fg/6"
    >
      <Download aria-hidden className="size-4" />
      {label}
    </a>
  );
}

export default function Page() {
  const site = getSite();
  const days = site.snap.dailyExports;
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead="Daily GitHub trending rankings as JSON and CSV. Our computed rankings and counts are public domain under CC0 1.0: copy, modify and use them, even commercially, without asking."
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Open data", path: "/data" },
        ]}
      />
      <Container className="space-y-12">
        <section aria-labelledby="latest" className="gr-glass space-y-4 rounded-2xl p-5 sm:p-6">
          <h2 id="latest" className="text-[22px] tracking-[-0.025em]">
            Latest rankings
          </h2>
          <p className="text-sm leading-relaxed text-fg/64">
            Every current list (Trending, Rising and New × Today, Week and Month, overall and per language), rebuilt every hour.
          </p>
          <div className="flex flex-wrap gap-2">
            <FileLink href="/data/latest.json" label="latest.json" />
            <FileLink href="/data/latest.csv" label="latest.csv" />
          </div>
        </section>

        <section aria-labelledby="daily" className="space-y-4">
          <h2 id="daily" className="text-[22px] tracking-[-0.025em]">
            Daily archive (last 30 days)
          </h2>
          {days.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {days.map((d) => (
                <li key={d.date} className="flex items-center justify-between gap-3 rounded-xl border border-fg/8 px-4 py-2">
                  <span className="gr-num text-[13px] text-fg">{d.date}</span>
                  <span className="flex gap-1">
                    <a href={`/data/daily/${d.date}.json`} download className="inline-flex min-h-10 items-center rounded-lg px-2 font-mono text-xs text-fg/64 hover:bg-fg/6 hover:text-fg">
                      JSON
                    </a>
                    <a href={`/data/daily/${d.date}.csv`} download className="inline-flex min-h-10 items-center rounded-lg px-2 font-mono text-xs text-fg/64 hover:bg-fg/6 hover:text-fg">
                      CSV
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState eyebrow="Collecting star history" title="The first daily file appears after our first full day.">
              Each night we archive the day&apos;s Trending lists. Until then, use the latest rankings above.
            </EmptyState>
          )}
          <p className="text-sm text-fg/64">
            Older history (daily star counts for every tracked repository) is in the{" "}
            <a href={DATA_REPO_URL} className="text-fg underline decoration-fg/28 underline-offset-4 hover:decoration-fg">
              data branch on GitHub
            </a>
            .
          </p>
        </section>

        <Prose>
          <h2>Format</h2>
          <p>
            CSV columns: <code>{CSV_HEADER.join(", ")}</code>. <code>gained</code> is stars gained in the list&apos;s period, <code>stars</code> the
            total at the time of ranking. JSON files have the same rows plus licence and source metadata.
          </p>
          <h2>Licence</h2>
          <p>
            Rankings and counts computed by GitRepos are dedicated to the public domain under{" "}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>. Attribution is appreciated but not required. Repository names,
            descriptions, READMEs and avatars belong to their owners and are <strong>not</strong> covered by CC0.
          </p>
          <h2>Fair use of the site</h2>
          <p>Please use these files rather than scraping pages. They are static and cheap for us to serve.</p>
        </Prose>
      </Container>
    </>
  );
}
