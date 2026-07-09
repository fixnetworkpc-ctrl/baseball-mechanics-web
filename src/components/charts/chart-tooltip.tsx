"use client";

// Recharts injects tooltip props when it clones the `content` element, so every
// field is optional here (passing `<ChartTooltipContent />` must type-check).
type TooltipItem = {
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
  fill?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipItem[];
};

// Shared tooltip styled with surface/ink tokens (not series color). Values stay
// in ink; a colored dot carries series identity.
export function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      {label != null && label !== "" && (
        <p className="mb-1 font-semibold text-popover-foreground">{String(label)}</p>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: p.color || p.stroke || p.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-bold tabular-nums text-popover-foreground">
              {typeof p.value === "number" ? Math.round(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type ChartSeries = { key: string; name: string; colorIndex?: number };
