import { Flame, Sparkles, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { accentVar, type Accent } from "@/lib/accents";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-mono text-[11px] font-bold uppercase tracking-wider leading-none whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0";

/** Soft accent chip: accent text, 12% fill, 35% border. */
export function softAccentStyle(color: string): CSSProperties {
  return {
    color,
    backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
  };
}

export type BadgeKind = "trending" | "new" | "hot" | "sponsored";

export function Badge({ kind, className, children }: { kind: BadgeKind; className?: string; children?: ReactNode }) {
  switch (kind) {
    case "trending":
      return (
        <span className={cn(base, "text-white [background:var(--gr-grad-strong)]", className)}>
          <TrendingUp aria-hidden />
          {children ?? "Trending"}
        </span>
      );
    case "new":
      return (
        <span className={cn(base, className)} style={softAccentStyle("var(--gr-accent-cyan)")}>
          <Sparkles aria-hidden />
          {children ?? "New"}
        </span>
      );
    case "hot":
      return (
        <span className={cn(base, className)} style={softAccentStyle("var(--gr-hot)")}>
          <Flame aria-hidden />
          {children ?? "Hot"}
        </span>
      );
    case "sponsored":
      return <span className={cn(base, "bg-peach text-peach-ink", className)}>{children ?? "Sponsored"}</span>;
  }
}

/** Generic accent badge for misc labels (e.g. "Rising", "Gem"). */
export function AccentBadge({ accent, children, className }: { accent: Accent; children: ReactNode; className?: string }) {
  return (
    <span className={cn(base, className)} style={softAccentStyle(accentVar(accent))}>
      {children}
    </span>
  );
}
