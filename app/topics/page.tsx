import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/gr/container";
import { EmptyState } from "@/components/gr/empty-state";
import { PageHero } from "@/components/gr/page-hero";
import { compactNumber } from "@/lib/format";
import { TOPIC_MIN_REPOS } from "@/lib/site-data/landing";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.topics;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/topics", og: pageOgPath(copy.ogKey) });

export default function Page() {
  const site = getSite();
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={copy.description}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
        ]}
      />
      <Container>
        {site.topics.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {site.topics.map((t, i) => (
              <li key={t.topic}>
                <Link href={`/topic/${t.topic}`} prefetch={false} className="flex h-14 items-center gap-3 rounded-xl border border-fg/8 px-4 transition-colors hover:border-fg/16 hover:bg-fg/3">
                  <span className="gr-num w-7 text-xs text-fg/50">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[14px] text-fg">#{t.topic}</span>
                  <span className="gr-num shrink-0 text-xs text-fg/50">
                    {t.count} repos{t.gained7d > 0 ? ` · +${compactNumber(t.gained7d)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Topic pages appear as repositories are ranked.">
            A topic gets its own page once at least {TOPIC_MIN_REPOS} tracked repositories share it. Check back soon.
          </EmptyState>
        )}
      </Container>
    </>
  );
}
