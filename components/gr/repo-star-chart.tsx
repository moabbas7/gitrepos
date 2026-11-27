"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FilterTabs } from "./filter-tabs";
import { LazyInView } from "./lazy-in-view";
import { SkeletonBlock } from "./skeletons";
import type { StarPoint } from "./star-chart";

const HEIGHT = 240;
// Recharts is only downloaded when the chart approaches the viewport.
const StarChart = dynamic(() => import("./star-chart"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[240px] w-full rounded-xl" />,
});

/** 30/90-day star history with a fixed-height box (no CLS). Needs ≥ 3 daily points. */
export function RepoStarChart({ points }: { points: StarPoint[] }) {
  const [range, setRange] = useState<"30" | "90">("30");
  const has90 = points.length > 30;
  const data = range === "90" ? points : points.slice(-30);
  return (
    <div className="space-y-4">
      {has90 && (
        <FilterTabs<"30" | "90">
          label="Chart range"
          value={range}
          onChange={setRange}
          options={[
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
      )}
      <LazyInView minHeight={HEIGHT} placeholder={<SkeletonBlock className="h-[240px] w-full rounded-xl" />}>
        <StarChart data={data} height={HEIGHT} />
      </LazyInView>
    </div>
  );
}
