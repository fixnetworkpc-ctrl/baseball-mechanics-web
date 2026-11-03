import { redirect } from "next/navigation";

// The old "Team Dashboard". Merged 2026-11-03 (user: "only one dashboard, player roster"):
// team averages + leaderboards now live on /dashboard (components/team/team-overview.tsx)
// and the roster lives on /roster as player cards. Kept as a redirect so bookmarks and old
// links still land somewhere useful.
export default function TeamPage() {
  redirect("/dashboard");
}
