"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getMyPlayers, overallScore } from "@/lib/team-service";
import { getDevelopmentCard } from "@/lib/practice-service";
import type { DevelopmentCard, MyPlayer } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { PlayerCard } from "@/components/data-display/player-card";
import { GradeBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RosterPage() {
  const [players, setPlayers] = useState<MyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

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
            const expanded = open === p.playerName;
            return (
              <div key={p.playerId || p.playerName || i} className="space-y-1">
                <PlayerCard
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
                {p.playerName && (
                  <>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-3 py-0 text-xs"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : p.playerName)}
                    >
                      {expanded ? "Hide development" : "Development"}
                    </Button>
                    {expanded && <DevelopmentPanel playerName={p.playerName} />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// One athlete's development card, fetched only when a coach opens it — the server route is
// rate-limited and a roster can be 15 players deep, so eagerly loading every card would spend
// the read budget on cards nobody looked at.
//
// 🔴 Everything here is the server's own answer (GET /players/:id/development-card, which runs
// the vendored engines). Nothing on this page ranks, scores or re-words a finding, and the
// growth areas keep the engine's §6 language — "growth area", never "weakness".
function DevelopmentPanel({ playerName }: { playerName: string }) {
  const [card, setCard] = useState<DevelopmentCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDevelopmentCard(playerName)
      .then((c) => { if (active) setCard(c); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load that card."); });
    return () => { active = false; };
  }, [playerName]);

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  if (!card) return <LoadingState rows={1} />;

  const latest = card.latestDate ? new Date(card.latestDate).toLocaleDateString() : null;

  return (
    <Card>
      <CardContent className="space-y-3 py-4 text-sm">
        <p className="text-muted-foreground text-xs">
          {card.sessionCount} {card.sessionCount === 1 ? "session" : "sessions"}
          {latest && ` · latest ${latest}`}
        </p>

        {card.strengths.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-semibold">STRENGTHS</p>
            <ul className="mt-1 space-y-1">
              {card.strengths.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.title}</span>
                  {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.growthAreas.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs font-semibold">GROWTH AREAS</p>
            <ul className="mt-1 space-y-1">
              {card.growthAreas.map((g, i) => (
                <li key={i}>
                  <span className="font-medium">{g.title}</span>
                  {g.detail && <span className="text-muted-foreground"> — {g.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* A card with neither list is a real state — the latest analysis found nothing to
            report at those priorities. Said plainly instead of rendering an empty shell. */}
        {card.strengths.length === 0 && card.growthAreas.length === 0 && (
          <p className="text-muted-foreground">The latest analysis has no strengths or growth areas recorded.</p>
        )}
      </CardContent>
    </Card>
  );
}
