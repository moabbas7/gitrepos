import type { Metadata, Viewport } from "next";
import { Geist, Inter, JetBrains_Mono } from "next/font/google";
import { JsonLd } from "@/components/gr/json-ld";
import { SearchHost } from "@/components/gr/search-host";
import { SiteFooter } from "@/components/gr/site-footer";
import { SiteHeader } from "@/components/gr/site-header";
import { SvgDefs } from "@/components/gr/svg-defs";
import { CF_BEACON_TOKEN, SITE_URL } from "@/lib/site";
import { STATIC_COPY } from "@/lib/site-data/copy";
import { pageOgPath, websiteJsonLd } from "@/lib/site-data/seo";
import "./globals.css";

// All fonts: latin subset, swap, automatic size-adjusted fallback => no layout shift.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: STATIC_COPY.home.title, template: "%s · GitRepos" },
  description: STATIC_COPY.home.description,
  applicationName: "GitRepos",
  openGraph: { siteName: "GitRepos", type: "website", images: [{ url: pageOgPath("default"), width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#07070B",
  colorScheme: "dark",
};

/** Marks JS as available before first paint so scroll-reveal styles only hide content when JS can show it. */
const JS_FLAG = `document.documentElement.classList.add("js")`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${inter.variable} ${jetbrains.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SvgDefs />
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
        <SearchHost />
        <JsonLd data={websiteJsonLd()} />
        {CF_BEACON_TOKEN && (
          // Cloudflare Web Analytics: cookieless, no personal data (see /privacy).
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
