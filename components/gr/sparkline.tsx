import { cn } from "@/lib/utils";
import { GRAD } from "./svg-defs";

/**
 * Inline-SVG sparkline (no chart library, zero JS). Gradient stroke; draws in when an ancestor
 * <Reveal> enters the viewport (stroke-dashoffset via CSS). Decorative: numbers are shown as text.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return <svg aria-hidden width={width} height={height} className={className} />;
  }
  const pad = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, pad + (height - pad * 2) * (1 - (v - min) / span)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;

  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)}>
      <path d={area} fill={`url(#${GRAD.area})`} className="gr-spark-area" />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke={`url(#${GRAD.h})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gr-spark-line"
      />
    </svg>
  );
}
