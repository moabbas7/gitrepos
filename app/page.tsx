import type { Metadata } from "next";
import Image from "next/image";

// Placeholder until the Trending page is built in prompt 2.
export const dynamic = "force-static";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Image src="/logo.png" alt="GitRepos logo" width={88} height={88} priority />
      <p className="gr-eyebrow">Coming soon</p>
      <h1 className="text-4xl font-bold">GitRepos</h1>
      <p className="gr-subline">Trending GitHub repositories, updated every hour.</p>
      <p className="text-body">
        Follow <span className="font-mono text-ink">@gitrepos.si</span> on Instagram while we build.
      </p>
    </main>
  );
}
