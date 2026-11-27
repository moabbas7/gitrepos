import { cn } from "@/lib/utils";

/** Slim inline note for a period that's still collecting star history (early days). */
export function ReadinessNote({ note, progress, className }: { note: string; progress: number; className?: string }) {
  const pct = Math.max(4, Math.min(100, Math.round(progress * 100)));
  return (
    <div role="note" className={cn("flex items-start gap-3 rounded-xl border border-fg/8 bg-fg/3 px-4 py-3 text-[13px] leading-relaxed text-fg/64", className)}>
      <span aria-hidden className="gr-live-dot mt-1.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p>{note}</p>
        <div aria-hidden className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-fg/6">
          <div className="h-full origin-left rounded-full [background:var(--gr-grad)]" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
    </div>
  );
}
