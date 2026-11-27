import type { CSSProperties, ReactNode } from "react";
import type { Accent } from "@/lib/accents";
import { cn } from "@/lib/utils";
import { GRAD } from "./svg-defs";

const base =
  "inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] leading-none whitespace-nowrap";

/** @deprecated v2 has no accent colours; kept so existing callers compile. Returns neutral outline styles. */
export function softAccentStyle(_color?: string): CSSProperties {
  void _color;
  return { color: "var(--gr-fg-64)", border: "1px solid var(--gr-fg-10)" };
}

/** Tiny gradient glyphs (the only colour on secondary badges). */
function GradGlyph({ d, size = 9 }: { d: string; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 10 10" className="shrink-0">
      <path d={d} fill={`url(#${GRAD.down})`} />
    </svg>
  );
}

const SPARK = "M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z";
const UP = "M5 1 L9.5 9 L0.5 9 Z";

export type BadgeKind = "trending" | "new" | "hot" | "sponsored";

export function Badge({ kind, className, children }: { kind: BadgeKind; className?: string; children?: ReactNode }) {
  switch (kind) {
    case "trending":
      return (
        <span
          className={cn(
            base,
            "relative text-fg shadow-[0_0_16px_-2px_rgb(97_43_251/0.55)] [background:var(--gr-grad-veiled)]",
            className,
          )}
        >
          <span aria-hidden>#1</span>
          {children ?? "Trending"}
        </span>
      );
    case "new":
      return (
        <span className={cn(base, "border border-fg/10 text-fg/64", className)}>
          <GradGlyph d={SPARK} />
          {children ?? "New"}
        </span>
      );
    case "hot":
      return (
        <span className={cn(base, "border border-fg/10 text-fg/64", className)}>
          <GradGlyph d={UP} />
          {children ?? "Hot"}
        </span>
      );
    case "sponsored":
      return <span className={cn(base, "border border-fg/10 text-fg/50", className)}>{children ?? "Sponsored"}</span>;
  }
}

/** Generic label badge. `accent` is accepted for compatibility; v2 renders every label neutrally. */
export function AccentBadge({ accent, children, className }: { accent: Accent; children: ReactNode; className?: string }) {
  return (
    <span data-accent={accent} className={cn(base, "border border-fg/10 text-fg/64", className)}>
      {children}
    </span>
  );
}
