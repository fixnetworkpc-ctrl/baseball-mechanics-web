"use client";

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useChartColors } from "./use-chart-colors";
import { ChartTooltipContent, type ChartSeries } from "./chart-tooltip";

// Multivariate mechanics profile (6 category scores). Supports overlaying up to
// a couple of series (e.g. before/after or two players).
export function RadarCategories({
  data,
  series,
  height = 300,
}: {
  data: Record<string, unknown>[]; // [{ category: 'Balance', current: 82, ... }]
  series: ChartSeries[];
  height?: number;
}) {
  const c = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={c.grid} />
        <PolarAngleAxis dataKey="category" tick={{ fill: c.axis, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip content={<ChartTooltipContent />} />
        {series.length > 1 && (
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        )}
        {series.map((s, i) => {
          const color = c.series[s.colorIndex ?? i] ?? c.series[0];
          return (
            <Radar
              key={s.key}
              name={s.name}
              dataKey={s.key}
              stroke={color}
              fill={color}
              fillOpacity={0.16}
              strokeWidth={2}
              isAnimationActive={false}
            />
          );
        })}
      </RadarChart>
    </ResponsiveContainer>
  );
}
