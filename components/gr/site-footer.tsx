import Image from "next/image";
import Link from "next/link";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { InstagramIcon } from "./brand-icons";
import { Container } from "./container";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { href: "/", label: "Trending today" },
      { href: "/rising", label: "Rising" },
      { href: "/new", label: "New repositories" },
      { href: "/digests", label: "Weekly digests" },
    ],
  },
  {
    title: "Browse",
    links: [
      { href: "/languages", label: "Languages" },
      { href: "/topics", label: "Topics" },
      { href: "/search", label: "Search" },
      { href: "/data", label: "Open data (CC0)" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "Methodology" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-fg/8 sm:mt-32">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="font-heading text-[17px] font-semibold tracking-[-0.02em]">GitRepos</span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-fg/64">
            The GitHub repositories developers are starring right now, ranked every hour from real star counts.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-fg/10 px-4 font-mono text-[13px] text-fg/64 transition-colors hover:border-fg/16 hover:text-fg"
          >
            <InstagramIcon className="size-4" />@{INSTAGRAM_HANDLE}
          </a>
        </div>
        {GROUPS.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="gr-eyebrow mb-3">{g.title}</p>
            <ul className="space-y-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} prefetch={false} className="inline-flex min-h-10 items-center text-sm text-fg/64 transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-fg/8 py-6 font-mono text-xs text-fg/50 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Data from GitHub &amp; GH Archive · Trend data{" "}
          <Link href="/data" prefetch={false} className="underline decoration-fg/28 underline-offset-2 hover:text-fg">
            CC0
          </Link>
        </p>
        <p>Not affiliated with GitHub. Every repository links to its source.</p>
      </Container>
    </footer>
  );
}
