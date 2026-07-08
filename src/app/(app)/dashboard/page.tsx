"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecruiterProfile, getFavorites, getSavedSearches } from "@/lib/recruiter-service";
import type { RecruiterProfile, RecruiterFavorite, SavedSearch } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [favorites, setFavorites] = useState<RecruiterFavorite[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prof, favs, srchs] = await Promise.all([
          getRecruiterProfile(),
          getFavorites(),
          getSavedSearches(),
        ]);
        if (!active) return;
        setProfile(prof);
        setFavorites(favs);
        setSearches(srchs);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const orgLine = [profile?.college || profile?.organization, profile?.division, profile?.conference]
    .filter(Boolean)
    .join(" · ");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruiter Dashboard</h1>
          {orgLine && <p className="text-sm text-muted-foreground mt-1">{orgLine}</p>}
        </div>
        <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Edit Profile
        </Link>
      </div>

      {!profile?.college && !profile?.organization && (
        <Card className="border-l-4 border-l-primary">
          <CardContent>
            <Link href="/profile" className="text-sm font-medium">
              Complete your recruiter profile to personalize your portal →
            </Link>
          </CardContent>
        </Card>
      )}

      <Link href="/discover" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Discover Athletes
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/search", label: "Search" },
          { href: "/favorites", label: "Favorites" },
          { href: "/alerts", label: "Alerts" },
          { href: "/notifications", label: "Notifications" },
          { href: "/ai-recruit", label: "AI Recruit" },
          { href: "/roster", label: "My Roster" },
          { href: "/team", label: "Team" },
          { href: "/practice-plans", label: "Practice Plans" },
          { href: "/org", label: "Organization" },
          { href: "/profile", label: "Profile" },
        ].map((tile) => (
          <Card key={tile.href} className="hover:bg-accent transition-colors">
            <Link href={tile.href}>
              <CardContent className="flex items-center justify-center py-6 text-sm font-semibold text-center">
                {tile.label}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Favorites</h2>
          <Badge variant="secondary">{favorites.length}</Badge>
          {favorites.length > 0 && (
            <Link href="/favorites" className="ml-auto text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {favorites.length === 0 ? (
          <EmptyCard title="No favorites yet" body="When you find a player via Search, save them here for quick access." />
        ) : (
          <div className="space-y-2">
            {favorites.slice(0, 3).map((fav) => (
              <FavoriteRow key={fav.id} fav={fav} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Saved Searches</h2>
          <Badge variant="secondary">{searches.length}</Badge>
        </div>

        {searches.length === 0 ? (
          <EmptyCard title="No saved searches" body="Run a search and save it for quick access later." />
        ) : (
          <div className="space-y-2">
            {searches.slice(0, 3).map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-6 text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </CardContent>
    </Card>
  );
}

function FavoriteRow({ fav }: { fav: RecruiterFavorite }) {
  const snap = fav.snapshot as { position?: string; gradYear?: string; school?: string; pmi?: number; hmi?: number };
  const meta = [snap.position, snap.gradYear && `'${String(snap.gradYear).slice(-2)}`, snap.school]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3 gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{fav.player_name}</p>
          {meta && <p className="text-xs text-muted-foreground truncate">{meta}</p>}
          {fav.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fav.notes}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {snap.pmi != null && <Badge variant="outline">PMI {snap.pmi}</Badge>}
          {snap.hmi != null && <Badge variant="outline">HMI {snap.hmi}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
