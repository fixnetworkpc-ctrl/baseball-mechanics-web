"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { recruiterSignOut } from "@/lib/recruiter-service";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/search", label: "Search" },
  { href: "/discover", label: "Discover" },
  { href: "/ai-recruit", label: "AI Recruit" },
  { href: "/favorites", label: "Favorites" },
  { href: "/alerts", label: "Alerts" },
  { href: "/notifications", label: "Notifications" },
  { href: "/roster", label: "My Roster" },
  { href: "/team", label: "Team" },
  { href: "/practice-plans", label: "Practice Plans" },
  { href: "/org", label: "Organization" },
  { href: "/profile", label: "Profile" },
];

export function NavShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await recruiterSignOut();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-muted/20 p-4 gap-6">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Baseball Mechanics
          </p>
          <p className="text-sm font-bold">Recruiter Portal</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between gap-2">
            {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
            <ThemeToggle />
          </div>
          {email ? (
            <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "w-full")}>
              Sign in
            </Link>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b p-3">
          <p className="text-sm font-bold">Recruiter Portal</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {email ? (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                Sign in
              </Link>
            )}
          </div>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
