/**
 * README badges (pure; unit-tested). Two kinds, both static SVG files so they cost no Worker CPU:
 *  - /badge/<owner>/<name>.svg — current rank, only for repos in a top list (rebuilt hourly)
 *  - /badge/featured.svg       — generic "Featured on GitRepos" for everyone else
 * A per-repo URL whose repo has left the lists falls back to the generic badge (app/badge route).
 * Three colours only: canvas black, white text, the brand gradient (veiled for AA).
 */
import type { Ranking } from "@/lib/db/public";

const PERIOD_WORD = { today: "today", week: "this week", month: "this month" } as const;

/** Best current placement per repo id, e.g. "#3 trending today", "#2 in Rust this week". */
export function badgeLabels(rankings: readonly Ranking[]): Map<number, string> {
  const best = new Map<number, { label: string; score: number }>();
  const typeWeight = { trending: 0, rising: 1000, new: 2000 } as const;
  const periodWeight = { today: 0, week: 100, month: 200 } as const;
  for (const r of rankings) {
    const langWeight = r.language === "all" ? 0 : 10_000;
    const langName = r.language === "all" ? null : (r.items[0]?.language ?? r.language);
    for (const item of r.items) {
      const score = langWeight + typeWeight[r.listType] + periodWeight[r.period] + item.rank;
      const prev = best.get(item.id);
      if (prev && prev.score <= score) continue;
      const what = r.listType === "trending" ? (langName ? `in ${langName}` : "trending") : r.listType === "rising" ? "rising" : "new";
      const where = langName && r.listType !== "trending" ? ` in ${langName}` : "";
      best.set(item.id, { label: `#${item.rank} ${what}${where} ${PERIOD_WORD[r.period]}`, score });
    }
  }
  return new Map([...best].map(([id, v]) => [id, v.label]));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Approximate Verdana 11px advance width; textLength keeps rendering consistent anyway. */
const textWidth = (s: string) => Math.round([...s].reduce((w, c) => w + (/[ il.,:;|!'1]/.test(c) ? 3.6 : /[mwMW@%#]/.test(c) ? 9.4 : /[A-Z0-9]/.test(c) ? 7.4 : 6.4), 0));

export function badgeSvg(value: string, label = "GitRepos"): string {
  const lw = textWidth(label) + 20;
  const vw = textWidth(value) + 20;
  const w = lw + vw;
  const title = `${label}: ${value}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#049DFF"/><stop offset=".5" stop-color="#612BFB"/><stop offset="1" stop-color="#FD26FE"/></linearGradient><clipPath id="r"><rect width="${w}" height="20" rx="10"/></clipPath></defs><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#07070B"/><rect x="${lw}" width="${vw}" height="20" fill="url(#g)"/><rect x="${lw}" width="${vw}" height="20" fill="#07070B" fill-opacity=".3"/></g><g fill="#FAFAFA" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11" text-rendering="geometricPrecision"><text x="${lw / 2}" y="14" text-anchor="middle" textLength="${lw - 20}">${esc(label)}</text><text x="${lw + vw / 2}" y="14" text-anchor="middle" textLength="${vw - 20}">${esc(value)}</text></g></svg>`;
}

export const FEATURED_BADGE_TEXT = "Featured";
export const featuredBadgeSvg = () => badgeSvg(FEATURED_BADGE_TEXT);

export function badgeUrl(siteUrl: string, owner: string, name: string, ranked: boolean): string {
  return ranked ? `${siteUrl}/badge/${owner}/${name}.svg` : `${siteUrl}/badge/featured.svg`;
}

export function badgeMarkdown(siteUrl: string, owner: string, name: string, ranked: boolean): string {
  return `[![Featured on GitRepos](${badgeUrl(siteUrl, owner, name, ranked)})](${siteUrl}/repo/${owner}/${name})`;
}
