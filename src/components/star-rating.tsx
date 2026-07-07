"use client";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 16,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className={cn("leading-none", !readOnly && "cursor-pointer")}
          style={{ fontSize: size }}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <span className={n <= value ? "text-yellow-500" : "text-muted-foreground/30"}>★</span>
        </button>
      ))}
    </div>
  );
}
