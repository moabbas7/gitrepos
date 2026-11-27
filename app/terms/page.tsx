import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/gr/container";
import { PageHero } from "@/components/gr/page-hero";
import { Placeholder, Prose } from "@/components/gr/prose";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.terms;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/terms", og: pageOgPath(copy.ogKey) });
const UPDATED = "2026-11-27";

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.headline}
        lead={`Last updated ${UPDATED}.`}
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms" },
        ]}
      />
      <Container>
        <Prose>
          <p>
            These terms apply to GitRepos, operated by <Placeholder>operator name</Placeholder>, <Placeholder>country</Placeholder>. By using the site
            you agree to them.
          </p>
          <h2>The service</h2>
          <p>
            GitRepos ranks public GitHub repositories by star growth. Rankings, counts and summaries are provided as-is, for information only, and may
            be delayed, incomplete or wrong. We don&apos;t endorse any repository, and you use third-party code at your own risk. Always check the source
            on GitHub.
          </p>
          <h2>Content and trademarks</h2>
          <ul>
            <li>
              Repository content (code, READMEs, logos, avatars) belongs to its owners. We link to it and show only names, short descriptions, topics
              and counts.
            </li>
            <li>The GitRepos name, logo and site design are ours.</li>
            <li>GitHub is a trademark of GitHub, Inc. GitRepos is not affiliated with GitHub.</li>
          </ul>
          <h2>Our data</h2>
          <p>
            The rankings and counts we compute are dedicated to the public domain under <Link href="/data">CC0 1.0</Link>. This doesn&apos;t cover
            GitHub content or the site&apos;s design.
          </p>
          <h2>README badge</h2>
          <p>You may embed the GitRepos badge in any README. We may change its look or retire it at any time.</p>
          <h2>Acceptable use</h2>
          <p>
            Don&apos;t try to disrupt the site, scrape it in a way that degrades it (use the <Link href="/data">data exports</Link> instead), or
            misrepresent our rankings.
          </p>
          <h2>Removal requests</h2>
          <p>
            Repository owners can ask us to remove their repository&apos;s page by emailing <Placeholder>contact email</Placeholder>.
          </p>
          <h2>Liability</h2>
          <p>
            To the extent the law allows, we&apos;re not liable for any loss arising from your use of the site. Nothing in these terms limits rights
            you have under the law of <Placeholder>country</Placeholder> that can&apos;t be limited.
          </p>
          <h2>Changes</h2>
          <p>We may update these terms and will change the date at the top when we do.</p>
        </Prose>
      </Container>
    </>
  );
}
