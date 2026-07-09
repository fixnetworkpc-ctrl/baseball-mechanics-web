import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Semantic badges ported from the mobile app's color maps (theme.js).
// Use these instead of hand-coloring a <Badge> per call site.

const TIER_COLOR: Record<string, string> = {
  elite: "var(--brand-accent)",
  high: "var(--accent-blue)",
  moderate: "var(--success)",
  developing: "var(--muted-foreground)",
  limited: "var(--muted-foreground)",
};

export function TierBadge({ tier, className }: { tier?: string | null; className?: string }) {
  if (!tier) return null;
  const color = TIER_COLOR[tier.toLowerCase()] ?? "var(--muted-foreground)";
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", className)}
      style={{ color, borderColor: color }}
    >
      {tier}
    </Badge>
  );
}

const STATUS_COLOR: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
  error: "var(--destructive)",
  info: "var(--accent-blue)",
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: "success" | "warning" | "danger" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const color = STATUS_COLOR[status] ?? "var(--muted-foreground)";
  return (
    <Badge variant="outline" className={className} style={{ color, borderColor: color }}>
      {children}
    </Badge>
  );
}

// A letter-grade chip with grade-band coloring.
export function GradeBadge({ grade, className }: { grade?: string | null; className?: string }) {
  if (!grade) return null;
  const key = grade.trim().charAt(0).toUpperCase();
  const map: Record<string, string> = {
    A: "var(--grade-a)", B: "var(--grade-b)", C: "var(--grade-c)", D: "var(--grade-d)", F: "var(--grade-f)",
  };
  const color = map[key] ?? "var(--muted-foreground)";
  return (
    <Badge variant="outline" className={cn("font-extrabold", className)} style={{ color, borderColor: color }}>
      {grade}
    </Badge>
  );
}
