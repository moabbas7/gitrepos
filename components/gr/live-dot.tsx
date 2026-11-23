"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/**
 * Pulsing gradient "live" dot + "updated X min ago". The relative time is computed on the client
 * (prerendered HTML would go stale) inside a fixed-width slot, so there's no layout shift.
 */
export function LiveDot({ updatedAt, label = "updated", className }: { updatedAt: string; label?: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-xs text-fg/50", className)}>
      <span className="gr-live-dot" aria-hidden />
      <span>
        {label}{" "}
        <time dateTime={updatedAt} className="inline-block min-w-[9ch]">
          {now === null ? "recently" : ago(updatedAt, now)}
        </time>
      </span>
    </span>
  );
}
