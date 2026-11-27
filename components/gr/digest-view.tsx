import Link from "next/link";
import type { Digest } from "@/lib/db/public";
import { digestCopy, digestLabel } from "@/lib/site-data/copy";
import type { Site } from "@/lib/site-data/load";
import { itemListJsonLd } from "@/lib/site-data/seo";
import { Container } from "./container";
import { JsonLd } from "./json-ld";
import { PageHero } from "./page-hero";
import { RepoList } from "./repo-list";

/** Shared weekly/monthly digest page body. */
export function DigestView({ site, digest }: { site: Site; digest: Digest }) {
  const c = digestCopy(digest.kind, digest.periodKey);
  const path = `/${digest.kind}/${digest.periodKey}`;
  const same = site.snap.digests.filter((d) => d.kind === digest.kind);
  const i = same.findIndex((d) => d.id === digest.id);
  const newer = i > 0 ? same[i - 1] : null;
  const older = i >= 0 && i < same.length - 1 ? same[i + 1] : null;
  return (
    <>
      <PageHero
        eyebrow={c.eyebrow}
        title={digest.title}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Digests", path: "/digests" },
          { name: digestLabel(digest.kind, digest.periodKey), path },
        ]}
      >
        {digest.intro && <p className="max-w-2xl text-[16px] leading-relaxed text-fg/64 sm:text-[17px]">{digest.intro}</p>}
        <p className="font-mono text-xs text-fg/50">
          Published <time dateTime={digest.publishedAt}>{digest.publishedAt.slice(0, 10)}</time> · ranked by stars gained in the period
        </p>
      </PageHero>
      <Container className="space-y-10">
        <RepoList items={digest.items} period={digest.kind === "weekly" ? "week" : "month"} topicPages={site.linkedTopics(digest.items)} />
        <nav aria-label="More digests" className="flex flex-wrap justify-between gap-3 border-t border-fg/8 pt-6 font-mono text-[13px]">
          {older ? (
            <Link href={`/${older.kind}/${older.periodKey}`} className="inline-flex min-h-10 items-center text-fg/64 hover:text-fg">
              ← {digestLabel(older.kind, older.periodKey)}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/digests" className="inline-flex min-h-10 items-center text-fg/64 hover:text-fg">
            All digests
          </Link>
          {newer ? (
            <Link href={`/${newer.kind}/${newer.periodKey}`} className="inline-flex min-h-10 items-center text-fg/64 hover:text-fg">
              {digestLabel(newer.kind, newer.periodKey)} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </Container>
      <JsonLd data={itemListJsonLd(c.title, path, digest.items)} />
    </>
  );
}
