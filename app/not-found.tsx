import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/gr/button";
import { Container } from "@/components/gr/container";
import { Aurora, GradientText } from "@/components/gr/hero-fx";
import { RetiredRepo } from "@/components/gr/retired-repo";
import { SearchButton } from "@/components/gr/search-button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

/** Designed 404. Never reads the snapshot (it can render at request time in the Worker). */
export default function NotFound() {
  return (
    <section className="relative isolate flex-1 overflow-hidden">
      <Aurora className="-inset-x-[30vw] -top-24 bottom-0 opacity-60" />
      <Container className="max-w-[720px] space-y-6 py-20 sm:py-28">
        <p className="gr-eyebrow">404 · not found</p>
        <h1 className="text-[40px] leading-[1.04] tracking-[-0.045em] sm:text-[56px]">
          This page isn&apos;t <GradientText>trending</GradientText>.
        </h1>
        <p className="text-[17px] leading-relaxed text-fg/64">It may have moved, or it never existed. Search for a repository or start from the lists.</p>
        <RetiredRepo />
        <SearchButton variant="hero" />
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/">Trending today</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/rising">Rising</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/new">New</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
