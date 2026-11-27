"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { PAGE_SIZE, type FeedProps } from "@/lib/feed";
import type { ListType, RankPeriod, RepoCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdSlot } from "./ad-slot";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { FilterTabs } from "./filter-tabs";
import { LiveDot } from "./live-dot";
import { ReadinessNote } from "./readiness-note";
import { RepoCard } from "./repo-card";
import { RepoCardSkeleton } from "./skeletons";

const LIST_LABEL: Record<ListType, string> = { trending: "Trending", rising: "Rising", new: "New" };
const PERIOD_OPTIONS: { value: RankPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

/** Static list files emitted at build (scripts/emit-static.tsx). Cached per page view. */
const cache = new Map<string, Promise<RepoCardData[]>>();
function loadList(t: ListType, p: RankPeriod, l: string): Promise<RepoCardData[]> {
  const key = `${t}-${p}-${l}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/lists/${key}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<{ items: RepoCardData[] }>) : { items: [] }))
        .then((j: { items: RepoCardData[] }) => j.items ?? [])
        .catch(() => {
          cache.delete(key);
          return [];
        }),
    );
  }
  return cache.get(key)!;
}

function emptyCopy(t: ListType, p: RankPeriod, langName: string | null): string {
  const where = langName ? ` in ${langName}` : "";
  if (t === "new") return `No new repositories${where} are gaining stars ${p === "today" ? "today" : `this ${p}`} yet.`;
  if (t === "rising") return `No rising repositories${where} for this period yet.`;
  return `No trending repositories${where} for this period yet.`;
}

export function Feed(props: FeedProps) {
  const { initialItems, initialTotal, languages, topicPages, readiness, listTabs = true, languageFilter = true, adsEnabled = false } = props;
  const [listType, setListType] = useState(props.listType);
  const [period, setPeriod] = useState(props.period);
  const [language, setLanguage] = useState(props.language);
  const [items, setItems] = useState<RepoCardData[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [visible, setVisible] = useState(Math.min(PAGE_SIZE, initialItems.length));
  const [loading, setLoading] = useState(false);
  const selectId = useId();
  const req = useRef(0);
  const first = useRef(true);

  // Switching tab/language: fetch that list's static JSON.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = ++req.current;
    setLoading(true);
    loadList(listType, period, language).then((list) => {
      if (id !== req.current) return;
      setItems(list);
      setTotal(list.length);
      setVisible(Math.min(PAGE_SIZE, list.length));
      setLoading(false);
    });
  }, [listType, period, language]);

  const loadMore = async () => {
    const next = visible + PAGE_SIZE;
    if (items.length < Math.min(total, next)) {
      setLoading(true);
      const list = await loadList(listType, period, language);
      setItems(list);
      setTotal(list.length);
      setLoading(false);
    }
    setVisible(next);
  };

  const langName = language === "all" ? null : (languages.find((l) => l.slug === language)?.name ?? language);
  const ready = readiness[period];
  const shown = items.slice(0, visible);

  return (
    <section aria-labelledby={props.labelledBy} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {listTabs && (
          <FilterTabs<ListType>
            label="List"
            value={listType}
            onChange={setListType}
            options={(Object.keys(LIST_LABEL) as ListType[]).map((v) => ({ value: v, label: LIST_LABEL[v] }))}
          />
        )}
        <FilterTabs<RankPeriod> label="Period" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        {languageFilter && languages.length > 0 && (
          <div className="relative">
            <label htmlFor={selectId} className="sr-only">
              Language
            </label>
            <select
              id={selectId}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-11 appearance-none rounded-full border border-fg/8 bg-fg/3 py-0 pr-10 pl-4 font-mono text-[13px] text-fg transition-colors hover:border-fg/16 focus-visible:outline-2 focus-visible:outline-g1"
            >
              <option value="all" className="bg-bg">
                All languages
              </option>
              {languages.map((l) => (
                <option key={l.slug} value={l.slug} className="bg-bg">
                  {l.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg/50" />
          </div>
        )}
        {props.computedAt && <LiveDot updatedAt={props.computedAt} className="ml-auto" />}
      </div>

      {ready.note && <ReadinessNote note={ready.note} progress={ready.progress} />}

      <p className="sr-only" role="status">
        {loading ? "Loading repositories" : `Showing ${shown.length} of ${total} repositories`}
      </p>
      <div aria-busy={loading} className="min-h-[640px]">
        {loading && !shown.length ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <RepoCardSkeleton key={i} />
            ))}
          </div>
        ) : shown.length ? (
          <ol className={cn("grid gap-3 transition-opacity duration-300", loading && "opacity-60")}>
            {shown.map((r, i) => (
              <Fragment key={`${listType}-${period}-${language}-${r.id}`}>
                <li>
                  <RepoCard repo={r} period={period} topicPages={topicPages} crown={listType === "trending"} />
                </li>
                {/* Ad positions: after #4, then every 7th. Collapsed until AdSense is enabled. */}
                {(i === 3 || (i > 3 && (i - 3) % 7 === 0)) && i < shown.length - 1 && adsEnabled && (
                  <li aria-hidden>
                    <AdSlot kind="feed" />
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        ) : (
          <EmptyState eyebrow={ready.note ? "Collecting star history" : "Nothing here yet"} title={emptyCopy(listType, period, langName)}>
            {ready.note
              ? "Lists fill in as star history builds up. Check back soon; we re-rank every hour."
              : "We re-rank every hour, so check back soon or try another period or language."}
          </EmptyState>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {visible < total && (
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            Load more repositories
          </Button>
        )}
        {languageFilter && langName && (
          <Button variant="ghost" asChild>
            <Link href={`/language/${language}`}>All trending {langName} repositories →</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
