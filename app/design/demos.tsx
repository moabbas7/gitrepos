"use client";

import dynamic from "next/dynamic";
import { LazyInView } from "@/components/gr/lazy-in-view";
import { SkeletonBlock } from "@/components/gr/skeletons";
import type { StarPoint } from "@/components/gr/star-chart";
import type { RepoCardData } from "@/lib/types";

// Non-critical, heavy pieces load only when they approach the viewport (no CLS: fixed heights).
const StarChart = dynamic(() => import("@/components/gr/star-chart"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[240px] w-full rounded-xl" />,
});
const FeedDemoImpl = dynamic(() => import("./feed-demo"), { ssr: false });

export function StarChartDemo({ data }: { data: StarPoint[] }) {
  return (
    <LazyInView minHeight={240} placeholder={<SkeletonBlock className="h-[240px] w-full rounded-xl" />}>
      <StarChart data={data} />
    </LazyInView>
  );
}

export function FeedDemo({ repos }: { repos: RepoCardData[] }) {
  return (
    <LazyInView minHeight={360}>
      <FeedDemoImpl repos={repos} />
    </LazyInView>
  );
}
