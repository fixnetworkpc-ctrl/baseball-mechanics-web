"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Standard next-themes hydration guard: the resolved theme is only known on the
  // client, so the first client render must match the server's.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      // 🔴 MUST be gated on `mounted`, exactly like the icon below. `resolvedTheme` is
      // undefined on the server, so an ungated label renders "Switch to dark theme" during
      // SSR and "Switch to light theme" after the client resolves the real theme — a
      // hydration mismatch React reports against <Button> in button.tsx, which sends you
      // hunting in the wrong file. The guard was previously applied to the icon only.
      aria-label={
        mounted
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      {mounted && !isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
