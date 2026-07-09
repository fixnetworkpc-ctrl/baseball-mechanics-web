"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

// Sticky, glass top bar. On mobile it carries the menu button + brand mark;
// on desktop it's a slim utility bar (theme toggle, future user menu).
export function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <Menu />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
            BM
          </div>
          <span className="text-sm font-bold">Recruiter Portal</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
