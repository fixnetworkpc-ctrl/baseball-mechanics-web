import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Directional change indicator. Positive = improving (green), negative = red.
export function DeltaBadge({
  value,
  suffix = "",
  className,
}: {
  value: number | null | undefined;
  suffix?: string;
  className?: string;
}) {
  if (value == null || Number.isNaN(value)) return null;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const color =
    dir === "up" ? "var(--success)" : dir === "down" ? "var(--destructive)" : "var(--muted-foreground)";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-bold tabular-nums", className)}
      style={{ color }}
    >
      <Icon className="size-3.5" />
      {value > 0 ? "+" : ""}{value}{suffix}
    </span>
  );
}
