import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Level-1 glass tile: white/50 mono caption over a mono number (DESIGN.md §5: numbers tabular). */
export function StatTile({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("gr-glass flex min-h-[92px] flex-col justify-between gap-2 rounded-2xl p-4 sm:p-5", className)}>
      <dt className="gr-eyebrow">{label}</dt>
      <dd className="gr-num text-[22px] font-medium leading-none tracking-[-0.01em] text-fg sm:text-[26px]">{children}</dd>
      {hint && <dd className="font-mono text-[11px] text-fg/50">{hint}</dd>}
    </div>
  );
}
