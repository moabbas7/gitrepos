/**
 * Per-page SEO (pure; unit-tested): titles, descriptions, canonical URLs, Open Graph/Twitter
 * cards pointing at pre-generated /og/*.png images, and JSON-LD builders.
 */
import type { Metadata } from "next";
import { compactNumber } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { absoluteUrl } from "./sitemap";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Repo page OG image path. Owner/name are lowercased and joined with "__" to keep one flat file per repo. */
export const repoOgPath = (owner: string, name: string) => `/og/repo/${`${owner}__${name}`.toLowerCase()}.png`;
export const pageOgPath = (key: string) => `/og/page/${key}.png`;

/** "owner/name: description" clipped to ~70 chars (the layout appends " · GitRepos"). */
export function repoTitle(r: { owner: string; name: string; description: string | null }): string {
  const base = `${r.owner}/${r.name}`;
  return r.description ? clip(`${base}: ${r.description.replace(/\s+/g, " ").trim()}`, 70) : `${base}: GitHub stars, trend and similar repos`;
}

/** Our own summary when we have one; otherwise a factual line built from the numbers. */
export function repoDescription(r: { owner: string; name: string; description: string | null; summary: string | null; stars: number; gained7d: number }): string {
  if (r.summary) return r.summary;
  const desc = r.description ? `: ${r.description.replace(/\s+/g, " ").trim().replace(/\.$/, "")}` : "";
  return `${r.owner}/${r.name}${desc}. ${compactNumber(r.stars)} stars, +${compactNumber(r.gained7d)} this week. Star history and similar repositories on GitRepos.`;
}

export function pageMetadata({
  title,
  description,
  path,
  og = pageOgPath("default"),
  noindex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  og?: string;
  noindex?: boolean;
  /** Use the title as-is (no " · GitRepos" template). */
  absoluteTitle?: boolean;
}): Metadata {
  const desc = clip(description.replace(/\s+/g, " ").trim(), 160);
  const url = absoluteUrl(SITE_URL, path);
  const image = { url: absoluteUrl(SITE_URL, og), width: 1200, height: 630, alt: title };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description: desc, url, images: [image] },
    twitter: { card: "summary_large_image", title, description: desc, images: [image.url] },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(SITE_URL, it.path),
    })),
  };
}

export function itemListJsonLd(name: string, path: string, repos: { owner: string; name: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: absoluteUrl(SITE_URL, path),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: repos.length,
      itemListElement: repos.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(SITE_URL, `/repo/${r.owner}/${r.name}`),
        name: `${r.owner}/${r.name}`,
      })),
    },
  };
}

export function repoJsonLd(r: {
  owner: string;
  name: string;
  description: string | null;
  summary: string | null;
  language: string | null;
  licence: string | null;
  createdAt: string | null;
  pushedAt: string | null;
  topics: string[];
  stars: number;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: r.name,
    description: r.summary ?? r.description ?? undefined,
    url: absoluteUrl(SITE_URL, `/repo/${r.owner}/${r.name}`),
    codeRepository: `https://github.com/${r.owner}/${r.name}`,
    programmingLanguage: r.language ?? undefined,
    license: r.licence ? `https://spdx.org/licenses/${r.licence}.html` : undefined,
    dateCreated: r.createdAt ?? undefined,
    dateModified: r.pushedAt ?? undefined,
    keywords: r.topics.length ? r.topics.join(", ") : undefined,
    author: { "@type": "Person", name: r.owner, url: `https://github.com/${r.owner}` },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: r.stars,
    },
  };
}

/** Serialises JSON-LD for a <script> tag; escapes "<" so content can't close the tag. */
export function jsonLdString(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
