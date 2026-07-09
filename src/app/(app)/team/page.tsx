"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getMyTeam } from "@/lib/team-service";
import type { MyTeamResponse, LeaderboardEntry } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/data-display/stat-tile";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { CategoryBar } from "@/components/charts/category-bar";
import { Card, CardContent } from "@/components/ui/card";
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

  if (loading) return <LoadingState rows={3} />;
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!data?.membership) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="My Program" title="Team Dashboard" />
        <EmptyState
          icon={Users}
          title="You're not on a team"
          body="Join or create a team in the mobile app to see your team dashboard here."
        />
      </div>
    );
  }

  const { team, membership } = data;
  const subtitle = [membership.ageDivision, team?.joinCode && `Join code ${team.joinCode}`].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Program" title={membership.teamName || "Team Dashboard"} subtitle={subtitle || undefined} />

      {!team ? (
        <EmptyState
          icon={Users}
          title="Team data unavailable"
          body="Your membership is active, but the team's live data couldn't be loaded right now."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Players" value={team.totalPlayers} accent="var(--muted-foreground)" />
            <StatTile label="Avg PMI" value={team.avgPMI} accent="var(--chart-1)" />
            <StatTile label="Avg HMI" value={team.avgHMI} accent="var(--chart-2)" />
            <StatTile label="Avg CMI" value={team.avgCMI} accent="var(--chart-3)" />
          </div>

          <Tabs defaultValue="pmi">
            <TabsList>
              <TabsTrigger value="pmi">Pitching</TabsTrigger>
              <TabsTrigger value="hmi">Hitting</TabsTrigger>
              <TabsTrigger value="cmi">Catching</TabsTrigger>
            </TabsList>
            <TabsContent value="pmi"><Board entries={team.pmiLeaderboard} label="PMI" colorIndex={0} /></TabsContent>
            <TabsContent value="hmi"><Board entries={team.hmiLeaderboard} label="HMI" colorIndex={1} /></TabsContent>
            <TabsContent value="cmi"><Board entries={team.cmiLeaderboard} label="CMI" colorIndex={2} /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Board({ entries, label, colorIndex }: { entries: LeaderboardEntry[]; label: string; colorIndex: number }) {
  if (entries.length === 0) {
    return (
      <Card className="mt-3 border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No {label} scores on this team yet.
        </CardContent>
      </Card>
    );
  }
  const data = entries.map((e) => ({ label: `#${e.rank} ${e.firstName}`, value: e.score }));
  return (
    <Card className="mt-3">
      <CardContent className="pt-6">
        <CategoryBar data={data} colorIndex={colorIndex} height={Math.max(160, data.length * 34)} />
      </CardContent>
    </Card>
  );
}
