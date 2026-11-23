import Link from "next/link";
import { useId, type ReactNode } from "react";
import { compactNumber, PERIOD_LABEL, type Period } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Language: mono text only — no coloured dot (DESIGN.md §4). */
export function LanguageChip({ language, className }: { language: string | null; className?: string }) {
  if (!language) return null;
  return <span className={cn("font-mono text-xs text-fg/50", className)}>{language}</span>;
}

/** Topic tag: outlined at white/10. Renders as a link when href is given. */
export function TopicTag({ topic, href, className }: { topic: string; href?: string; className?: string }) {
  const cls = cn(
    "inline-flex h-6 items-center rounded-full border border-fg/10 px-2.5 font-mono text-xs text-fg/64 whitespace-nowrap transition-colors",
    href && "hover:border-fg/16 hover:text-fg",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      #{topic}
    </Link>
  ) : (
    <span className={cls}>#{topic}</span>
  );
}

/** Small upward arrow filled with the brand gradient. */
export function GradientArrow({ size = 9, className }: { size?: number; className?: string }) {
  const id = `ga${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 10 10" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="var(--gr-g1)" />
          <stop offset="0.5" stopColor="var(--gr-g2)" />
          <stop offset="1" stopColor="var(--gr-g3)" />
        </linearGradient>
      </defs>
      <path d="M5 0.8 L9.6 9.2 L0.4 9.2 Z" fill={`url(#${id})`} />
    </svg>
  );
}

/** Growth: white mono number with a small gradient arrow, on a hairline pill. */
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
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-fg/8 bg-fg/3 px-2.5 font-mono text-xs font-medium tabular-nums whitespace-nowrap text-fg",
        className,
      )}
    >
      <span className="sr-only">{`${compactNumber(gained)} stars gained ${PERIOD_LABEL[period]}`}</span>
      <GradientArrow />
      <span aria-hidden>
        +{compactNumber(gained)}
        {showPeriod && <span className="text-fg/50"> {PERIOD_LABEL[period]}</span>}
      </span>
    </span>
  );
}

/** Mono "owner/repo" — owner at white/50, repo in white. */
export function RepoName({ owner, name, className }: { owner: string; name: string; className?: string }) {
  return (
    <span className={cn("font-mono text-[15px] font-medium leading-tight break-all", className)}>
      <span className="text-fg/50">{owner}/</span>
      <span className="text-fg">{name}</span>
    </span>
  );
}

/** ⌘K style keycap. */
export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded-[6px] border border-fg/10 bg-fg/6 px-1.5 font-mono text-[11px] font-medium text-fg/64">
      {children}
    </kbd>
  );
}
