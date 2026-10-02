"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getMyTeams } from "@/lib/team-service";
import type { MyTeamsResponse, LeaderboardEntry, TeamWithRoster } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/data-display/stat-tile";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { CategoryBar } from "@/components/charts/category-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Remembered per browser so a coach who looks at All-Stars stays on All-Stars. A
// convenience only: an unreadable or stale value falls back to the active team.
const PICK_KEY = "bm_portal_team";
const readPick = () => { try { return localStorage.getItem(PICK_KEY); } catch { return null; } };
const writePick = (id: string) => { try { localStorage.setItem(PICK_KEY, id); } catch { /* private mode */ } };

export default function TeamPage() {
  const [data, setData] = useState<MyTeamsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyTeams()
      .then((d) => {
        if (!active) return;
        setData(d);
        const remembered = readPick();
        const ids = d.teams.map((t) => t.teamId);
        setSelectedId(
          remembered && ids.includes(remembered) ? remembered : d.activeTeamId ?? ids[0] ?? null,
        );
      })
      .catch((e) => { if (active) setError(e.message || "Could not load your teams."); })
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

  const teams = data?.teams ?? [];
  if (teams.length === 0) {
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

  // Each payload is that team's own record, so everything below — count, averages,
  // leaderboards, roster — belongs to the selected team and no other.
  const team = teams.find((t) => t.teamId === selectedId) ?? teams[0];
  const subtitle = [team.ageDivision, team.joinCode && `Join code ${team.joinCode}`].filter(Boolean).join(" · ");
  const pick = (id: string | null) => {
    if (!id) return;
    setSelectedId(id);
    writePick(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Program" title={team.teamName || "Team Dashboard"} subtitle={subtitle || undefined} />

      {teams.length > 1 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm text-muted-foreground">Viewing team</span>
          <Select value={team.teamId} onValueChange={(v) => pick(v as string | null)}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Choose a team">
              <SelectValue>
                {(v: string) => teams.find((t) => t.teamId === v)?.teamName || "Team"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.teamId} value={t.teamId}>
                  {t.teamName || "Team"}{t.ageDivision ? ` · ${t.ageDivision}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Players" value={team.totalPlayers} accent="var(--muted-foreground)" />
        <StatTile label="Avg PMI" value={team.avgPMI} accent="var(--chart-1)" />
        <StatTile label="Avg HMI" value={team.avgHMI} accent="var(--chart-2)" />
        <StatTile label="Avg CMI" value={team.avgCMI} accent="var(--chart-3)" />
      </div>

      {/* Keyed on the team so switching teams resets to the first tab cleanly. */}
      <Tabs key={team.teamId} defaultValue="pmi">
        <TabsList>
          <TabsTrigger value="pmi">Pitching</TabsTrigger>
          <TabsTrigger value="hmi">Hitting</TabsTrigger>
          <TabsTrigger value="cmi">Catching</TabsTrigger>
        </TabsList>
        <TabsContent value="pmi"><Board entries={team.pmiLeaderboard} label="PMI" colorIndex={0} /></TabsContent>
        <TabsContent value="hmi"><Board entries={team.hmiLeaderboard} label="HMI" colorIndex={1} /></TabsContent>
        <TabsContent value="cmi"><Board entries={team.cmiLeaderboard} label="CMI" colorIndex={2} /></TabsContent>
      </Tabs>

      <Roster team={team} />
    </div>
  );
}

// Who is on THIS team — the names behind the Players count, so a stray row is visible
// instead of being an unexplained "3".
function Roster({ team }: { team: TeamWithRoster }) {
  const roster = team.roster ?? [];
  if (roster.length === 0) return null;
  const cell = (v: number | null) => (v == null ? "—" : v);
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-3 text-sm font-semibold">Roster</h2>
        <ul className="divide-y divide-border">
          {roster.map((m) => (
            <li key={m.name} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium">{m.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                PMI {cell(m.pmi)} · HMI {cell(m.hmi)} · CMI {cell(m.cmi)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
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
