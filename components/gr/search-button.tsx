"use client";

import { Search } from "lucide-react";
import { loadSearchIndex, openSearch } from "@/lib/search/client";
import { cn } from "@/lib/utils";
import { Keycap } from "./chips";

/** Opens the command palette. `hero` looks like a large search field; `header` is compact. */
export function SearchButton({ variant = "header", className }: { variant?: "header" | "hero"; className?: string }) {
  const warm = () => void loadSearchIndex();
  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={() => openSearch()}
        onPointerEnter={warm}
        onFocus={warm}
        className={cn(
          "gr-glass gr-ring-hover group flex h-14 w-full items-center gap-3 rounded-2xl px-5 text-left text-[15px] text-fg/50 transition-colors hover:text-fg/64 focus-visible:outline-2 focus-visible:outline-g1",
          className,
        )}
      >
        <Search aria-hidden className="size-5 shrink-0 text-fg/64" />
        <span className="flex-1 truncate">Search repositories, topics and languages</span>
        <span className="hidden items-center gap-1 sm:inline-flex" aria-hidden>
          <Keycap>⌘</Keycap>
          <Keycap>K</Keycap>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      onPointerEnter={warm}
      onFocus={warm}
      aria-label="Search (⌘K)"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-fg/8 bg-fg/3 px-3 text-[13px] text-fg/64 transition-colors hover:border-fg/16 hover:text-fg md:min-w-[200px] md:px-3.5",
        className,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="hidden flex-1 text-left md:inline">Search…</span>
      <span className="hidden items-center gap-1 md:inline-flex" aria-hidden>
        <Keycap>⌘K</Keycap>
      </span>
    </button>
  );
}
