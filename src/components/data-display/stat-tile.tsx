import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "./animated-counter";
import { DeltaBadge } from "./delta-badge";
import { cn } from "@/lib/utils";

// Compact KPI tile: label, big animated number, optional delta + hint.
export function StatTile({
  label,
  value,
  suffix,
  decimals = 0,
  delta,
  hint,
  accent = "var(--accent-blue)",
  className,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  decimals?: number;
  delta?: number | null;
  hint?: string;
  accent?: string;
  className?: string;
}) {
  const has = value != null && !Number.isNaN(value);
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:border-ring/30 hover:shadow-md",
        className
      )}
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent }} />
      <CardContent className="py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tabular-nums">
            {has ? <AnimatedCounter value={Number(value)} decimals={decimals} /> : "—"}
            {has && suffix ? <span className="text-lg text-muted-foreground">{suffix}</span> : null}
          </span>
          {delta != null && <DeltaBadge value={delta} />}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
