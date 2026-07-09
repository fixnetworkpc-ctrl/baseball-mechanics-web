import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Consistent empty state: optional icon, title, body, and optional action.
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        {Icon && (
          <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Icon className="size-6" />
          </div>
        )}
        <p className="font-semibold">{title}</p>
        {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
        {action && <div className="mt-3">{action}</div>}
      </CardContent>
    </Card>
  );
}
