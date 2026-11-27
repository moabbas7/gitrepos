import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Honest, designed empty/partial state: dashed hairline frame, mono eyebrow, short copy. */
export function EmptyState({
  eyebrow = "Nothing here yet",
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-dashed border-fg/10 px-6 py-10 text-center sm:px-10", className)}>
      <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full opacity-25 blur-3xl [background:var(--gr-grad)]" />
      <p className="gr-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-md font-heading text-lg font-semibold tracking-[-0.015em] text-fg">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg/64">{children}</div>}
    </div>
  );
}
