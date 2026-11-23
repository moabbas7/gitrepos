/**
 * @deprecated GitRepos v2 has exactly three colours (DESIGN.md) and no rotating accents.
 * The `Accent` type is kept so component props (AccentBadge, SponsorCard) stay compatible;
 * the value is ignored when rendering.
 */
export const ACCENTS = ["cyan", "violet", "magenta", "amber", "lime", "peach"] as const;
export type Accent = (typeof ACCENTS)[number];

/** Stable pick for a string. Kept for compatibility; v2 renders every accent neutrally. */
export function accentFor(key: string): Accent {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ACCENTS[(h >>> 0) % ACCENTS.length];
}
