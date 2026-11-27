import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/gr/container";
import { JsonLd } from "@/components/gr/json-ld";
import { PageHero } from "@/components/gr/page-hero";
import { RepoList } from "@/components/gr/repo-list";
import { topicCopy } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { itemListJsonLd, pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamicParams = false;
const LIMIT = 50;

export function generateStaticParams() {
  return getSite().topics.map((t) => ({ topic: t.topic }));
}

const find = (topic: string) => getSite().topics.find((t) => t.topic === topic);

export async function generateMetadata({ params }: PageProps<"/topic/[topic]">): Promise<Metadata> {
  const t = find((await params).topic);
  if (!t) return {};
  const c = topicCopy(t.topic, t.count);
  return pageMetadata({ title: c.title, description: c.description, path: `/topic/${t.topic}`, og: pageOgPath(c.ogKey) });
}

export default async function Page({ params }: PageProps<"/topic/[topic]">) {
  const t = find((await params).topic);
  if (!t) notFound();
  const site = getSite();
  const c = topicCopy(t.topic, t.count);
  const repos = site.repos
    .filter((r) => r.topics.includes(t.topic))
    .sort((a, b) => b.gained7d - a.gained7d || b.stars - a.stars)
    .slice(0, LIMIT);
  const items = repos.map((r, i) => site.card(r, r.gained7d, i + 1));
  const topicPages = site.topics.map((x) => x.topic);

  // Related topics: most frequent co-occurring topics that have their own page.
  const co = new Map<string, number>();
  for (const r of repos) for (const x of r.topics) if (x !== t.topic && topicPages.includes(x)) co.set(x, (co.get(x) ?? 0) + 1);
  const related = [...co.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([x]) => x);
  const langs = new Map<string, number>();
  for (const r of repos) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);
  const langLinks = [...langs.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => site.languages.find((l) => l.name === name))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow={c.eyebrow}
        title={c.headline}
        lead={c.description}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
          { name: `#${t.topic}`, path: `/topic/${t.topic}` },
        ]}
      />
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <RepoList items={items} period="week" topicPages={site.linkedTopics(items)} />
        <aside className="space-y-6" aria-label="Related">
          {related.length > 0 && (
            <nav aria-label="Related topics" className="gr-glass rounded-2xl p-5">
              <h2 className="gr-eyebrow mb-3">Related topics</h2>
              <ul className="flex flex-wrap gap-1.5">
                {related.map((x) => (
                  <li key={x}>
                    <Link href={`/topic/${x}`} prefetch={false} className="inline-flex h-8 items-center rounded-full border border-fg/10 px-3 font-mono text-xs text-fg/64 hover:border-fg/16 hover:text-fg">
                      #{x}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {langLinks.length > 0 && (
            <nav aria-label="Languages in this topic" className="gr-glass rounded-2xl p-5">
              <h2 className="gr-eyebrow mb-3">Languages</h2>
              <ul className="flex flex-wrap gap-1.5">
                {langLinks.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/language/${l.slug}`} prefetch={false} className="inline-flex h-8 items-center rounded-full border border-fg/10 px-3 font-mono text-xs text-fg/64 hover:border-fg/16 hover:text-fg">
                      {l.name}
                      <span className="sr-only"> repositories</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </Container>
      <JsonLd data={itemListJsonLd(c.title, `/topic/${t.topic}`, items)} />
    </>
  );
}
