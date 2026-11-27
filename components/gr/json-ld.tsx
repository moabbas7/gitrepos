import { jsonLdString } from "@/lib/site-data/seo";

/** <script type="application/ld+json"> with "<" escaped (see seo.ts). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
