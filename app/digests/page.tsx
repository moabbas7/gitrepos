import type { Metadata } from "next";
import Link from "next/link";
import { firstDigestDates } from "@/jobs/lib/digest";
import { Container } from "@/components/gr/container";
import { EmptyState } from "@/components/gr/empty-state";
import { PageHero } from "@/components/gr/page-hero";
import type { Digest } from "@/lib/db/public";
import { digestLabel, STATIC_COPY } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.digests;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/digests", og: pageOgPath(copy.ogKey) });

function DigestColumn({ title, digests, firstDate, kindWord }: { title: string; digests: Digest[]; firstDate: string | null; kindWord: string }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[22px] tracking-[-0.025em]">{title}</h2>
      {digests.length ? (
        <ul className="grid gap-2">
          {digests.map((d) => (
            <li key={d.id}>
              <Link href={`/${d.kind}/${d.periodKey}`} prefetch={false} className="gr-glass gr-ring-hover flex flex-col gap-1 rounded-2xl p-4 sm:p-5">
                <span className="font-heading text-[17px] font-semibold tracking-[-0.015em]">{digestLabel(d.kind, d.periodKey)}</span>
                <span className="truncate text-sm text-fg/64">
                  {d.items[0] ? `Led by ${d.items[0].owner}/${d.items[0].name}` : "No repositories qualified"} · {d.items.length} repos
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState eyebrow="Collecting star history" title={`The first ${kindWord} digest is on its way.`}>
          {firstDate
            ? `It's published on ${firstDate}, after our first full ${kindWord === "weekly" ? "week" : "month"} of star history.`
            : "It's published after our first full period of star history."}
        </EmptyState>
      )}
    </section>
  );
}

export default function Page() {
  const site = getSite();
  const first = firstDigestDates(site.snap.trackingSince);
  const weekly = site.snap.digests.filter((d) => d.kind === "weekly");
  const monthly = site.snap.digests.filter((d) => d.kind === "monthly");
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={copy.description}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Digests", path: "/digests" },
        ]}
      />
      <Container className="grid gap-10 md:grid-cols-2">
        <DigestColumn title="Weekly" digests={weekly} firstDate={first.weekly} kindWord="weekly" />
        <DigestColumn title="Monthly" digests={monthly} firstDate={first.monthly} kindWord="monthly" />
      </Container>
    </>
  );
}
