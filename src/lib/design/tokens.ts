// JS-side references to the brand design tokens defined in app/globals.css.
// Use these anywhere a CSS class can't reach — e.g. Recharts series colors,
// inline SVG, canvas. Values are CSS custom-property references so they stay
// theme-reactive (light/dark) automatically.

export const chartSeries = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const brand = {
  red: "var(--primary)",
  blue: "var(--accent-blue)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--destructive)",
  border: "var(--border)",
  muted: "var(--muted-foreground)",
} as const;

// Mechanics-index series colors (tunable). PMI = pitching, HMI = hitting, CMI = catching.
export const misColor = {
  PMI: "var(--chart-1)",
  HMI: "var(--chart-2)",
  CMI: "var(--chart-3)",
} as const;

// Upside-tier colors. Single source for both TierBadge and the Discover feed —
// mirrors the mobile app's `tierColors` in theme.js.
const TIER_COLOR: Record<string, string> = {
  elite: "var(--tier-elite)",
  high: "var(--accent-blue)",
  moderate: "var(--success)",
  developing: "var(--muted-foreground)",
  limited: "var(--muted-foreground)",
};

export function tierColor(tier?: string | null): string {
  if (!tier) return "var(--muted-foreground)";
  return TIER_COLOR[tier.toLowerCase()] ?? "var(--muted-foreground)";
}

export const gradeColor: Record<string, string> = {
  A: "var(--grade-a)",
  B: "var(--grade-b)",
  C: "var(--grade-c)",
  D: "var(--grade-d)",
  F: "var(--grade-f)",
};

// Map a 0–100 mechanics score to a grade-band color.
export function scoreColor(score: number): string {
  if (score >= 85) return "var(--grade-a)";
  if (score >= 70) return "var(--grade-b)";
  if (score >= 55) return "var(--grade-c)";
  if (score >= 40) return "var(--grade-d)";
  return "var(--grade-f)";
}

// Map a letter grade to its color; falls back to muted for unknown grades.
export function letterGradeColor(grade?: string | null): string {
  if (!grade) return "var(--muted-foreground)";
  return gradeColor[grade.trim().charAt(0).toUpperCase()] ?? "var(--muted-foreground)";
}
