import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// Player summary card with avatar, meta line, and PMI/HMI chips.
// Elevates on hover; becomes a link when `href` is provided.
export function PlayerCard({
  name,
  meta,
  pmi,
  hmi,
  href,
  right,
  className,
}: {
  name: string | null;
  meta?: string;
  pmi?: number | null;
  hmi?: number | null;
  href?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <CardContent className="flex items-center gap-3 py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-extrabold text-secondary-foreground">
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name || "Unknown player"}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pmi != null && <Badge variant="outline">PMI {pmi}</Badge>}
        {hmi != null && <Badge variant="outline">HMI {hmi}</Badge>}
        {right}
      </div>
    </CardContent>
  );

  const base = cn(
    "transition-all duration-200",
    href &&
      "hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
    className
  );

  if (href) {
    return (
      <Card className={base}>
        <Link href={href} className="block rounded-[inherit] outline-none">
          {body}
        </Link>
      </Card>
    );
  }
  return <Card className={base}>{body}</Card>;
}
