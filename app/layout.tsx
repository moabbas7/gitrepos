import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/gr/theme";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// All fonts: latin subset, swap, automatic size-adjusted fallback => no layout shift.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "GitRepos: trending GitHub repositories", template: "%s · GitRepos" },
  description:
    "Hand-picked and data-ranked GitHub repositories, updated hourly from GH Archive. From the team behind @gitrepos.si.",
};

export const viewport: Viewport = {
  themeColor: "#080B16",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline script below may set data-theme before paint.
      suppressHydrationWarning
      className={`${sora.variable} ${inter.variable} ${jetbrains.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
