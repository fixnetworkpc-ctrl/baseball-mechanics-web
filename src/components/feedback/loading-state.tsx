import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Standard page-loading skeleton: a title bar plus N card placeholders.
export function LoadingState({
  rows = 3,
  withTitle = true,
  className,
}: {
  rows?: number;
  withTitle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {withTitle && <Skeleton className="h-8 w-56" />}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// Grid of stat-tile skeletons for dashboard-style headers.
export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
