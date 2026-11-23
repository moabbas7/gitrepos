"use client";

/** True when the device has a precise hovering pointer and the user allows motion. */
export function allowsPointerFx(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
