"use client";

import { useEffect, useRef } from "react";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export type CountUpNotation = "grouped" | "compact";

/** Serializable formatting (props must cross the server → client boundary). */
export function formatCount(n: number, notation: CountUpNotation, prefix = "", suffix = ""): string {
  const v = Math.round(n);
  return `${prefix}${notation === "compact" ? compactNumber(v) : v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`;
}

/**
 * Counts a number up the first time it scrolls into view (requestAnimationFrame, no library).
 * The final value is rendered invisibly underneath to reserve width => no layout shift.
 * Server HTML shows the real value (SEO / no-JS). Numbers already on screen at load, and all
 * numbers under prefers-reduced-motion, are left as-is (no flicker).
 */
export function CountUp({
  value,
  notation = "grouped",
  prefix = "",
  suffix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  notation?: CountUpNotation;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const box = useRef<HTMLSpanElement | null>(null);
  const out = useRef<HTMLSpanElement | null>(null);
  const format = (n: number) => formatCount(n, notation, prefix, suffix);

  useEffect(() => {
    const el = box.current;
    const target = out.current;
    if (!el || !target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already visible: don't re-animate
    const fmt = (n: number) => formatCount(n, notation, prefix, suffix);
    target.textContent = fmt(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / (duration * 1000));
          target.textContent = fmt(value * easeOut(t));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      target.textContent = fmt(value);
    };
  }, [value, duration, notation, prefix, suffix]);

  return (
    <span ref={box} className={cn("relative inline-grid tabular-nums", className)}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {format(value)}
      </span>
      <span ref={out} aria-hidden className="col-start-1 row-start-1">
        {format(value)}
      </span>
    </span>
  );
}
