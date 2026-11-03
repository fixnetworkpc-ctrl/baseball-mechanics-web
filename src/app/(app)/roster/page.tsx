"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { getMyPlayers, getMyTeams, overallScore } from "@/lib/team-service";
import { getDevelopmentCard } from "@/lib/practice-service";
import type { DevelopmentCard, MyPlayer, TeamWithRoster } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { RosterCard, type RosterCardPlayer } from "@/components/data-display/roster-card";
import { GradeBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// THE roster — one page for every player this account can see (user decision 2026-11-03:
// "only one dashboard, player roster"). It merges two sources that used to be two pages:
//   - /my-players — players from this account's own analyses (has profile, sessions,
//     development card)
//   - /my-teams   — every player on every team this account belongs to (PMI/HMI/CMI)
// A player who is both (your kid on your team) is ONE card. Merged by name, the only key
// the two sources share.

type Entry = RosterCardPlayer & {
  key: string;
  teamIds: Set<string>;
  teamNames: string[];
  own: MyPlayer | null;
};

const ALL = "all";
type Slot = "pmi" | "hmi" | "cmi";
const MODE_SLOT: Record<string, Slot> = { pitching: "pmi", batting: "hmi", catching: "cmi" };
const nameKey = (n: string) => n.trim().replace(/\s+/g, " ").toLowerCase();
const maxOf = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b));

function mergeRoster(players: MyPlayer[], teams: TeamWithRoster[]): Entry[] {
  const byKey = new Map<string, Entry>();
  for (const t of teams) {
    for (const m of t.roster ?? []) {
      if (!m.name?.trim()) continue;
      const k = nameKey(m.name);
      const e = byKey.get(k) ?? { key: k, name: m.name.trim(), pmi: null, hmi: null, cmi: null, teamIds: new Set(), teamNames: [], own: null };
      e.pmi = maxOf(e.pmi, m.pmi);
      e.hmi = maxOf(e.hmi, m.hmi);
      e.cmi = maxOf(e.cmi, m.cmi);
      if (!e.teamIds.has(t.teamId)) { e.teamIds.add(t.teamId); e.teamNames.push(t.teamName || "Team"); }
      byKey.set(k, e);
    }
  }
  for (const p of players) {
    if (!p.playerName?.trim()) continue;
    const k = nameKey(p.playerName);
    const e = byKey.get(k) ?? { key: k, name: p.playerName.trim(), pmi: null, hmi: null, cmi: null, teamIds: new Set(), teamNames: [], own: null };
    e.own = p;
    // Own-history players carry only their LATEST analysis. Use it to fill that
    // discipline's slot when no team score exists — never to overwrite one.
    const slot = p.latest.mode ? MODE_SLOT[p.latest.mode] : undefined;
    const s = overallScore(p.latest.mechanicsScore);
    if (slot && s != null && e[slot] == null) e[slot] = s;
    byKey.set(k, e);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function subline(e: Entry) {
  const prof = e.own?.profile;
  return [prof?.position, prof?.secondaryPosition].filter(Boolean).join("/") || null;
}

function jersey(e: Entry) {
  const j = e.own?.profile?.jerseyNumber;
  return j != null && String(j).trim() ? String(j).trim() : null;
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<LoadingState rows={4} />}>
      <PlayersInner />
    </Suspense>
  );
}

function PlayersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [players, setPlayers] = useState<MyPlayer[]>([]);
  const [teams, setTeams] = useState<TeamWithRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getMyPlayers(), getMyTeams()]).then(([p, t]) => {
      if (!active) return;
      if (p.status === "fulfilled") setPlayers(p.value);
      if (t.status === "fulfilled") setTeams(t.value.teams);
      // Only an error if BOTH failed — either source alone is still a roster.
      if (p.status === "rejected" && t.status === "rejected") {
        setError(p.reason instanceof Error ? p.reason.message : "Could not load players.");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const roster = useMemo(() => mergeRoster(players, teams), [players, teams]);
  const teamParam = params.get("team");
  const filter = teamParam && teams.some((t) => t.teamId === teamParam) ? teamParam : ALL;
  const shown = filter === ALL ? roster : roster.filter((e) => e.teamIds.has(filter));
  const current = shown.find((e) => e.key === selected) ?? null;

  const setFilter = (v: string | null) => {
    if (!v) return;
    setSelected(null);
    router.replace(v === ALL ? "/roster" : `/roster?team=${encodeURIComponent(v)}`, { scroll: false });
  };

  if (loading) return <LoadingState rows={4} />;

  const filterTeam = teams.find((t) => t.teamId === filter);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Program"
        title="Players"
        subtitle={`${shown.length} ${shown.length === 1 ? "player" : "players"}${filterTeam ? ` on ${filterTeam.teamName || "this team"}` : ""}`}
      />

      {teams.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={filter} onValueChange={(v) => setFilter(v as string | null)}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Filter players by team">
              <SelectValue>
                {(v: string) => (v === ALL ? "All players" : teams.find((t) => t.teamId === v)?.teamName || "Team")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All players</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.teamId} value={t.teamId}>
                  {t.teamName || "Team"}{t.ageDivision ? ` · ${t.ageDivision}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players yet"
          body="Players from your analyses and your teams show up here as cards."
        />
      ) : (
        <>
          {/* Each <li> holds one block child, so the grid tracks are the cards. */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((e) => (
              <li key={e.key}>
                <RosterCard
                  player={e}
                  teamName={filterTeam ? filterTeam.teamName : e.teamNames[0] ?? null}
                  subline={subline(e)}
                  jersey={jersey(e)}
                  selected={current?.key === e.key}
                  onSelect={() => setSelected(current?.key === e.key ? null : e.key)}
                />
              </li>
            ))}
          </ul>
          {current && <PlayerDetails entry={current} onClose={() => setSelected(null)} />}
        </>
      )}
    </div>
  );
}

function PlayerDetails({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const own = entry.own;
  const latest = own?.latest.date ? new Date(own.latest.date).toLocaleDateString() : null;
  return (
    <section aria-label={`${entry.name} details`} className="space-y-3">
      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{entry.name}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  entry.teamNames.length ? entry.teamNames.join(", ") : null,
                  own ? `${own.sessionCount} ${own.sessionCount === 1 ? "session" : "sessions"}` : null,
                  latest && `latest ${latest}`,
                ].filter(Boolean).join(" · ") || "Team player"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {own && <GradeBadge grade={own.latest.grade} />}
              {own?.playerId && (
                <Link
                  href={`/sessions?playerId=${encodeURIComponent(own.playerId)}&name=${encodeURIComponent(own.playerName || "")}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Sessions
                </Link>
              )}
              <button type="button" onClick={onClose} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Close
              </button>
            </div>
          </div>
          {!own && (
            <p className="text-muted-foreground">
              Scores come from this player&apos;s team record. Session history and the development card show for players whose analyses are in your account.
            </p>
          )}
        </CardContent>
      </Card>
      {own?.playerName && <DevelopmentPanel key={own.playerName} playerName={own.playerName} />}
    </section>
  );
}

// One athlete's development card, fetched only when a card is opened — the server route is
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

  return (
    <Card>
      <CardContent className="space-y-3 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Development</p>
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
