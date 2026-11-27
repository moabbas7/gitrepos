import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/gr/container";
import { Feed } from "@/components/gr/feed";
import { JsonLd } from "@/components/gr/json-ld";
import { PageHero } from "@/components/gr/page-hero";
import { languageCopy } from "@/lib/site-data/copy";
import { feedProps } from "@/lib/site-data/feed-props";
import { getSite } from "@/lib/site-data/load";
import { itemListJsonLd, pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSite().languages.map((l) => ({ lang: l.slug }));
}

function find(lang: string) {
  return getSite().languages.find((l) => l.slug === lang);
}

export async function generateMetadata({ params }: PageProps<"/language/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const l = find(lang);
  if (!l) return {};
  const c = languageCopy(l.name, l.slug);
  return pageMetadata({ title: c.title, description: c.description, path: `/language/${l.slug}`, og: pageOgPath(c.ogKey) });
}

export default async function Page({ params }: PageProps<"/language/[lang]">) {
  const { lang } = await params;
  const l = find(lang);
  if (!l) notFound();
  const site = getSite();
  const c = languageCopy(l.name, l.slug);
  const feed = feedProps(site, { listType: "trending", language: l.slug, languageFilter: false });
  const others = site.languages.filter((x) => x.slug !== l.slug).slice(0, 12);
  return (
    <>
      <PageHero
        eyebrow={c.eyebrow}
        title={c.headline}
        lead={c.description}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Languages", path: "/languages" },
          { name: l.name, path: `/language/${l.slug}` },
        ]}
      />
      <Container className="space-y-12">
        <Feed {...feed} />
        {others.length > 0 && (
          <nav aria-label="Other languages" className="space-y-3">
            <h2 className="gr-eyebrow">Other languages</h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/language/${o.slug}`}
                    prefetch={false}
                    className="inline-flex h-10 items-center rounded-full border border-fg/10 px-4 font-mono text-[13px] text-fg/64 transition-colors hover:border-fg/16 hover:text-fg"
                  >
                    {o.name}
                    <span className="sr-only"> repositories</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Container>
      <JsonLd data={itemListJsonLd(c.headline, `/language/${l.slug}`, feed.initialItems)} />
    </>
  );
}
