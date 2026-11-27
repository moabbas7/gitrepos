import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/gr/container";
import { PageHero } from "@/components/gr/page-hero";
import { SearchResults } from "@/components/gr/search-results";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.search;
// Search results pages shouldn't be indexed; the page exists for the WebSite SearchAction.
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/search", og: pageOgPath(copy.ogKey), noindex: true });

export default function Page() {
  return (
    <>
      <PageHero eyebrow={copy.eyebrow} title={copy.headline} lead="Repositories, topics and languages tracked by GitRepos." />
      <Container>
        <Suspense fallback={<div className="min-h-[480px]" />}>
          <SearchResults />
        </Suspense>
      </Container>
    </>
  );
}
