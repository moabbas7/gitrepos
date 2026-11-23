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
              <stop offset="0%" stopColor="var(--gr-g1)" />
              <stop offset="50%" stopColor="var(--gr-g2)" />
              <stop offset="100%" stopColor="var(--gr-g3)" />
            </linearGradient>
            <linearGradient id="gr-star-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gr-g2)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--gr-g2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(250 250 250 / 0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            stroke="rgb(250 250 250 / 0.5)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "rgb(250 250 250 / 0.5)" }}
            tickLine={false}
            axisLine={{ stroke: "rgb(250 250 250 / 0.08)" }}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => compactNumber(v)}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "rgb(250 250 250 / 0.5)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            cursor={{ stroke: "rgb(250 250 250 / 0.16)" }}
            contentStyle={{
              background: "rgb(7 7 11 / 0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgb(250 250 250 / 0.1)",
              borderRadius: 12,
              color: "#FAFAFA",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "rgb(250 250 250 / 0.5)" }}
            itemStyle={{ color: "#FAFAFA" }}
            formatter={(v) => [groupedNumber(Number(v)), "stars"]}
          />
          <Area type="monotone" dataKey="stars" stroke="url(#gr-star-stroke)" strokeWidth={2} fill="url(#gr-star-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
