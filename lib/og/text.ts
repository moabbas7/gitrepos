/**
 * OG text safety (pure; unit-tested). The OG renderer (satori via next/og) only has our bundled
 * Latin fonts. Any other character (Arabic, CJK, emoji, symbols) makes it download fonts from
 * Google mid-build — slow, flaky (HTTP 400s) and it has crashed the build on some scripts.
 * So OG text is reduced to characters in the bundled @fontsource "latin" subset.
 */

// @fontsource latin unicode-range (Geist / JetBrains Mono), minus invisible/bidi controls.
const LATIN_RANGES: [number, number][] = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ff],
  [0x0131, 0x0131],
  [0x0152, 0x0153],
  [0x02bb, 0x02bc],
  [0x02c6, 0x02c6],
  [0x02da, 0x02da],
  [0x02dc, 0x02dc],
  [0x2010, 0x2027], // dashes, quotes, bullet, ellipsis
  [0x2030, 0x205e],
  [0x20ac, 0x20ac],
  [0x2122, 0x2122],
  [0x2191, 0x2191],
  [0x2193, 0x2193],
  [0x2212, 0x2212],
];

export function isOgSafeChar(cp: number): boolean {
  for (const [a, b] of LATIN_RANGES) if (cp >= a && cp <= b) return true;
  return false;
}

/** Keeps only renderable characters and tidies whitespace. */
export function ogSafe(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) out += isOgSafeChar(ch.codePointAt(0)!) ? ch : " ";
  return out
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[\s\-–—:|·,.]+|[\s\-–—:|·,]+$/g, "")
    .trim();
}

/**
 * For free text (descriptions): returns null when too much was unrenderable to still read well
 * (e.g. a mostly Arabic or Chinese description) — the image then simply omits it.
 */
export function ogSafeText(s: string | null, minKept = 0.6): string | null {
  if (!s) return null;
  const original = s.replace(/\s+/g, "");
  if (!original.length) return null;
  const safe = ogSafe(s);
  const kept = safe.replace(/\s+/g, "").length / [...original].length;
  return safe.length >= 3 && kept >= minKept ? safe : null;
}
