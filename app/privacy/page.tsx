import type { Metadata } from "next";
import { Container } from "@/components/gr/container";
import { PageHero } from "@/components/gr/page-hero";
import { Placeholder, Prose } from "@/components/gr/prose";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { pageMetadata, pageOgPath } from "@/lib/site-data/seo";

export const dynamic = "force-static";

const copy = STATIC_COPY.privacy;
export const metadata: Metadata = pageMetadata({ title: copy.title, description: copy.description, path: "/privacy", og: pageOgPath(copy.ogKey) });
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
          { name: "Privacy", path: "/privacy" },
        ]}
      />
      <Container>
        <Prose>
          <p>
            GitRepos (&ldquo;we&rdquo;) is operated by <Placeholder>operator name</Placeholder>, <Placeholder>country</Placeholder>. This policy explains
            what happens to your data when you use GitRepos. In short: we don&apos;t have accounts, we don&apos;t set cookies, and we don&apos;t sell
            anything about you.
          </p>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Analytics.</strong> We use Cloudflare Web Analytics to count page views. It is cookieless, doesn&apos;t fingerprint you and
              doesn&apos;t track you across sites. It records things like the page, referrer, country and browser type in aggregate.
            </li>
            <li>
              <strong>Server logs.</strong> Our host, Cloudflare, processes your IP address and request details to deliver the site and protect it from
              abuse, and keeps short-lived logs.
            </li>
          </ul>
          <h2>Cookies and ads</h2>
          <p>
            The site currently sets no cookies and shows no ads. If we add advertising later, this policy will be updated first and, where the law
            requires it, we&apos;ll ask for your consent before any advertising cookies are used.
          </p>
          <h2>GitHub data</h2>
          <p>
            Repository pages show public information from GitHub: repository names, owners, descriptions, topics, avatars and star counts. If you
            own a repository and want its page removed, contact us and we&apos;ll remove it.
          </p>
          <h2>Third parties</h2>
          <ul>
            <li>Cloudflare (hosting, analytics).</li>
            <li>GitHub (avatars are loaded from GitHub&apos;s servers; links lead to GitHub).</li>
            <li>Instagram, if you follow the link to @{INSTAGRAM_HANDLE}.</li>
          </ul>
          <h2>Your rights</h2>
          <p>
            Depending on where you live (for example under the GDPR), you can ask for access to, correction of or deletion of personal data. Since we
            hold almost none, most requests are simple. Contact <Placeholder>contact email</Placeholder> or <a href={INSTAGRAM_URL}>@{INSTAGRAM_HANDLE}</a>.
          </p>
          <h2>Changes</h2>
          <p>We&apos;ll update the date at the top when this policy changes.</p>
        </Prose>
      </Container>
    </>
  );
}
