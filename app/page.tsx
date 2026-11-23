import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/gr/button";
import { Aurora, GradientText, WordReveal } from "@/components/gr/hero-fx";

// Placeholder until the Trending page is built in prompt 2.
export const dynamic = "force-static";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Home() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Aurora className="-inset-x-[40vw] -top-10 bottom-0" />
      <Image src="/logo.png" alt="GitRepos logo" width={72} height={72} priority />
      <p className="gr-eyebrow">Coming soon</p>
      <h1 className="text-[44px] leading-[1.05] tracking-[-0.04em]">
        <WordReveal parts={["GitRepos, ", <GradientText key="g">live soon.</GradientText>]} />
      </h1>
      <p className="text-fg/64">
        Trending GitHub repositories, ranked every hour. Follow <span className="font-mono text-fg">@gitrepos.si</span> while we build.
      </p>
      <Button variant="secondary" asChild>
        <Link href="/design">See the design system</Link>
      </Button>
    </main>
  );
}
