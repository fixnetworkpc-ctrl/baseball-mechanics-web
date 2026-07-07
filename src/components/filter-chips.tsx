"use client";

import { cn } from "@/lib/utils";

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(value === opt.key ? "" : opt.key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === opt.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
