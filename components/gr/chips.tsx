import Link from "next/link";
import { accentFor, accentVar } from "@/lib/accents";
import { compactNumber, PERIOD_LABEL, type Period } from "@/lib/format";
import { languageColor } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { softAccentStyle } from "./badges";

/** Language: GitHub-colour dot + name. No fill (DESIGN.md §4). */
export function LanguageChip({ language, className }: { language: string | null; className?: string }) {
  if (!language) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-body", className)}>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full ring-1 ring-frame"
        style={{ backgroundColor: languageColor(language) }}
      />
      {language}
    </span>
  );
}

/** Topic tag with a stable rotating accent. Renders as a link when href is given. */
export function TopicTag({ topic, href, className }: { topic: string; href?: string; className?: string }) {
  const cls = cn(
    // 24px visual chip; padding-y on the link expands the hit area without changing layout.
    "inline-flex h-6 items-center rounded-full px-2.5 font-mono text-xs font-medium whitespace-nowrap transition-colors",
    className,
  );
  const style = softAccentStyle(accentVar(accentFor(topic)));
  const label = <>#{topic}</>;
  return href ? (
    <Link href={href} className={cn(cls, "hover:brightness-125")} style={style}>
      {label}
    </Link>
  ) : (
    <span className={cls} style={style}>
      {label}
    </span>
  );
}

/** Growth on a contrast-safe pill — never bare coloured text. */
export function GrowthPill({
  gained,
  period = "today",
  showPeriod = true,
  className,
}: {
  gained: number;
  period?: Period;
  showPeriod?: boolean;
  className?: string;
}) {
  const label = `+${compactNumber(gained)}${showPeriod ? ` ${PERIOD_LABEL[period]}` : ""}`;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border border-growth-border bg-growth-bg px-2.5 font-mono text-xs font-bold tabular-nums whitespace-nowrap text-growth-fg",
        className,
      )}
      aria-label={`${compactNumber(gained)} stars gained ${PERIOD_LABEL[period]}`}
    >
      <span aria-hidden>▲</span>
      <span aria-hidden>{label}</span>
    </span>
  );
}

/** Mono "owner/repo" — owner muted, repo bright. */
export function RepoName({ owner, name, className }: { owner: string; name: string; className?: string }) {
  return (
    <span className={cn("font-mono text-base font-semibold leading-tight break-all", className)}>
      <span className="text-mute">{owner}/</span>
      <span className="text-ink">{name}</span>
    </span>
  );
}

/** ⌘K style keycap in peach. */
export function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded-[5px] bg-peach px-1.5 font-mono text-[11px] font-semibold text-peach-ink">
      {children}
    </kbd>
  );
}
