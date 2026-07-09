import { scoreColor } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

// Labeled metric with an optional 0–100 fill bar. Used in score breakdowns.
export function MetricRow({
  label,
  value,
  max = 100,
  showBar = true,
  color,
  className,
}: {
  label: string;
  value: number | null | undefined;
  max?: number;
  showBar?: boolean;
  color?: string;
  className?: string;
}) {
  const has = value != null && !Number.isNaN(value);
  const pct = has ? Math.max(0, Math.min(100, (Number(value) / max) * 100)) : 0;
  const barColor = color ?? (has ? scoreColor(Number(value)) : "var(--muted-foreground)");

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums" style={{ color: has ? barColor : undefined }}>
          {has ? value : "—"}
        </span>
      </div>
      {showBar && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}
