"use client";

import { m } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { MotionProvider } from "./motion-provider";

/**
 * Pill tab group with a sliding gradient underline shared via `layoutId`. Carries its own
 * MotionProvider (lazy-loaded features), so pages without tabs ship no motion code.
 * Instant under prefers-reduced-motion (MotionConfig reducedMotion="user").
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const group = useId();
  return (
    <MotionProvider>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-fg/8 bg-fg/3 p-1",
          className,
        )}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "relative h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-offset-0",
                active ? "text-fg" : "text-fg/50 hover:text-fg",
              )}
            >
              {active && (
                <m.span
                  layoutId={`tab-${group}`}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  className="absolute inset-0 rounded-full bg-fg/6 shadow-[inset_0_0_0_1px_rgb(250_250_250/0.08)]"
                >
                  <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full shadow-[0_0_12px_rgb(97_43_251/0.8)] [background:var(--gr-grad)]" />
                </m.span>
              )}
              <span className="relative">{o.label}</span>
            </button>
          );
        })}
      </div>
    </MotionProvider>
  );
}
