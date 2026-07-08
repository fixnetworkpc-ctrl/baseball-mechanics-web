"use client";

import { useEffect, useState } from "react";
import { getMyTeam } from "@/lib/team-service";
import type { MyTeamResponse, LeaderboardEntry } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TeamPage() {
  const [data, setData] = useState<MyTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyTeam()
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message || "Could not load team."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  // No membership at all.
  if (!data?.membership) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Team Dashboard</h1>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">You&apos;re not on a team</p>
            <p className="text-sm text-muted-foreground mt-1">
              Join or create a team in the mobile app to see your team dashboard here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { team, membership } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{membership.teamName || "Team Dashboard"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {membership.ageDivision && <span>{membership.ageDivision}</span>}
          {team?.joinCode && <span> · Join code {team.joinCode}</span>}
        </p>
      </div>

      {!team ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="font-medium">Team data unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your membership is active, but the team&apos;s live data couldn&apos;t be loaded right now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Players" value={team.totalPlayers} />
            <StatCard label="Avg PMI" value={team.avgPMI} />
            <StatCard label="Avg HMI" value={team.avgHMI} />
            <StatCard label="Avg CMI" value={team.avgCMI} />
          </div>

          <Tabs defaultValue="pmi">
            <TabsList>
              <TabsTrigger value="pmi">Pitching</TabsTrigger>
              <TabsTrigger value="hmi">Hitting</TabsTrigger>
              <TabsTrigger value="cmi">Catching</TabsTrigger>
            </TabsList>
            <TabsContent value="pmi"><Leaderboard entries={team.pmiLeaderboard} label="PMI" /></TabsContent>
            <TabsContent value="hmi"><Leaderboard entries={team.hmiLeaderboard} label="HMI" /></TabsContent>
            <TabsContent value="cmi"><Leaderboard entries={team.cmiLeaderboard} label="CMI" /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function Leaderboard({ entries, label }: { entries: LeaderboardEntry[]; label: string }) {
  if (entries.length === 0) {
    return (
      <Card className="border-dashed mt-3">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No {label} scores on this team yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2 mt-3">
      {entries.map((e) => (
        <Card key={`${e.rank}-${e.firstName}`}>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground w-6">#{e.rank}</span>
              <span className="text-sm font-medium">{e.firstName}</span>
            </div>
            <Badge variant="outline">{label} {e.score}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
