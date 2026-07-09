"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Recharts sets colors as SVG attributes, where `var(--x)` is unreliable — so we
// resolve the brand CSS variables to concrete values at runtime and re-read them
// whenever the theme flips. Keeps charts on-palette in both light and dark.
function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export type ChartColors = {
  series: string[];
  grid: string;
  axis: string;
  text: string;
  surface: string;
  border: string;
};

const DEFAULTS: ChartColors = {
  series: ["#2b80ff", "#e84050", "#199150", "#d9761c", "#b06bd6"],
  grid: "#1c3254",
  axis: "#7e97b4",
  text: "#ecf3ff",
  surface: "#0a1829",
  border: "#1c3254",
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [c, setC] = useState<ChartColors>(DEFAULTS);

  useEffect(() => {
    setC({
      series: [1, 2, 3, 4, 5].map((i) => readVar(`--chart-${i}`, DEFAULTS.series[i - 1])),
      grid: readVar("--border", DEFAULTS.grid),
      axis: readVar("--muted-foreground", DEFAULTS.axis),
      text: readVar("--foreground", DEFAULTS.text),
      surface: readVar("--popover", DEFAULTS.surface),
      border: readVar("--border", DEFAULTS.border),
    });
  }, [resolvedTheme]);

  return c;
}
