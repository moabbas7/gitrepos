"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { FilterTabs } from "@/components/gr/filter-tabs";
import { MotionProvider } from "@/components/gr/motion-provider";
import { RepoCard } from "@/components/gr/repo-card";
import type { Period } from "@/lib/format";
import type { RepoCardData } from "@/lib/types";

const MULT: Record<Period, number> = { today: 1, week: 5.2, month: 17.5 };

/** Tabs with the shared-layoutId gradient underline + a filter transition on the list. */
export default function FeedDemo({ repos }: { repos: RepoCardData[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const list = repos.map((r) => ({ ...r, gained: Math.round(r.gained * MULT[period]) }));
  return (
    <MotionProvider>
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
        {/* Fixed min-height: swapping lists never shifts the page below. */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={period}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-3"
            >
              {list.slice(0, 2).map((r) => (
                <RepoCard key={r.id} repo={r} period={period} />
              ))}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionProvider>
  );
}
