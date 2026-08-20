"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Play, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  getPracticePlan,
  startPractice,
  recordObservations,
  completePractice,
  buildHighlights,
  focusLabel,
} from "@/lib/practice-service";
import type { PracticePlanDetail, PracticeHighlights } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/feedback/loading-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Draft = { attended: boolean; winTag: string; coachNote: string };

export default function PracticeRunPage() {
  const params = useParams<{ id: string }>();
  const planId = String(params?.id || "");

  const [detail, setDetail] = useState<PracticePlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [highlights, setHighlights] = useState<PracticeHighlights | null>(null);
  const [observedWins, setObservedWins] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getPracticePlan(planId);
      setDetail(d);
      setCompleted(new Set(d.plan.segmentsCompleted));
      setHighlights(d.highlights);
      // Re-open what was already recorded, so a coach revising mid-practice edits their own
      // notes rather than starting from blank and accidentally clearing them.
      const seeded: Record<string, Draft> = {};
      for (const o of d.observations) {
        seeded[o.playerName] = {
          attended: o.attended,
          winTag: o.winTag || "",
          coachNote: o.coachNote || "",
        };
      }
      setDrafts(seeded);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that practice plan.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  // Awaited inside an async IIFE so the setState calls are not synchronous in the effect body
  // (react-hooks/set-state-in-effect) — same shape as the admin and verification pages.
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);

  if (loading) return <LoadingState rows={4} />;
  if (error || !detail) {
    return <EmptyState icon={Trophy} title="Could not load this practice" body={error || "Not found."} />;
  }

  const { plan } = detail;
  const segments = plan.plan?.segments || [];
  // Every player named anywhere in the plan. Union across segments, because a player can
  // appear in one block and not another.
  const players = [...new Set(segments.flatMap((s) => s.players || []))].sort();

  const draftFor = (name: string): Draft =>
    drafts[name] || { attended: true, winTag: "", coachNote: "" };
  const setDraft = (name: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [name]: { ...draftFor(name), ...patch } }));

  async function run<T>(fn: () => Promise<T>, ok: string) {
    setBusy(true);
    try {
      const result = await fn();
      if (ok) toast.success(ok);
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const onStart = () => run(async () => { await startPractice(planId); await load(); }, "Practice started.");

  const onSaveObservations = () =>
    run(async () => {
      await recordObservations(
        planId,
        players.map((name) => {
          const d = draftFor(name);
          return {
            playerName: name,
            attended: d.attended,
            // 🔴 Empty stays null, never "". "Nothing observed" has to remain distinguishable
            // from "observed, and it was nothing" — the report depends on that difference.
            winTag: d.winTag.trim() || null,
            coachNote: d.coachNote.trim() || null,
          };
        }),
      );
      await load();
    }, "Observations saved.");

  const onComplete = () =>
    run(async () => { await completePractice(planId, [...completed]); await load(); }, "Practice complete.");

  const onHighlights = () =>
    run(async () => {
      const r = await buildHighlights(planId);
      setHighlights(r.report);
      setObservedWins(r.observationCount);
    }, "Highlights built.");

  return (
    <div className="space-y-6">
      <Link href="/practice-plans" className="text-muted-foreground text-sm hover:underline">
        ← Back to Practice Plans
      </Link>
      <PageHeader
        eyebrow="Run Practice"
        title={plan.mode || plan.plan?.mode ? `${focusLabel(plan.mode || plan.plan?.mode)} Practice` : "Practice"}
        subtitle={[
          plan.savedAt ? new Date(plan.savedAt).toLocaleDateString() : null,
          plan.totalPlayers != null ? `${plan.totalPlayers} players` : null,
          plan.totalMinutes != null ? `${plan.totalMinutes} min` : null,
        ].filter(Boolean).join(" · ")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={plan.status === "complete" ? "secondary" : "outline"} className="capitalize">
          {plan.status}
        </Badge>
        {plan.engineVersion != null && (
          <span className="text-muted-foreground text-xs">Mechanics Engine v{plan.engineVersion}</span>
        )}
        {plan.status !== "running" && plan.status !== "complete" && (
          <Button size="sm" onClick={onStart} disabled={busy}>
            <Play className="mr-1 h-3.5 w-3.5" /> Start practice
          </Button>
        )}
      </div>

      {plan.opponentNote && (
        <Card>
          <CardContent className="py-4 text-sm">
            <span className="text-muted-foreground text-xs font-semibold">OPPONENT NOTE · CONTEXT ONLY</span>
            <p className="mt-1">{plan.opponentNote}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <h2 className="text-sm font-bold">Segments</h2>
          {/* 🔴 Only a segment CHECKED here counts as done. That box is the evidence behind
              every "Worked on …" line in the report — an unchecked block contributes nothing,
              no matter that it was on the plan. */}
          {segments.map((seg) => (
            <label key={seg.segmentId} className="flex cursor-pointer items-start gap-3 border-l-2 pl-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={completed.has(seg.segmentId)}
                onChange={(e) =>
                  setCompleted((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(seg.segmentId);
                    else next.delete(seg.segmentId);
                    return next;
                  })
                }
              />
              <span className="flex-1">
                <span className="block">{seg.title}</span>
                {seg.drills && seg.drills.length > 0 && (
                  <span className="text-muted-foreground block text-xs">
                    {seg.drills.map((d) => d.drillName).filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              {seg.durationMinutes != null && (
                <span className="text-muted-foreground shrink-0">{seg.durationMinutes} min</span>
              )}
            </label>
          ))}
          <Button size="sm" variant="outline" onClick={onComplete} disabled={busy}>
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark practice complete
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-sm font-bold">What you saw</h2>
            {/* The instruction that keeps the whole report honest. */}
            <p className="text-muted-foreground mt-1 text-xs">
              Record only what you actually observed. Leaving a player blank is fine — they
              simply will not appear in the highlights. Nothing is filled in for you.
            </p>
          </div>

          {players.length === 0 ? (
            <p className="text-muted-foreground text-sm">This plan names no players.</p>
          ) : (
            players.map((name) => {
              const d = draftFor(name);
              return (
                <div key={name} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{name}</p>
                    <label className="text-muted-foreground flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={d.attended}
                        onChange={(e) => setDraft(name, { attended: e.target.checked })}
                      />
                      Attended
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`win-${name}`} className="text-xs">Something you saw</Label>
                      <Input
                        id={`win-${name}`}
                        value={d.winTag}
                        onChange={(e) => setDraft(name, { winTag: e.target.value })}
                        placeholder="e.g. stayed closed through release"
                        maxLength={200}
                        disabled={!d.attended}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`note-${name}`} className="text-xs">Note (optional)</Label>
                      <Input
                        id={`note-${name}`}
                        value={d.coachNote}
                        onChange={(e) => setDraft(name, { coachNote: e.target.value })}
                        maxLength={500}
                        disabled={!d.attended}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <Button size="sm" onClick={onSaveObservations} disabled={busy || players.length === 0}>
            Save observations
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <h2 className="text-sm font-bold">Today&apos;s Practice Highlights</h2>
          </div>

          <Button size="sm" variant="outline" onClick={onHighlights} disabled={busy}>
            Build highlights
          </Button>

          {highlights && (
            <div className="space-y-3 pt-1">
              {highlights.segmentsCompleted.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Completed: {highlights.segmentsCompleted.join(" · ")}
                </p>
              )}

              {/* 🔴 A player with nothing recorded is ABSENT from this list by design — the
                  server never sends an empty entry, and this must never render a placeholder
                  row to fill the space. An empty report is honest; an invented line gets read
                  aloud to a child. */}
              {highlights.players.length === 0 ? (
                <p className="text-sm">
                  Nothing was recorded for this practice
                  {observedWins === 0 ? " — a quiet day, honestly reported." : "."}
                </p>
              ) : (
                highlights.players.map((p) => (
                  <div key={p.playerName} className="border-l-2 pl-3">
                    <p className="text-sm font-semibold">{p.playerName}</p>
                    <ul className="text-muted-foreground mt-1 space-y-0.5 text-sm">
                      {p.highlights.map((h, i) => (
                        <li key={i}>· {h}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
