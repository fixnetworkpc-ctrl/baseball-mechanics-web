"use client";

import { useEffect, useState } from "react";
import { Telescope } from "lucide-react";
import { toast } from "sonner";
import { getDiscoverCategories, addFavorite, getFavorites } from "@/lib/recruiter-service";
import type { DiscoverCategory, PlayerCard } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIER_COLORS: Record<string, string> = {
  elite: "text-amber-500 border-amber-500/40",
  high: "text-blue-500 border-blue-500/40",
  moderate: "text-emerald-500 border-emerald-500/40",
  developing: "text-muted-foreground border-border",
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function DiscoverPage() {
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [cats, favs] = await Promise.all([getDiscoverCategories(), getFavorites()]);
        if (!active) return;
        setCategories(cats);
        setFavoriteIds(new Set(favs.map((f) => f.player_id)));
        setUpdatedAt(new Date());
      } catch {
        if (active) toast.error("Could not load Discover feed. Check your connection.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleAddFav(player: PlayerCard) {
    setSaving((s) => ({ ...s, [player.playerId]: true }));
    try {
      const athletic = player.athletic as { exitVelo?: string; pitchVelo?: string };
      const snapshot = {
        position: player.position,
        gradYear: player.gradYear,
        school: player.school,
        state: player.state,
        pmi: player.latestPMI,
        hmi: player.latestHMI,
        exitVelo: athletic?.exitVelo,
        pitchVelo: athletic?.pitchVelo,
      };
      await addFavorite(player.playerId, player.playerName, snapshot);
      setFavoriteIds((prev) => new Set([...prev, player.playerId]));
    } catch {
      toast.error("Could not add to favorites.");
    } finally {
      setSaving((s) => ({ ...s, [player.playerId]: false }));
    }
  }

  if (loading) return <LoadingState rows={2} />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scouting"
        title="Discover Athletes"
        subtitle={
          updatedAt
            ? `Ranked feeds · updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Ranked feeds across the athlete pool"
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Telescope}
          title="No athletes yet"
          body="As players set their profiles to Recruiter or Public visibility, they'll appear here in ranked feeds."
        />
      ) : (
        categories.map((cat) => (
          <section key={cat.id} className="space-y-3">
            <div className="flex items-start gap-2">
              <div>
                <h2 className="text-sm font-bold tracking-wide">{cat.title}</h2>
                <p className="text-xs text-muted-foreground">{cat.subtitle}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{cat.players.length}</Badge>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {cat.players.map((player, i) => (
                <AthleteCard
                  key={`${cat.id}-${player.playerId}`}
                  player={player}
                  rank={i + 1}
                  isFav={favoriteIds.has(player.playerId)}
                  saving={!!saving[player.playerId]}
                  onAddFav={() => handleAddFav(player)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function AthleteCard({
  player,
  rank,
  isFav,
  saving,
  onAddFav,
}: {
  player: PlayerCard;
  rank: number;
  isFav: boolean;
  saving: boolean;
  onAddFav: () => void;
}) {
  const primaryScore = player.latestPMI ?? player.latestHMI;
  const primaryLabel = player.latestPMI != null ? "PMI" : "HMI";
  const vel = Math.max(player.pmiVelocity ?? -Infinity, player.hmiVelocity ?? -Infinity);
  const hasVel = isFinite(vel);
  const tierClass = TIER_COLORS[player.upsideTier] ?? TIER_COLORS.developing;
  const meta = [player.position, player.gradYear && `'${player.gradYear.slice(-2)}`, player.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="w-48 shrink-0 relative">
      <CardContent className="pt-6 space-y-2">
        <span className="absolute top-3 right-3 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          #{rank}
        </span>

        {primaryScore != null && (
          <Badge variant="outline" className={tierClass}>
            {primaryLabel} {primaryScore}
          </Badge>
        )}

        <div>
          <p className="text-sm font-semibold leading-tight">{player.playerName}</p>
          {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        </div>

        {hasVel && (
          <p className={`text-xs font-bold ${vel >= 3 ? "text-emerald-500" : vel >= 1 ? "text-blue-500" : "text-muted-foreground"}`}>
            {vel > 0 ? "+" : ""}{vel.toFixed(1)} pts/session
          </p>
        )}

        {player.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="mr-1">{tag}</Badge>
        ))}

        <div className="flex gap-1.5 pt-1">
          <Button
            variant={isFav ? "default" : "outline"}
            size="sm"
            disabled={isFav || saving}
            onClick={onAddFav}
          >
            {isFav ? "✓" : "+"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(`${BACKEND_URL}/p/${player.playerId}`, "_blank")}
          >
            Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
