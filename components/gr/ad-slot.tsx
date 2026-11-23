import { cn } from "@/lib/utils";

/** Fixed heights reserved for future ad units (zero CLS when ads are enabled later). */
export const AD_SLOT_HEIGHTS = { feed: 250, sidebar: 600, inline: 280 } as const;
export type AdSlotKind = keyof typeof AD_SLOT_HEIGHTS;

/**
 * Placeholder for AdSense. Intentionally renders an empty, fixed-height box and
 * nothing else — no script, no label. AdSense is wired up in a later prompt behind
 * ADSENSE_ENABLED. Pass `reserve={false}` to collapse it entirely.
 */
export function AdSlot({ kind, reserve = true, className }: { kind: AdSlotKind; reserve?: boolean; className?: string }) {
  if (!reserve) return null;
  return (
    <div
      aria-hidden
      data-ad-slot={kind}
      className={cn("w-full", className)}
      style={{ height: AD_SLOT_HEIGHTS[kind] }}
    />
  );
}
