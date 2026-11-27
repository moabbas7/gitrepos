import type { Metadata } from "next";
import Link from "next/link";
import { InstagramIcon } from "@/components/gr/brand-icons";
import { Container } from "@/components/gr/container";
import { PageHero } from "@/components/gr/page-hero";
import { Placeholder, Prose } from "@/components/gr/prose";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.about;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/about", og: pageOgPath(copy.ogKey) });

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={copy.lead}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      >
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-fg/10 px-5 font-mono text-[13px] text-fg transition-colors hover:border-fg/16 hover:bg-fg/6"
        >
          <InstagramIcon className="size-4" />
          Follow @{INSTAGRAM_HANDLE} on Instagram
        </a>
      </PageHero>
      <Container>
        <Prose>
          <p>
            GitRepos is the website of <a href={INSTAGRAM_URL}>@{INSTAGRAM_HANDLE}</a>, an Instagram account that shares interesting open-source projects
            from GitHub. The site answers one question: <strong>what are developers starring right now?</strong>
          </p>
          <p>
            Every hour we measure real star counts for thousands of repositories and rank them by growth: today, this week and this month, overall and
            per language. Rising surfaces smaller projects growing fast, and New covers launches from the last 30 days. The{" "}
            <Link href="/methodology">methodology</Link> explains exactly how.
          </p>
          <h2>Principles</h2>
          <ul>
            <li>Every repository links back to its source on GitHub.</li>
            <li>Summaries are our own words. We don&apos;t copy READMEs.</li>
            <li>Rankings are computed, not sold. Sponsored content will always be labelled.</li>
            <li>
              Our computed trend data is <Link href="/data">public domain (CC0)</Link>.
            </li>
          </ul>
          <h2>Contact</h2>
          <p>
            Questions, corrections, or want a repository removed? Email <Placeholder>contact email</Placeholder> or send a DM to{" "}
            <a href={INSTAGRAM_URL}>@{INSTAGRAM_HANDLE}</a>. GitRepos is run by <Placeholder>operator name</Placeholder>,{" "}
            <Placeholder>country</Placeholder>.
          </p>
          <p className="text-[13px] text-fg/50">GitRepos is independent and not affiliated with GitHub, Inc.</p>
        </Prose>
      </Container>
    </>
  );
}
