"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useChartColors } from "./use-chart-colors";
import { ChartTooltipContent, type ChartSeries } from "./chart-tooltip";

// Score-over-time line chart. Single y-axis (never dual). Legend appears only
// for 2+ series; a single series is named by the surrounding card title.
export function TrendLine({
  data,
  series,
  height = 260,
  yDomain = [0, 100],
}: {
  data: Record<string, unknown>[];
  series: ChartSeries[];
  height?: number;
  yDomain?: [number, number];
}) {
  const c = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={c.grid} strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="label" stroke={c.axis} tickLine={false} axisLine={false} fontSize={11} dy={4} />
        <YAxis
          domain={yDomain}
          stroke={c.axis}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={36}
        />
        <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: c.axis, strokeOpacity: 0.3 }} />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8, color: c.axis }}
          />
        )}
        {series.map((s, i) => {
          const color = c.series[s.colorIndex ?? i] ?? c.series[0];
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: color }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
