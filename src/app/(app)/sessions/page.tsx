"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMySessions, overallScore } from "@/lib/team-service";
import type { MySession } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { GradeBadge } from "@/components/data-display/badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { TrendLine } from "@/components/charts/trend-line";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

function SessionsInner({
  playerId,
  mode,
  name,
}: {
  playerId?: string;
  mode?: string;
  name?: string;
}) {
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No synchronous loading/error reset here: the caller remounts this component
  // via `key` when playerId/mode change, so state starts fresh on every query.
  useEffect(() => {
    let active = true;
    getMySessions({ playerId, mode })
      .then((res) => {
        if (!active) return;
        setSessions(res.sessions);
        setCursor(res.nextCursor);
      })
      .catch((e) => { if (active) setError(e.message || "Could not load sessions."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [playerId, mode]);

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await getMySessions({ playerId, mode, cursor });
      setSessions((prev) => [...prev, ...res.sessions]);
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <LoadingState rows={4} />;

  // Trend from numeric mechanics scores, oldest→newest (only meaningful per player).
  const trend = playerId
    ? sessions
        .map((s) => ({ date: s.date, score: overallScore(s.mechanicsScore) }))
        .filter((p): p is { date: string | null; score: number } => p.score != null)
        .reverse()
        .map((p) => ({
          label: p.date ? new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
          score: p.score,
        }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={name ? "Player" : "My Program"}
        title={name ? `${name}` : "Session History"}
        subtitle={`${sessions.length}${cursor ? "+" : ""} ${sessions.length === 1 ? "session" : "sessions"}${mode ? ` · ${mode}` : ""}`}
        actions={
          (playerId || mode) && (
            <Link href="/roster" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Back to Roster
            </Link>
          )
        }
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Users} title="No sessions found" body="Analyses you run in the mobile app will show up here." />
      ) : (
        <>
          {trend.length >= 2 && (
            <Card>
              <CardContent className="pt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mechanics Score Trend</p>
                <TrendLine data={trend} series={[{ key: "score", name: "MIS" }]} />
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} s={s} />
            ))}
          </div>

          {cursor && (
            <div className="flex justify-center">
              <Button variant="outline" disabled={loadingMore} onClick={handleLoadMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionCard({ s }: { s: MySession }) {
  const score = overallScore(s.mechanicsScore);
  const date = s.date ? new Date(s.date).toLocaleDateString() : "—";
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{s.playerName || "Unknown player"}</p>
            <p className="text-xs text-muted-foreground">
              {date}{s.mode && <span className="capitalize"> · {s.mode}</span>}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {score != null && <Badge variant="secondary">MIS {score}</Badge>}
            <GradeBadge grade={s.grade} />
          </div>
        </div>
        {s.summary && <p className="text-sm text-muted-foreground">{s.summary}</p>}
        <div className="flex flex-wrap gap-2">
          {s.strengthsCount != null && <Badge variant="secondary">{s.strengthsCount} strengths</Badge>}
          {s.opportunitiesCount != null && <Badge variant="secondary">{s.opportunitiesCount} opportunities</Badge>}
          {s.frameLabels.length > 0 && <Badge variant="secondary">{s.frameLabels.length} frames</Badge>}
        </div>
        {s.coachNote && <p className="border-l-2 border-l-primary pl-3 text-sm italic text-muted-foreground">{s.coachNote}</p>}
      </CardContent>
    </Card>
  );
}

// Reads the query string and remounts SessionsInner whenever it changes, so the
// fetch component never has to reset its own state mid-life.
function SessionsRoute() {
  const params = useSearchParams();
  const playerId = params.get("playerId") || undefined;
  const mode = params.get("mode") || undefined;
  const name = params.get("name") || undefined;

  return (
    <SessionsInner
      key={`${playerId ?? ""}|${mode ?? ""}`}
      playerId={playerId}
      mode={mode}
      name={name}
    />
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<LoadingState rows={4} />}>
      <SessionsRoute />
    </Suspense>
  );
}
