import type { Metadata } from "next";
import { Container } from "@/components/gr/container";
import { Feed } from "@/components/gr/feed";
import { Aurora, GradientText, WordReveal } from "@/components/gr/hero-fx";
import { JsonLd } from "@/components/gr/json-ld";
import { SearchButton } from "@/components/gr/search-button";
import { Sidebar, StatLine } from "@/components/gr/sidebar";
import { ADS_ENABLED } from "@/lib/site";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { feedProps } from "@/lib/site-data/feed-props";
import { getSite } from "@/lib/site-data/load";
import { itemListJsonLd, pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.home;
export const metadata: Metadata = pageMetadata({
  title: copy.title,
  description: copy.description,
  path: "/",
  og: pageOgPath(copy.ogKey),
  absoluteTitle: true,
});

export default function Home() {
  const site = getSite();
  const feed = feedProps(site, { listType: "trending" });
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Aurora className="-inset-x-[30vw] -top-24 bottom-0" />
        <Container className="pt-14 pb-10 sm:pt-20 sm:pb-14">
          <div className="max-w-3xl space-y-5">
            <p className="gr-eyebrow">Trending on GitHub · updated hourly</p>
            <h1 className="text-[40px] leading-[1.02] tracking-[-0.045em] sm:text-[64px]">
              <WordReveal parts={["What developers are starring ", <GradientText key="g">right now</GradientText>]} />
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-fg/64 sm:text-[18px]">
              <StatLine site={site} />
            </p>
            <SearchButton variant="hero" className="max-w-xl" />
          </div>
        </Container>
      </section>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <h2 id="feed-title" className="text-[24px] leading-[1.15] tracking-[-0.025em] sm:text-[28px]">
            Trending repositories
          </h2>
          <Feed {...feed} labelledBy="feed-title" />
        </div>
        <Sidebar site={site} adsEnabled={ADS_ENABLED} />
      </Container>
      <JsonLd data={itemListJsonLd("Trending GitHub repositories today", "/", feed.initialItems)} />
    </>
  );
}
