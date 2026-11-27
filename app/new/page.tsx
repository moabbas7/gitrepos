import type { Metadata } from "next";
import { Container } from "@/components/gr/container";
import { Feed } from "@/components/gr/feed";
import { JsonLd } from "@/components/gr/json-ld";
import { PageHero } from "@/components/gr/page-hero";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { feedProps } from "@/lib/site-data/feed-props";
import { getSite } from "@/lib/site-data/load";
import { itemListJsonLd, pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.new;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/new", og: pageOgPath(copy.ogKey) });

export default function Page() {
  const site = getSite();
  const feed = feedProps(site, { listType: "new", period: "week", listTabs: false });
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={copy.description}
        crumbs={[
          { name: "Home", path: "/" },
          { name: copy.headline, path: "/new" },
        ]}
      />
      <Container>
        <Feed {...feed} />
      </Container>
      <JsonLd data={itemListJsonLd(copy.headline, "/new", feed.initialItems)} />
    </>
  );
}
