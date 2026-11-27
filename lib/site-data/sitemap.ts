/**
 * Sitemaps (pure; unit-tested): /sitemap.xml is an index pointing at /sitemaps/<group>.xml files,
 * split at 10,000 URLs (well under the 50,000 protocol limit). Emitted as static files at build.
 */
export interface SitemapUrl {
  path: string; // "/repo/a/b"
  lastmod?: string; // ISO date
  priority?: number;
}

export interface SitemapFile {
  path: string; // "/sitemaps/repos-1.xml"
  xml: string;
}

export const SITEMAP_MAX_URLS = 10_000;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Absolute URL with each path segment percent-encoded (owner/repo names can contain dots etc.). */
export function absoluteUrl(siteUrl: string, path: string): string {
  const clean = path === "/" ? "/" : path.split("/").map((seg) => encodeURIComponent(decodeURIComponent(seg))).join("/");
  return `${siteUrl.replace(/\/$/, "")}${clean}`;
}

function urlset(siteUrl: string, urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const parts = [`<loc>${esc(absoluteUrl(siteUrl, u.path))}</loc>`];
      if (u.lastmod) parts.push(`<lastmod>${u.lastmod.slice(0, 10)}</lastmod>`);
      if (u.priority !== undefined) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildSitemaps(
  siteUrl: string,
  groups: Record<string, SitemapUrl[]>,
  lastmod: string,
  maxUrls = SITEMAP_MAX_URLS,
): { index: SitemapFile; files: SitemapFile[] } {
  const files: SitemapFile[] = [];
  for (const [group, urls] of Object.entries(groups)) {
    if (!urls.length) continue;
    const chunks = Math.ceil(urls.length / maxUrls);
    for (let i = 0; i < chunks; i++) {
      const name = chunks === 1 ? group : `${group}-${i + 1}`;
      files.push({ path: `/sitemaps/${name}.xml`, xml: urlset(siteUrl, urls.slice(i * maxUrls, (i + 1) * maxUrls)) });
    }
  }
  const body = files
    .map((f) => `<sitemap><loc>${esc(absoluteUrl(siteUrl, f.path))}</loc><lastmod>${lastmod.slice(0, 10)}</lastmod></sitemap>`)
    .join("\n");
  return {
    index: {
      path: "/sitemap.xml",
      xml: `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`,
    },
    files,
  };
}
