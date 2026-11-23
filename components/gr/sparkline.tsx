import { useId } from "react";
import { cn } from "@/lib/utils";

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
  const id = useId().replace(/:/g, "");
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
      <defs>
        <linearGradient id={`s${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--gr-g1)" />
          <stop offset="50%" stopColor="var(--gr-g2)" />
          <stop offset="100%" stopColor="var(--gr-g3)" />
        </linearGradient>
        <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--gr-g2)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--gr-g2)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#a${id})`} className="gr-spark-area" />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke={`url(#s${id})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gr-spark-line"
      />
    </svg>
  );
}
