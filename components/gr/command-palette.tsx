"use client";

import { Code2, Hash, Search, Star, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useId, useMemo, useState } from "react";
import { compactNumber } from "@/lib/format";
import { loadSearchIndex } from "@/lib/search/client";
import { searchIndex, type SearchHit, type SearchIndex } from "@/lib/site-data/search-index";
import { cn } from "@/lib/utils";

const QUICK: SearchHit[] = [
  { kind: "language", slug: "", name: "Trending today", href: "/" },
  { kind: "language", slug: "", name: "Rising repositories", href: "/rising" },
  { kind: "language", slug: "", name: "New repositories", href: "/new" },
  { kind: "language", slug: "", name: "Weekly digests", href: "/digests" },
];

function hitLabel(h: SearchHit): string {
  return h.kind === "repo" ? `${h.owner}/${h.name}` : h.kind === "topic" ? `#${h.topic}` : h.name;
}

/** ⌘K palette: client-side search over the static index (no runtime queries). Lazy-loaded. */
export default function CommandPalette({
  open,
  initialQuery,
  onOpenChange,
}: {
  open: boolean;
  initialQuery: string;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadSearchIndex().then((ix) => {
      if (!alive) return;
      if (ix) setIndex(ix);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const langs: SearchHit[] = (index?.l ?? []).slice(0, 6).map(([slug, name]) => ({ kind: "language", slug, name, href: `/language/${slug}` }));
      return [...QUICK, ...langs];
    }
    return index ? searchIndex(index, query, 12) : [];
  }, [index, query]);

  const go = (h: SearchHit | undefined) => {
    if (!h) return;
    onOpenChange(false);
    router.push(h.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
      else if (query.trim()) {
        onOpenChange(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const empty = query.trim() && index && !results.length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="gr-glass fixed inset-x-0 top-[12vh] z-50 mx-auto w-[calc(100%-32px)] max-w-[640px] overflow-hidden rounded-2xl bg-bg/90 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search GitRepos</Dialog.Title>
          <Dialog.Description className="sr-only">Search repositories, topics and languages. Use the arrow keys to move and Enter to open.</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-fg/8 px-4">
            <Search aria-hidden className="size-5 shrink-0 text-fg/50" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search repositories, topics, languages…"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results[active] ? optionId(active) : undefined}
              aria-label="Search"
              className="h-14 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg/50"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden rounded-[6px] border border-fg/10 bg-fg/6 px-1.5 font-mono text-[11px] text-fg/64 sm:inline">esc</kbd>
          </div>
          <div className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
            {!query.trim() && <p className="gr-eyebrow px-3 pt-2 pb-1">Jump to</p>}
            <ul id={listId} role="listbox" aria-label="Results">
              {results.map((h, i) => (
                <li
                  key={`${h.href}-${i}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(h)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", i === active && "bg-fg/6")}
                >
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-fg/8 bg-fg/3 text-fg/64">
                    {h.kind === "repo" ? <Code2 className="size-4" /> : h.kind === "topic" ? <Hash className="size-4" /> : <TrendingUp className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[14px] text-fg">{hitLabel(h)}</span>
                    {h.kind === "repo" && h.description && <span className="block truncate text-[13px] text-fg/50">{h.description}</span>}
                  </span>
                  {h.kind === "repo" && (
                    <span className="gr-num inline-flex shrink-0 items-center gap-1 text-xs text-fg/50">
                      <Star aria-hidden className="size-3.5" />
                      {compactNumber(h.stars)}
                    </span>
                  )}
                  {h.kind === "topic" && <span className="gr-num shrink-0 text-xs text-fg/50">{h.count} repos</span>}
                  {h.kind === "language" && h.slug && <span className="shrink-0 font-mono text-xs text-fg/50">language</span>}
                </li>
              ))}
            </ul>
            {empty && <p className="px-3 py-8 text-center text-sm text-fg/64">No repositories, topics or languages match “{query.trim()}”.</p>}
            {query.trim() && !index && !failed && <p className="px-3 py-8 text-center text-sm text-fg/50">Loading the index…</p>}
            {failed && <p className="px-3 py-8 text-center text-sm text-fg/64">Search is unavailable right now. Please try again.</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
