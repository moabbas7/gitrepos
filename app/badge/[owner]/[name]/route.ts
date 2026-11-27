/**
 * README badge fallback. Ranked repos have a static /badge/<owner>/<name>.svg (served as a static
 * asset, never reaching the Worker). When a repo leaves the lists its file disappears and the
 * request falls through to here: we answer with the generic "Featured" badge so READMEs never show
 * a broken image. No D1, no data — a constant string, so it fits the Free plan's CPU limit.
 */
import { featuredBadgeSvg } from "@/lib/site-data/badge";

const SVG = featuredBadgeSvg();

export function GET() {
  return new Response(SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // GitHub's image proxy (camo) and browsers cache it; a day keeps Worker requests low.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
