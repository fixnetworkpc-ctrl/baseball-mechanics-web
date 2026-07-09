"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getMyPlayers, overallScore } from "@/lib/team-service";
import type { MyPlayer } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { PlayerCard } from "@/components/data-display/player-card";
import { GradeBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function RosterPage() {
  const [players, setPlayers] = useState<MyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyPlayers()
      .then((p) => { if (active) setPlayers(p); })
      .catch((e) => { if (active) setError(e.message || "Could not load players."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState rows={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Program"
        title="My Roster"
        subtitle={`${players.length} ${players.length === 1 ? "player" : "players"} across your analyses`}
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players yet"
          body="Analyses you run in the mobile app appear here, grouped by player."
        />
      ) : (
        <div className="space-y-2">
          {players.map((p, i) => {
            const score = overallScore(p.latest.mechanicsScore);
            const latest = p.latest.date ? new Date(p.latest.date).toLocaleDateString() : null;
            const meta = [
              `${p.sessionCount} ${p.sessionCount === 1 ? "session" : "sessions"}`,
              latest && `latest ${latest}`,
              p.modes.join(", "),
            ].filter(Boolean).join(" · ");
            return (
              <PlayerCard
                key={p.playerId || p.playerName || i}
                name={p.playerName}
                meta={meta}
                href={p.playerId ? `/sessions?playerId=${encodeURIComponent(p.playerId)}&name=${encodeURIComponent(p.playerName || "")}` : undefined}
                right={
                  <>
                    {score != null && <Badge variant="secondary">MIS {score}</Badge>}
                    <GradeBadge grade={p.latest.grade} />
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
