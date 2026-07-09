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
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { heading: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { heading: null, items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Recruiting",
    items: [
      { href: "/search", label: "Search", icon: Search },
      { href: "/discover", label: "Discover", icon: Compass },
      { href: "/ai-recruit", label: "AI Recruit", icon: Sparkles },
      { href: "/favorites", label: "Favorites", icon: Star },
      { href: "/alerts", label: "Alerts", icon: BellRing },
      { href: "/notifications", label: "Notifications", icon: Inbox },
    ],
  },
  {
    heading: "My Program",
    items: [
      { href: "/roster", label: "My Roster", icon: Users },
      { href: "/team", label: "Team", icon: Shield },
      { href: "/practice-plans", label: "Practice Plans", icon: ClipboardList },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/org", label: "Organization", icon: Building2 },
      { href: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];
