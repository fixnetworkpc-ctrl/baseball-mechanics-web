import {
  LayoutDashboard,
  Search,
  Compass,
  Sparkles,
  Star,
  BellRing,
  Inbox,
  Users,
  Shield,
  ClipboardList,
  Building2,
  UserRound,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import type { AccountScope } from "@/lib/account-scope";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * `requires` names what the account must HAVE for a group to appear — never who they
 * ARE. A group with no `requires` is unconditional and must stay that way: Dashboard
 * and Account are the floor a brand-new account lands on, and a sidebar that can render
 * empty is worse than one that renders too much.
 */
export type NavRequirement = "team" | "players" | "recruiter";
export type NavGroup = { heading: string | null; items: NavItem[]; requires?: NavRequirement };

export const NAV_GROUPS: NavGroup[] = [
  { heading: null, items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    // 🔴 /sessions existed for weeks and was in NO nav group — reachable only by typing
    // the URL. It is the whole athlete/parent view (a player's history plus a score
    // trend, filterable by playerId) and nobody could find it.
    heading: "My Athletes",
    requires: "players",
    items: [
      { href: "/roster", label: "Players", icon: Users },
      { href: "/sessions", label: "Sessions", icon: LineChart },
    ],
  },
  {
    heading: "My Team",
    requires: "team",
    items: [
      { href: "/team", label: "Team Dashboard", icon: Shield },
      { href: "/practice-plans", label: "Practice Plans", icon: ClipboardList },
    ],
  },
  {
    heading: "Recruiting",
    requires: "recruiter",
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

export function isGroupVisible(group: NavGroup, scope: AccountScope): boolean {
  if (!group.requires) return true;
  if (group.requires === "team") return scope.hasTeam;
  if (group.requires === "players") return scope.hasPlayers;
  return scope.hasRecruiterProfile;
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
