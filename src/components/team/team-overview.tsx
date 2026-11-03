"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { getMyTeams } from "@/lib/team-service";
import type { MyTeamsResponse, LeaderboardEntry } from "@/lib/types";
import { StatTile } from "@/components/data-display/stat-tile";
import { LoadingState } from "@/components/feedback/loading-state";
import { CategoryBar } from "@/components/charts/category-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// The team half of the Dashboard: team picker, averages and leaderboards. This was the
// whole of the old /team "Team Dashboard" page minus its roster — the roster now lives on
// Players as cards, so there is ONE dashboard and ONE roster (user decision 2026-11-03).
//
// Renders nothing for an account with no team: the Dashboard must not grow an empty block.

// Remembered per browser so a coach who looks at All-Stars stays on All-Stars. A
// convenience only: an unreadable or stale value falls back to the active team.
export const TEAM_PICK_KEY = "bm_portal_team";
const readPick = () => { try { return localStorage.getItem(TEAM_PICK_KEY); } catch { return null; } };
const writePick = (id: string) => { try { localStorage.setItem(TEAM_PICK_KEY, id); } catch { /* private mode */ } };

export function TeamOverview() {
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
        setSelectedId(remembered && ids.includes(remembered) ? remembered : d.activeTeamId ?? ids[0] ?? null);
      })
      .catch((e) => { if (active) setError(e.message || "Could not load your teams."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState rows={2} />;
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  const teams = data?.teams ?? [];
  if (teams.length === 0) return null;

  const team = teams.find((t) => t.teamId === selectedId) ?? teams[0];
  const subtitle = [team.ageDivision, team.joinCode && `Join code ${team.joinCode}`].filter(Boolean).join(" · ");
  const pick = (id: string | null) => {
    if (!id) return;
    setSelectedId(id);
    writePick(id);
  };

  return (
    <section aria-labelledby="team-overview-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-muted-foreground" />
            <h2 id="team-overview-heading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team</h2>
          </div>
          <p className="mt-1 truncate text-lg font-semibold">{team.teamName || "Team"}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {teams.length > 1 && (
            <Select value={team.teamId} onValueChange={(v) => pick(v as string | null)}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Choose a team">
                <SelectValue>{(v: string) => teams.find((t) => t.teamId === v)?.teamName || "Team"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.teamId} value={t.teamId}>
                    {t.teamName || "Team"}{t.ageDivision ? ` · ${t.ageDivision}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link
            href={`/roster?team=${encodeURIComponent(team.teamId)}`}
            className="rounded-sm text-sm text-brand-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View player cards
          </Link>
        </div>
      </div>

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
    </section>
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
