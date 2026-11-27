import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DigestView } from "@/components/gr/digest-view";
import { digestCopy } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSite()
    .snap.digests.filter((d) => d.kind === "weekly")
    .map((d) => ({ week: d.periodKey }));
}

export async function generateMetadata({ params }: PageProps<"/weekly/[week]">): Promise<Metadata> {
  const { week } = await params;
  const d = getSite().digest("weekly", week);
  if (!d) return {};
  const c = digestCopy("weekly", week);
  return pageMetadata({ title: c.title, description: d.intro ?? c.description, path: `/weekly/${week}`, og: pageOgPath(c.ogKey) });
}

export default async function Page({ params }: PageProps<"/weekly/[week]">) {
  const { week } = await params;
  const site = getSite();
  const d = site.digest("weekly", week);
  if (!d) notFound();
  return <DigestView site={site} digest={d} />;
}
