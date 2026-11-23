"use client";

import { useEffect, useState, type ReactNode } from "react";

// Page transitions: templates re-mount on every navigation. The first render (initial page load)
// is not animated, so the LCP element paints immediately; later client navigations fade + rise.
let hasNavigated = false;

export default function Template({ children }: { children: ReactNode }) {
  const [animate] = useState(() => hasNavigated);
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return <div className={animate ? "gr-page-enter flex flex-1 flex-col" : "flex flex-1 flex-col"}>{children}</div>;
}
