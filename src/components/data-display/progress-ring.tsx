import { scoreColor } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

// Circular 0–100 gauge. Defaults to grade-band color from the score.
export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  color,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (clamped / 100) * circ;
  const ringColor = color ?? scoreColor(clamped);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums" style={{ color: ringColor }}>
          {label ?? Math.round(clamped)}
        </span>
        {sublabel && <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
