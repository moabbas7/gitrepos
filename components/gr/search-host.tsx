"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { loadSearchIndex, OPEN_SEARCH_EVENT } from "@/lib/search/client";

// The palette (Radix Dialog + matcher) is only downloaded the first time search opens.
const CommandPalette = dynamic(() => import("./command-palette"), { ssr: false });

/** Mounted once in the layout: ⌘K / Ctrl+K / "/" open search; trigger buttons dispatch an event. */
export function SearchHost() {
  const [state, setState] = useState<{ open: boolean; query: string; mounted: boolean }>({ open: false, query: "", mounted: false });

  useEffect(() => {
    const open = (query = "") => {
      void loadSearchIndex();
      setState({ open: true, query, mounted: true });
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    };
    const onEvent = (e: Event) => open((e as CustomEvent<{ query?: string }>).detail?.query ?? "");
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onEvent);
    };
  }, []);

  if (!state.mounted) return null;
  return <CommandPalette open={state.open} initialQuery={state.query} onOpenChange={(open) => setState((s) => ({ ...s, open }))} />;
}
