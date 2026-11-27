import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DigestView } from "@/components/gr/digest-view";
import { digestCopy } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSite()
    .snap.digests.filter((d) => d.kind === "monthly")
    .map((d) => ({ month: d.periodKey }));
}

export async function generateMetadata({ params }: PageProps<"/monthly/[month]">): Promise<Metadata> {
  const { month } = await params;
  const d = getSite().digest("monthly", month);
  if (!d) return {};
  const c = digestCopy("monthly", month);
  return pageMetadata({ title: c.title, description: d.intro ?? c.description, path: `/monthly/${month}`, og: pageOgPath(c.ogKey) });
}

export default async function Page({ params }: PageProps<"/monthly/[month]">) {
  const { month } = await params;
  const site = getSite();
  const d = site.digest("monthly", month);
  if (!d) notFound();
  return <DigestView site={site} digest={d} />;
}
