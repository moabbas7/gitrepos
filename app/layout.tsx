import type { Metadata, Viewport } from "next";
import { Geist, Inter, JetBrains_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// All fonts: latin subset, swap, automatic size-adjusted fallback => no layout shift.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "GitRepos: trending GitHub repositories", template: "%s · GitRepos" },
  description:
    "The GitHub repositories developers are starring right now, ranked hourly from real star counts. From the team behind @gitrepos.si.",
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
        {children}
      </body>
    </html>
  );
}
