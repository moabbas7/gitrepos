import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Long-form text column for content pages (methodology, about, legal). */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[680px] space-y-5 text-[15px] leading-[1.75] text-fg/64",
        "[&_h2]:pt-6 [&_h2]:text-[22px] [&_h2]:leading-tight [&_h2]:tracking-[-0.025em]",
        "[&_h3]:pt-2 [&_h3]:text-[17px] [&_h3]:tracking-[-0.015em]",
        "[&_strong]:font-medium [&_strong]:text-fg",
        "[&_a]:text-fg [&_a]:underline [&_a]:decoration-fg/28 [&_a]:underline-offset-4 hover:[&_a]:decoration-fg",
        "[&_code]:rounded-md [&_code]:border [&_code]:border-fg/8 [&_code]:bg-fg/3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-fg",
        "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_li]:marker:text-fg/28",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Marked placeholder the owner must fill in before launch (legal details). */
export function Placeholder({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-fg/6 px-1 font-mono text-[13px] text-fg">[{children}]</mark>;
}
