"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";
import { useChartColors } from "./use-chart-colors";

// Tiny axis-less trend line for stat tiles. No hover by design (it's a glyph).
export function Sparkline({
  data,
  colorIndex = 0,
  height = 36,
}: {
  data: { value: number }[];
  colorIndex?: number;
  height?: number;
}) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={c.series[colorIndex] ?? c.series[0]}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
