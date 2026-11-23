import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Slow animated gradient aurora (pure CSS transforms; static under reduced motion). */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("gr-aurora -z-10", className)}>
      <span />
      <span />
      <span />
    </div>
  );
}

/** Gradient word(s) with a gentle sheen. Use at display sizes only (≥ 24px). */
export function GradientText({ children, shimmer = true, className }: { children: ReactNode; shimmer?: boolean; className?: string }) {
  return <span className={cn("gr-grad-text", shimmer && "gr-shimmer", className)}>{children}</span>;
}

/**
 * Word-by-word headline reveal (CSS only, so it runs before hydration and doesn't delay LCP).
 * `parts` may mix strings and nodes (e.g. <GradientText>); strings are split into words.
 */
export function WordReveal({ parts, className }: { parts: ReactNode[]; className?: string }) {
  let w = 0;
  const words: ReactNode[] = [];
  parts.forEach((p, pi) => {
    if (typeof p === "string") {
      p.split(/(\s+)/).forEach((tok, ti) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) words.push(<Fragment key={`${pi}-${ti}`}> </Fragment>);
        else
          words.push(
            <span key={`${pi}-${ti}`} className="gr-word" style={{ ["--w" as string]: w++ }}>
              {tok}
            </span>,
          );
      });
    } else {
      words.push(
        <span key={pi} className="gr-word" style={{ ["--w" as string]: w++ }}>
          {p}
        </span>,
      );
    }
  });
  return <span className={className}>{words}</span>;
}
