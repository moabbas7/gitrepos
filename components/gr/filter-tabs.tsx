"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Pill tab group. The sliding underline is the ONLY Framer Motion (motion) usage in
 * the design system (DESIGN.md §4); it becomes instant under prefers-reduced-motion.
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
  const reduce = useReducedMotion();
  const group = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-hairline bg-canvas-sunken p-1",
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
              "relative h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-mute hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${group}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full border border-frame bg-surface-raised"
              >
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full [background:var(--gr-grad-brand)]" />
              </motion.span>
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
