"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMySessions, overallScore } from "@/lib/team-service";
import type { MySession } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function SessionsInner() {
  const params = useSearchParams();
  const playerId = params.get("playerId") || undefined;
  const mode = params.get("mode") || undefined;
  const name = params.get("name") || undefined;

  const [sessions, setSessions] = useState<MySession[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextCursor?: string) => {
      const res = await getMySessions({ playerId, mode, cursor: nextCursor });
      setSessions((prev) => (nextCursor ? [...prev, ...res.sessions] : res.sessions));
      setCursor(res.nextCursor);
    },
    [playerId, mode]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
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
      await load(cursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const title = name ? `${name} — Sessions` : "Session History";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length}{cursor ? "+" : ""} {sessions.length === 1 ? "session" : "sessions"}
            {mode && ` · ${mode}`}
          </p>
        </div>
        {(playerId || mode) && (
          <Link href="/roster" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Roster
          </Link>
        )}
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">No sessions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analyses you run in the mobile app will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
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
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold truncate">{s.playerName || "Unknown player"}</p>
            <p className="text-xs text-muted-foreground">
              {date}{s.mode && ` · `}
              {s.mode && <span className="capitalize">{s.mode}</span>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {s.grade && <Badge variant="outline">Grade {s.grade}</Badge>}
            {score != null && <Badge variant="secondary">MIS {score}</Badge>}
          </div>
        </div>

        {s.summary && <p className="text-sm text-muted-foreground">{s.summary}</p>}

        <div className="flex flex-wrap gap-2">
          {s.strengthsCount != null && (
            <Badge variant="secondary">{s.strengthsCount} strengths</Badge>
          )}
          {s.opportunitiesCount != null && (
            <Badge variant="secondary">{s.opportunitiesCount} opportunities</Badge>
          )}
          {s.frameLabels.length > 0 && (
            <Badge variant="secondary">{s.frameLabels.length} frames</Badge>
          )}
        </div>

        {s.coachNote && (
          <p className="text-sm italic text-muted-foreground border-l-2 pl-3">{s.coachNote}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-56" />}>
      <SessionsInner />
    </Suspense>
  );
}
