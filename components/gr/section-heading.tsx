import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** DESIGN.md §9.2: mono eyebrow → Geist heading → white/64 lead. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: H = "h2",
  className,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn("max-w-2xl space-y-3", className)}>
      {eyebrow && <p className="gr-eyebrow">{eyebrow}</p>}
      <H className={H === "h1" ? "text-[34px] leading-[1.08] tracking-[-0.035em] sm:text-[44px]" : "text-[24px] leading-[1.15] tracking-[-0.025em] sm:text-[28px]"}>
        {title}
      </H>
      {lead && <p className="text-[16px] leading-relaxed text-fg/64 sm:text-[17px]">{lead}</p>}
      {children}
    </header>
  );
}
