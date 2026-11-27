/** Browser-side access to the static search index (one fetch per page view, shared). */
import type { SearchIndex } from "@/lib/site-data/search-index";

let pending: Promise<SearchIndex | null> | null = null;

export function loadSearchIndex(): Promise<SearchIndex | null> {
  if (!pending) {
    pending = fetch("/search-index.json")
      .then((r) => (r.ok ? (r.json() as Promise<SearchIndex>) : null))
      .catch(() => {
        pending = null;
        return null;
      });
  }
  return pending;
}

export const OPEN_SEARCH_EVENT = "gr:open-search";
export function openSearch(query = "") {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: { query } }));
}
