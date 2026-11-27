import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { InstagramIcon } from "./brand-icons";
import { Container } from "./container";
import { SearchButton } from "./search-button";

export const NAV = [
  { href: "/", label: "Trending" },
  { href: "/rising", label: "Rising" },
  { href: "/new", label: "New" },
  { href: "/languages", label: "Languages" },
  { href: "/topics", label: "Topics" },
  { href: "/digests", label: "Digests" },
] as const;

/** Sticky glass header: logo, nav, search (⌘K / tap), Instagram. Mobile nav is a no-JS <details>. */
export function SiteHeader() {
  return (
    <header className="gr-header-glass sticky top-0 z-40">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-bg px-4 py-2 text-sm text-fg focus:not-sr-only focus:absolute focus:top-3 focus:left-4"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center gap-3">
        <Link href="/" className="mr-2 inline-flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="GitRepos home">
          <Image src="/logo.png" alt="" width={28} height={28} priority className="rounded-md" />
          <span className="font-heading text-[17px] font-semibold tracking-[-0.02em]">GitRepos</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex h-10 items-center rounded-full px-3 text-[14px] text-fg/64 transition-colors hover:bg-fg/6 hover:text-fg">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchButton />
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            aria-label={`@${INSTAGRAM_HANDLE} on Instagram`}
            className="inline-flex size-10 items-center justify-center rounded-full text-fg/64 transition-colors hover:bg-fg/6 hover:text-fg"
          >
            <InstagramIcon className="size-[18px]" />
          </a>
          <details className="group relative lg:hidden">
            <summary
              aria-label="Menu"
              className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-fg/64 transition-colors hover:bg-fg/6 hover:text-fg [&::-webkit-details-marker]:hidden"
            >
              <Menu aria-hidden className="size-5" />
            </summary>
            <nav aria-label="Main" className="gr-glass absolute right-0 mt-2 w-56 rounded-2xl bg-bg/95 p-2 backdrop-blur-xl">
              <ul>
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="flex h-11 items-center rounded-xl px-3 text-[15px] text-fg/64 hover:bg-fg/6 hover:text-fg">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </Container>
    </header>
  );
}
