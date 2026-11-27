/**
 * Brand gradients defined ONCE per page (rendered in the root layout) and referenced by id from
 * every small SVG (growth arrows, badge glyphs, sparklines). Per-SVG <defs> used to add ~0.5 KB
 * per icon to every prerendered page. Not display:none — browsers skip gradients defined there.
 */
export const GRAD = {
  h: "gr-grad-h", // left → right
  up: "gr-grad-up", // bottom-left → top-right
  down: "gr-grad-down", // top-left → bottom-right
  area: "gr-grad-area", // vertical fade for sparkline fills
} as const;

const stops = (
  <>
    <stop offset="0" stopColor="var(--gr-g1)" />
    <stop offset="0.5" stopColor="var(--gr-g2)" />
    <stop offset="1" stopColor="var(--gr-g3)" />
  </>
);

export function SvgDefs() {
  return (
    <svg aria-hidden width="0" height="0" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id={GRAD.h} x1="0" x2="1" y1="0" y2="0">
          {stops}
        </linearGradient>
        <linearGradient id={GRAD.up} x1="0" x2="1" y1="1" y2="0">
          {stops}
        </linearGradient>
        <linearGradient id={GRAD.down} x1="0" x2="1" y1="0" y2="1">
          {stops}
        </linearGradient>
        <linearGradient id={GRAD.area} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--gr-g2)" stopOpacity={0.22} />
          <stop offset="1" stopColor="var(--gr-g2)" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}
