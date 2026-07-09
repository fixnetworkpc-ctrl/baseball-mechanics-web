"use client";

import { useEffect, useRef, useState } from "react";

// Counts up to `value` on mount. Skips animation under reduced-motion.
export function AnimatedCounter({
  value,
  durationMs = 900,
  decimals = 0,
  className,
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // matchMedia is only readable on the client, so the reduced-motion jump to
      // the final value can't be computed during render without a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, durationMs]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
