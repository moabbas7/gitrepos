"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactNumber, groupedNumber } from "@/lib/format";

export interface StarPoint {
  date: string; // YYYY-MM-DD
  stars: number;
}

/** 30/90-day star history. Client-only; load with next/dynamic to keep Recharts out of the main bundle. */
export default function StarChart({ data, height = 240 }: { data: StarPoint[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gr-star-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--gr-logo-blue)" />
              <stop offset="50%" stopColor="var(--gr-logo-violet)" />
              <stop offset="100%" stopColor="var(--gr-logo-magenta)" />
            </linearGradient>
            <linearGradient id="gr-star-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gr-logo-violet)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--gr-logo-violet)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--gr-hairline)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            stroke="var(--gr-mute)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--gr-hairline)" }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => compactNumber(v)}
            stroke="var(--gr-mute)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            cursor={{ stroke: "var(--gr-frame)" }}
            contentStyle={{
              background: "var(--gr-surface-raised)",
              border: "1.5px solid var(--gr-frame)",
              borderRadius: 8,
              boxShadow: "var(--gr-shadow-rest)",
              color: "var(--gr-ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--gr-mute)" }}
            formatter={(v) => [groupedNumber(Number(v)), "stars"]}
          />
          <Area
            type="monotone"
            dataKey="stars"
            stroke="url(#gr-star-stroke)"
            strokeWidth={2}
            fill="url(#gr-star-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
