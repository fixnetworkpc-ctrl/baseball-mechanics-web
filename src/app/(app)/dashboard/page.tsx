"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Star, ClipboardList, Search, Sparkles, Compass, TrendingUp } from "lucide-react";
import {
  getRecruiterProfile,
  getFavorites,
  getNotifications,
} from "@/lib/recruiter-service";
import { getMyPlayers, getMySessions, getMyTeam, getMyPracticePlans, overallScore } from "@/lib/team-service";
import type {
  RecruiterProfile,
  RecruiterFavorite,
  AppNotification,
  MyPlayer,
  MySession,
  MyPracticePlan,
  MyTeamResponse,
} from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/data-display/stat-tile";
import { ScoreCard } from "@/components/data-display/score-card";
import { PlayerCard } from "@/components/data-display/player-card";
import { GradeBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { StatRowSkeleton, LoadingState } from "@/components/feedback/loading-state";
import { TrendLine } from "@/components/charts/trend-line";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrendPoint = { label: string; score: number };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [players, setPlayers] = useState<MyPlayer[]>([]);
  const [recent, setRecent] = useState<MySession[]>([]);
  const [team, setTeam] = useState<MyTeamResponse | null>(null);
  const [plans, setPlans] = useState<MyPracticePlan[]>([]);
  const [favorites, setFavorites] = useState<RecruiterFavorite[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendName, setTrendName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [prof, plys, sess, tm, pls, favs, notes] = await Promise.allSettled([
        getRecruiterProfile(),
        getMyPlayers(),
        getMySessions({ limit: 6 }),
        getMyTeam(),
        getMyPracticePlans(),
        getFavorites(),
        getNotifications(),
      ]);
      if (!active) return;
      if (prof.status === "fulfilled") setProfile(prof.value);
      const playerList = plys.status === "fulfilled" ? plys.value : [];
      setPlayers(playerList);
      if (sess.status === "fulfilled") setRecent(sess.value.sessions);
      if (tm.status === "fulfilled") setTeam(tm.value);
      if (pls.status === "fulfilled") setPlans(pls.value);
      if (favs.status === "fulfilled") setFavorites(favs.value);
      if (notes.status === "fulfilled") setNotifications(notes.value);

      // Build a score trend from the most-active player's sessions.
      const top = [...playerList]
        .filter((p) => p.playerId)
        .sort((a, b) => b.sessionCount - a.sessionCount)[0];
      if (top?.playerId) {
        try {
          const { sessions } = await getMySessions({ playerId: top.playerId, limit: 12 });
          const pts = sessions
            .map((s) => ({ date: s.date, score: overallScore(s.mechanicsScore) }))
            .filter((p): p is { date: string | null; score: number } => p.score != null)
            .reverse()
            .map((p) => ({
              label: p.date ? new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
              score: p.score,
            }));
          if (active && pts.length >= 2) {
            setTrend(pts);
            setTrendName(top.playerName);
          }
        } catch { /* no-op */ }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const orgLine = [profile?.college || profile?.organization, profile?.division, profile?.conference]
    .filter(Boolean)
    .join(" · ");
  const totalAnalyses = players.reduce((sum, p) => sum + p.sessionCount, 0);
  const unread = notifications.filter((n) => !n.read).length;
  const latest = recent[0];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2"><div className="h-8 w-64 animate-pulse rounded bg-muted" /></div>
        <StatRowSkeleton />
        <LoadingState rows={2} withTitle={false} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle={orgLine || "Your scouting and player-development command center"}
        actions={
          <>
            <Link href="/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Search /> Search
            </Link>
            <Link href="/discover" className={buttonVariants({ size: "sm" })}>
              <Compass /> Discover
            </Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Players" value={players.length} accent="var(--chart-1)" hint="in your history" />
        <StatTile label="Analyses" value={totalAnalyses} accent="var(--chart-3)" hint="total sessions" />
        <StatTile label="Favorites" value={favorites.length} accent="var(--primary)" hint="on your watchlist" />
        <StatTile label="Unread" value={unread} accent="var(--chart-4)" hint="notifications" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Score trend */}
          <section className="space-y-3">
            <SectionTitle icon={TrendingUp} title="Score Trend" href={trendName ? "/roster" : undefined} />
            <Card>
              <CardContent className="pt-6">
                {trend.length >= 2 ? (
                  <>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Mechanics score over time — <span className="font-semibold text-foreground">{trendName}</span>
                    </p>
                    <TrendLine data={trend} series={[{ key: "score", name: "MIS" }]} />
                  </>
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title="Not enough data yet"
                    body="Once a player has two or more analyses, their mechanics-score trend appears here."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Recent analyses */}
          <section className="space-y-3">
            <SectionTitle title="Recent Analyses" href={recent.length ? "/sessions" : undefined} />
            {recent.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No analyses yet"
                body="Analyses run in the mobile app show up here as they sync."
              />
            ) : (
              <div className="space-y-2">
                {recent.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{s.playerName || "Unknown player"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.date ? new Date(s.date).toLocaleDateString() : "—"}
                          {s.mode && <span className="capitalize"> · {s.mode}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {typeof overallScore(s.mechanicsScore) === "number" && (
                          <Badge variant="secondary">MIS {overallScore(s.mechanicsScore)}</Badge>
                        )}
                        <GradeBadge grade={s.grade} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Latest result headline */}
          {latest && (
            <section className="space-y-3">
              <SectionTitle title="Most Recent Result" />
              <ScoreCard
                title={latest.playerName || "Latest analysis"}
                score={overallScore(latest.mechanicsScore) ?? 0}
                grade={latest.grade}
                footer={latest.date ? new Date(latest.date).toLocaleDateString() : undefined}
              />
            </section>
          )}

          {/* Team snapshot */}
          <section className="space-y-3">
            <SectionTitle title="Team" href={team?.membership ? "/team" : undefined} />
            {team?.team ? (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <p className="font-semibold">{team.team.teamName}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["PMI", team.team.avgPMI], ["HMI", team.team.avgHMI], ["CMI", team.team.avgCMI]].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg bg-secondary py-2">
                        <p className="text-lg font-extrabold tabular-nums">{(v as number) ?? "—"}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{k as string}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EmptyState icon={Users} title="No team" body="Join or create a team in the app to track it here." />
            )}
          </section>

          {/* AI Recruit action (no fabricated insights) */}
          <Link href="/ai-recruit" className="block">
            <Card className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <span className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <CardContent className="relative flex items-center gap-3 py-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">AI Recruit Assistant</p>
                  <p className="text-xs text-muted-foreground">Describe the player you want — let AI rank matches.</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Latest practice plan */}
          {plans[0] && (
            <section className="space-y-3">
              <SectionTitle icon={ClipboardList} title="Latest Practice Plan" href="/practice-plans" />
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <p className="font-semibold capitalize">{plans[0].mode || "Practice"} Plan</p>
                  <div className="flex flex-wrap gap-2">
                    {plans[0].totalMinutes != null && <Badge variant="outline">{plans[0].totalMinutes} min</Badge>}
                    {plans[0].totalPlayers != null && <Badge variant="secondary">{plans[0].totalPlayers} players</Badge>}
                    {plans[0].focusThemes.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Favorites quick list */}
          <section className="space-y-3">
            <SectionTitle icon={Star} title="Favorites" href={favorites.length ? "/favorites" : undefined} />
            {favorites.length === 0 ? (
              <EmptyState icon={Star} title="No favorites" body="Save players from Search to build your watchlist." />
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 3).map((f) => {
                  const snap = f.snapshot as { position?: string; gradYear?: string; pmi?: number; hmi?: number };
                  return (
                    <PlayerCard
                      key={f.id}
                      name={f.player_name}
                      meta={[snap.position, snap.gradYear && `'${String(snap.gradYear).slice(-2)}`].filter(Boolean).join(" · ")}
                      pmi={snap.pmi}
                      hmi={snap.hmi}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  icon: Icon,
  href,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {href && (
        <Link href={href} className={cn("ml-auto text-sm text-primary hover:underline")}>
          View all
        </Link>
      )}
    </div>
  );
}
