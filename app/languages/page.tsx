import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/gr/container";
import { EmptyState } from "@/components/gr/empty-state";
import { PageHero } from "@/components/gr/page-hero";
import { compactNumber } from "@/lib/format";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.languages;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/languages", og: pageOgPath(copy.ogKey) });

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
          { name: "Languages", path: "/languages" },
        ]}
      />
      <Container>
        {site.languages.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {site.languages.map((l) => {
              const top = site.ranking("trending", "week", l.slug)?.items[0];
              return (
                <li key={l.slug}>
                  <Link href={`/language/${l.slug}`} prefetch={false} className="gr-glass gr-ring-hover flex h-full flex-col gap-2 rounded-2xl p-5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-heading text-[18px] font-semibold tracking-[-0.015em]">{l.name}</span>
                      <span className="gr-num text-xs text-fg/50">{l.count} trending</span>
                    </span>
                    {top && (
                      <span className="truncate font-mono text-[13px] text-fg/64">
                        #1 this week: {top.owner}/{top.name} <span className="text-fg/50">+{compactNumber(top.gained)}</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Language lists appear once the first repositories are ranked.">
            We rank the 25 most active languages every hour. Check back soon.
          </EmptyState>
        )}
      </Container>
    </>
  );
}
