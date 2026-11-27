"use client";

import { Hash, Search, Star, TrendingUp, Code2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { compactNumber } from "@/lib/format";
import { loadSearchIndex } from "@/lib/search/client";
import { searchIndex, type SearchIndex } from "@/lib/site-data/search-index";

/** /search?q= — the same static index and matcher as the ⌘K palette. */
export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [index, setIndex] = useState<SearchIndex | null>(null);

  useEffect(() => {
    loadSearchIndex().then(setIndex);
  }, []);

  const results = useMemo(() => (index ? searchIndex(index, query, 50) : []), [index, query]);

  return (
    <div className="min-h-[480px] space-y-6">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
        className="gr-glass flex h-14 max-w-xl items-center gap-3 rounded-2xl px-4 focus-within:outline-2 focus-within:outline-g1"
      >
        <Search aria-hidden className="size-5 text-fg/50" />
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories, topics, languages…"
          autoComplete="off"
          className="h-full flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg/50"
        />
      </form>
      <p role="status" className="font-mono text-xs text-fg/50">
        {!query.trim() ? "Type to search." : !index ? "Loading the index…" : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </p>
      <ul className="grid max-w-3xl gap-2">
        {results.map((h) => (
          <li key={h.href}>
            <Link href={h.href} prefetch={false} className="flex items-center gap-3 rounded-xl border border-fg/8 px-4 py-3 transition-colors hover:border-fg/16 hover:bg-fg/3">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-fg/8 bg-fg/3 text-fg/64">
                {h.kind === "repo" ? <Code2 className="size-4" /> : h.kind === "topic" ? <Hash className="size-4" /> : <TrendingUp className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[14px] text-fg">
                  {h.kind === "repo" ? `${h.owner}/${h.name}` : h.kind === "topic" ? `#${h.topic}` : h.name}
                </span>
                {h.kind === "repo" && h.description && <span className="block truncate text-[13px] text-fg/50">{h.description}</span>}
              </span>
              {h.kind === "repo" && (
                <span className="gr-num inline-flex shrink-0 items-center gap-1 text-xs text-fg/50">
                  <Star aria-hidden className="size-3.5" />
                  {compactNumber(h.stars)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
