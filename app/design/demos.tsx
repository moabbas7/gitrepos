"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FilterTabs } from "@/components/gr/filter-tabs";
import { RepoCard } from "@/components/gr/repo-card";
import { SkeletonBlock } from "@/components/gr/skeletons";
import type { Period } from "@/lib/format";
import type { RepoCardData } from "@/lib/types";
import type { StarPoint } from "@/components/gr/star-chart";

const StarChart = dynamic(() => import("@/components/gr/star-chart"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[240px] w-full" />,
});

export function StarChartDemo({ data }: { data: StarPoint[] }) {
  return <StarChart data={data} />;
}

const MULT: Record<Period, number> = { today: 1, week: 5.2, month: 17.5 };

/** Period tabs + a filter transition on the list (motion, reduced-motion aware). */
export function FeedDemo({ repos }: { repos: RepoCardData[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const reduce = useReducedMotion();
  const list = repos.map((r) => ({ ...r, gained: Math.round(r.gained * MULT[period]) }));
  return (
    <div className="space-y-4">
      <FilterTabs
        label="Period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
        ]}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={period}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          className="grid gap-3"
        >
          {list.slice(0, 2).map((r) => (
            <RepoCard key={r.id} repo={r} period={period} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
