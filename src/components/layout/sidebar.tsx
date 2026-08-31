"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, isGroupVisible, portalLabel } from "./nav-config";
import { Wordmark } from "./wordmark";
import { useAccountScope } from "@/lib/account-scope";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  email,
  onSignOut,
  onNavigate,
}: {
  email: string | null;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const scope = useAccountScope();

  // While the account's scope is still resolving, reserve the space the conditional
  // groups will occupy rather than popping them in under the cursor. Showing them
  // early and then removing them would move a link out from under a click.
  const resolving = scope.status === "loading";
  const groups = NAV_GROUPS.filter((g) => !g.requires || isGroupVisible(g, scope));

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <Wordmark label={portalLabel(scope)} className="px-5 py-5" />

      {/* Nav */}
      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.heading && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-accent" />
                  )}
                  <Icon className={cn("size-4", active && "text-brand-accent")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {resolving && (
          <div className="space-y-1 px-3 pt-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-sidebar-accent/40" />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-sidebar-border p-4">
        {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
