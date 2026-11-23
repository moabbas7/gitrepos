"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts heavy, non-critical UI (charts, motion demos) only when it approaches the viewport.
 * The placeholder reserves the exact height, so mounting causes no layout shift, and the code
 * for `children` (typically a next/dynamic component) isn't downloaded until then.
 */
export function LazyInView({
  children,
  minHeight,
  rootMargin = "300px 0px",
  placeholder = null,
}: {
  children: ReactNode;
  minHeight: number;
  rootMargin?: string;
  placeholder?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // IntersectionObserver is universal in supported browsers; mount immediately if it's missing.
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setShow(true));
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return (
    <div ref={ref} style={{ minHeight }}>
      {show ? children : placeholder}
    </div>
  );
}
