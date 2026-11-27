"use client";

import type { Period } from "@/lib/format";
import type { RepoCardData } from "@/lib/types";
import { RepoCard } from "./repo-card";
import { Reveal } from "./reveal";

/**
 * Ranked list of RepoCards with the scroll fade-up. A client component on purpose: the page's
 * RSC payload then carries the compact card data (~0.4 KB each) instead of each card's rendered
 * element tree (~10 KB), which keeps prerendered pages small. HTML is still fully server-rendered.
 * Pass only the topic slugs these cards use (see `linkedTopics`).
 */
export function RepoList({
  items,
  period,
  topicPages,
  showRank = true,
}: {
  items: RepoCardData[];
  period: Period;
  topicPages?: readonly string[];
  showRank?: boolean;
}) {
  return (
    <Reveal as="ol" stagger className="grid gap-3">
      {items.map((r) => (
        <li key={r.id}>
          <RepoCard repo={r} period={period} topicPages={topicPages} showRank={showRank} />
        </li>
      ))}
    </Reveal>
  );
}
