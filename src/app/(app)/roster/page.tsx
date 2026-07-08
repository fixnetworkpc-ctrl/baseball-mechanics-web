"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyPlayers, overallScore } from "@/lib/team-service";
import type { MyPlayer } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Roster</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {players.length} {players.length === 1 ? "player" : "players"} across your analyses
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : players.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">No players yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analyses you run in the mobile app appear here, grouped by player.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {players.map((p, i) => (
            <PlayerRow key={p.playerId || p.playerName || i} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerRow({ p }: { p: MyPlayer }) {
  const score = overallScore(p.latest.mechanicsScore);
  const latestDate = p.latest.date ? new Date(p.latest.date).toLocaleDateString() : null;

  const inner = (
    <CardContent className="flex items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-semibold truncate">{p.playerName || "Unknown player"}</p>
        <p className="text-xs text-muted-foreground">
          {p.sessionCount} {p.sessionCount === 1 ? "session" : "sessions"}
          {latestDate && ` · latest ${latestDate}`}
        </p>
        {p.modes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.modes.map((m) => (
              <Badge key={m} variant="secondary" className="capitalize">{m}</Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {p.latest.grade && <Badge variant="outline">Grade {p.latest.grade}</Badge>}
        {score != null && <span className="text-xs text-muted-foreground">MIS {score}</span>}
        {p.playerId && <span className="text-xs text-primary">View sessions →</span>}
      </div>
    </CardContent>
  );

  if (p.playerId) {
    return (
      <Card className="hover:bg-accent transition-colors">
        <Link href={`/sessions?playerId=${encodeURIComponent(p.playerId)}&name=${encodeURIComponent(p.playerName || "")}`}>
          {inner}
        </Link>
      </Card>
    );
  }
  return <Card>{inner}</Card>;
}
