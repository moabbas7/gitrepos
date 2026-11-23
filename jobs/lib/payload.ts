import type { RankedList } from "./rank-core";

/** Keep each rankings payload well under D1's 100 KB statement / 2 MB value limits. */
export const MAX_PAYLOAD_BYTES = 90_000;

/** JSON payload for a list, trimming the tail until it fits. Returns the JSON and item count. */
export function fitPayload(list: RankedList, maxBytes = MAX_PAYLOAD_BYTES): { json: string; count: number } {
  let items = list.items;
  let json = JSON.stringify(items);
  while (json.length > maxBytes && items.length > 1) {
    items = items.slice(0, Math.floor(items.length * 0.9));
    json = JSON.stringify(items);
  }
  return { json, count: items.length };
}
