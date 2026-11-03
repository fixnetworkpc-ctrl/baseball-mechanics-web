import {
  LayoutDashboard,
  Search,
  Compass,
  Sparkles,
  Star,
  BellRing,
  Inbox,
  Users,
  ClipboardList,
  Building2,
  UserRound,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import type { AccountScope } from "@/lib/account-scope";

export type NavRequirement = "team" | "players" | "recruiter";
/** `requires` is ANY-OF: the item/group shows when the account has at least one. */
export type NavItem = { href: string; label: string; icon: LucideIcon; requires?: NavRequirement[] };

/**
 * `requires` names what the account must HAVE for a group or item to appear — never who
 * they ARE. A group with no `requires` is unconditional and must stay that way: Dashboard
 * and Account are the floor a brand-new account lands on, and a sidebar that can render
 * empty is worse than one that renders too much.
 */
export type NavGroup = { heading: string | null; items: NavItem[]; requires?: NavRequirement[] };

// 🔑 2026-11-03 (user: "only one dashboard, player roster"): the separate "Team Dashboard"
// (/team) is gone — its averages and leaderboards live on Dashboard, and its roster is the
// Players page (cards). "My Athletes" and "My Team" merged into one "My Program" group.
// 🔴 /sessions existed for weeks in NO nav group — reachable only by typing the URL. Keep it
// listed: it is the whole athlete/parent view.
export const NAV_GROUPS: NavGroup[] = [
  { heading: null, items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "My Program",
    requires: ["players", "team"],
    items: [
      { href: "/roster", label: "Players", icon: Users },
      { href: "/sessions", label: "Sessions", icon: LineChart, requires: ["players"] },
      { href: "/practice-plans", label: "Practice Plans", icon: ClipboardList, requires: ["team"] },
    ],
  },
  {
    heading: "Recruiting",
    requires: ["recruiter"],
    items: [
      { href: "/search", label: "Search", icon: Search },
      { href: "/discover", label: "Discover", icon: Compass },
      { href: "/ai-recruit", label: "AI Recruit", icon: Sparkles },
      { href: "/favorites", label: "Favorites", icon: Star },
      { href: "/alerts", label: "Alerts", icon: BellRing },
      { href: "/notifications", label: "Notifications", icon: Inbox },
      { href: "/org", label: "Organization", icon: Building2 },
    ],
  },
  {
    heading: "Account",
    items: [{ href: "/profile", label: "Profile", icon: UserRound }],
  },
];

function has(req: NavRequirement, scope: AccountScope): boolean {
  if (req === "team") return scope.hasTeam;
  if (req === "players") return scope.hasPlayers;
  return scope.hasRecruiterProfile;
}

/** True when the account meets ANY of `requires` (or there is no requirement). */
export function meets(requires: NavRequirement[] | undefined, scope: AccountScope): boolean {
  return !requires || requires.length === 0 || requires.some((r) => has(r, scope));
}

export function isGroupVisible(group: NavGroup, scope: AccountScope): boolean {
  return meets(group.requires, scope);
}

/** The groups and items this account should see; a group left with no items is dropped. */
export function visibleNav(scope: AccountScope): NavGroup[] {
  return NAV_GROUPS
    .filter((g) => isGroupVisible(g, scope))
    .map((g) => ({ ...g, items: g.items.filter((i) => meets(i.requires, scope)) }))
    .filter((g) => g.items.length > 0);
}

/**
 * What the sidebar calls itself. "Recruiter Portal" was hard-coded, so a parent looking
 * at their kid's swing was told, in the corner of every page, that they were in a tool
 * for recruiters.
 */
export function portalLabel(scope: AccountScope): string {
  const { hasTeam, hasPlayers, hasRecruiterProfile } = scope;
  const breadth = Number(hasTeam) + Number(hasPlayers) + Number(hasRecruiterProfile);
  if (breadth > 1) return "Portal";
  if (hasRecruiterProfile) return "Recruiter Portal";
  if (hasTeam) return "Coach Portal";
  if (hasPlayers) return "Player Portal";
  return "Portal";
}
