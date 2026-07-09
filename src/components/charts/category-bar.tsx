"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useChartColors } from "./use-chart-colors";
import { ChartTooltipContent } from "./chart-tooltip";

// Horizontal bars for per-category scores (single measure → single hue).
// Optional per-row color override via `data[].color`.
export function CategoryBar({
  data,
  height = 260,
  colorIndex = 0,
  domain = [0, 100],
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  colorIndex?: number;
  domain?: [number, number];
}) {
  const c = useChartColors();
  const base = c.series[colorIndex] ?? c.series[0];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={c.grid} strokeOpacity={0.4} />
        <XAxis type="number" domain={domain} stroke={c.axis} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          type="category"
          dataKey="label"
          stroke={c.axis}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={116}
        />
        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: c.axis, fillOpacity: 0.08 }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? base} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
