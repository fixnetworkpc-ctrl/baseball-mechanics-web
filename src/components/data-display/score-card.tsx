import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { GradeBadge } from "./badges";
import { cn } from "@/lib/utils";

// Headline mechanics-score card: gauge + grade + confidence.
export function ScoreCard({
  title,
  score,
  grade,
  confidence,
  footer,
  className,
}: {
  title: string;
  score: number | null | undefined;
  grade?: string | null;
  confidence?: "high" | "medium" | "low" | string | null;
  footer?: React.ReactNode;
  className?: string;
}) {
  const has = score != null && !Number.isNaN(score);
  return (
    <Card className={cn("", className)}>
      <CardContent className="flex items-center gap-4 py-5">
        <ProgressRing value={has ? Number(score) : 0} size={92} sublabel="MIS" />
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            {grade && <GradeBadge grade={grade} />}
            {confidence && (
              <span className="text-xs capitalize text-muted-foreground">{confidence} confidence</span>
            )}
          </div>
          {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
