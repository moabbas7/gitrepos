"use client";

import { useRef, type ElementType, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { allowsPointerFx } from "./use-fine-pointer";

/**
 * Card frame with a cursor spotlight: a radial gradient glow layer that is *translated* to the
 * pointer (transform only), plus a gradient border that fades in on hover (opacity only).
 * Pointer effects run on fine pointers only and never under reduced motion.
 */
export function SpotlightCard({
  as: Tag = "div",
  className,
  children,
  ringHover = true,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  ringHover?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const spot = useRef<HTMLSpanElement | null>(null);

  const move = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    const s = spot.current;
    if (!el || !s || !allowsPointerFx()) return;
    const r = el.getBoundingClientRect();
    s.style.setProperty("--spot-x", `${e.clientX - r.left - 180}px`);
    s.style.setProperty("--spot-y", `${e.clientY - r.top - 180}px`);
    el.setAttribute("data-spot-active", "");
  };
  const leave = () => ref.current?.removeAttribute("data-spot-active");

  return (
    <Tag
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn("gr-glass relative isolate overflow-hidden", ringHover && "gr-ring-hover", className)}
    >
      <span ref={spot} aria-hidden className="gr-spot -z-10" />
      {children}
    </Tag>
  );
}
