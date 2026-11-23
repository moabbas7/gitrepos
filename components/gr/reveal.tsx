"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type ElementType, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveal: fades children up (opacity + transform only) the first time the group enters the
 * viewport, with an optional stagger. Content is only hidden when JS runs (`.js` on <html>), and is
 * always visible under prefers-reduced-motion. Sparklines inside also draw in.
 *
 *   <Reveal stagger className="grid gap-3">{cards}</Reveal>   // each child fades up in turn
 *   <Reveal>{block}</Reveal>                                   // the whole block fades up
 */
export function Reveal({
  children,
  stagger = false,
  as: Tag = "div",
  className,
  threshold = 0.15,
}: {
  children: ReactNode;
  stagger?: boolean;
  as?: ElementType;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-shown", "");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.setAttribute("data-shown", "");
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const items = stagger
    ? Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child;
        const c = child as ReactElement<{ className?: string; style?: CSSProperties }>;
        return cloneElement(c, {
          className: cn(c.props.className, "gr-reveal-item"),
          style: { ...c.props.style, ["--i" as string]: Math.min(i, 12) },
        });
      })
    : children;

  return (
    <Tag ref={ref} data-reveal="" className={cn(!stagger && "gr-reveal-item", className)}>
      {items}
    </Tag>
  );
}
