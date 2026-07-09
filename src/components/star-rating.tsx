"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];
const MAX = STARS.length;

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <span
      aria-hidden
      className={filled ? undefined : "text-muted-foreground/30"}
      style={{ fontSize: size, color: filled ? "var(--tier-elite)" : undefined }}
    >
      ★
    </span>
  );
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 16,
  label = "Rating",
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Read-only: the stars are decorative. Expose the rating as one labelled
  // image rather than five disabled buttons, which announce as noise and never
  // state the actual value.
  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={value > 0 ? `${label}: ${value} out of ${MAX} stars` : `${label}: not rated`}
        className="flex items-center gap-0.5"
      >
        {STARS.map((n) => (
          <Star key={n} filled={n <= value} size={size} />
        ))}
      </div>
    );
  }

  // Interactive: a radiogroup with roving tabindex. Arrow keys move between
  // stars (the expected pattern), Tab enters/leaves the whole group once.
  const focusIndex = value > 0 ? value - 1 : 0;

  function select(n: number) {
    onChange?.(n);
    refs.current[n - 1]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, n: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = n === MAX ? 1 : n + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = n === 1 ? MAX : n - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = MAX;
    if (next == null) return;
    e.preventDefault();
    select(next);
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5">
      {STARS.map((n) => (
        <button
          key={n}
          ref={(el) => { refs.current[n - 1] = el; }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          tabIndex={n - 1 === focusIndex ? 0 : -1}
          // Clicking the current rating clears it back to unrated.
          onClick={() => onChange?.(value === n ? 0 : n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          className={cn(
            "cursor-pointer rounded-sm leading-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        >
          <Star filled={n <= value} size={size} />
        </button>
      ))}
    </div>
  );
}
