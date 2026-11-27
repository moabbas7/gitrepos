import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/gr/container";
import { PageHero } from "@/components/gr/page-hero";
import { Prose } from "@/components/gr/prose";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { getSite } from "@/lib/site-data/load";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.methodology;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/methodology", og: pageOgPath(copy.ogKey) });

export default function Page() {
  const since = getSite().snap.trackingSince;
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={copy.lead}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Methodology", path: "/methodology" },
        ]}
      />
      <Container>
        <Prose>
          <h2>Where the numbers come from</h2>
          <p>
            We use two public sources. <strong>GH Archive</strong> publishes a sample of public GitHub events every hour, and we use its star
            events to <em>discover</em> which repositories are getting attention. The sample doesn&apos;t contain every star, so we never rank from it
            directly.
          </p>
          <p>
            The rankings come from the <strong>GitHub API</strong>. Every time we check a repository we record its real star count. The fastest movers
            are checked every hour and about 5,000 tracked repositories every six hours. GitHub Search also finds new repositories, and takes over if
            GH Archive falls behind.
          </p>

          <h2>How gains are measured</h2>
          <ul>
            <li>
              <strong>Today</strong>: stars now, minus stars 24 hours ago.
            </li>
            <li>
              <strong>This week</strong> and <strong>this month</strong>: the same over 7 and 30 days.
            </li>
            <li>Between two checks we interpolate linearly, so a repository checked every six hours still gets a fair hourly number.</li>
          </ul>

          <h2>The lists</h2>
          <ul>
            <li>
              <strong>Trending</strong>: most stars gained in the period.
            </li>
            <li>
              <strong>Rising</strong>: stars gained divided by stars at the start of the period, for repositories that started with 50 to 5,000 stars.
              It surfaces smaller projects that are growing fast.
            </li>
            <li>
              <strong>New</strong>: repositories created in the last 30 days, ordered by stars gained.
            </li>
            <li>
              Lists exist for all languages and for the 25 most active languages. <Link href="/topics">Topic pages</Link> group tracked repositories by
              their GitHub topics.
            </li>
          </ul>

          <h2>Badges</h2>
          <ul>
            <li>
              <strong>Trending</strong> marks the #1 repository of a list.
            </li>
            <li>
              <strong>Hot</strong> marks the top 1% of repositories by stars gained in the last 24 hours, with a minimum of 20 stars.
            </li>
            <li>
              <strong>New</strong> marks repositories created this calendar year.
            </li>
          </ul>

          <h2>What we leave out</h2>
          <ul>
            <li>Archived repositories, forks, empty repositories and repositories that no longer exist.</li>
            <li>
              Star farming: for fast movers we sample the 50 most recent stargazers. If more than 80% of them had accounts less than 7 days old when
              they starred, the repository is excluded.
            </li>
          </ul>

          <h2>Early days</h2>
          <p>
            Gains need history. Today needs 24 hours of tracking, This week 7 days and This month 30 days. Until a period has a full window, its list
            counts gains from when tracking began, and the page says so.
            {since && ` Tracking began on ${since.slice(0, 10)}.`}
          </p>

          <h2>Pages, summaries and digests</h2>
          <p>
            Once a repository has a page here it stays up, even after it leaves the lists. Each page has a short original summary, written by AI from
            public repository data or generated from a template, and always links to the repository on GitHub. We don&apos;t copy README text.
            Weekly and monthly <Link href="/digests">digests</Link> are built from the daily archive of the lists.
          </p>

          <h2>Independence</h2>
          <p>
            Rankings are computed, never sold. Any paid placement elsewhere on the site will always be labelled &ldquo;Sponsored&rdquo; and kept out of the
            ranked lists. Our computed data is <Link href="/data">free to reuse (CC0)</Link>.
          </p>
        </Prose>
      </Container>
    </>
  );
}
