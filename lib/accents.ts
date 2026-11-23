/** Rotating accent palette — only for topic tags, badges and sponsor cards (DESIGN.md §2). */
export const ACCENTS = ["cyan", "violet", "magenta", "amber", "lime", "peach"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Stable accent for a string (e.g. a topic name) so #rust always looks the same. */
export function accentFor(key: string): Accent {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ACCENTS[(h >>> 0) % ACCENTS.length];
}

/** CSS variable for an accent; components derive fill/border via color-mix. */
export function accentVar(a: Accent): string {
  return `var(--gr-accent-${a})`;
}
