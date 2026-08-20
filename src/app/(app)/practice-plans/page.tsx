"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMyPracticePlans, getMyTeam } from "@/lib/team-service";
import {
  generatePracticePlan,
  savePracticePlan,
  getTeamDevelopment,
  categoryLabel,
  focusLabel,
} from "@/lib/practice-service";
import {
  PRACTICE_FOCUS,
  PRACTICE_MINUTES,
  type MyPracticePlan,
  type TeamPayload,
  type GenerateResponse,
  type TeamDevelopment,
  type PracticeFocus,
} from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PracticePlansPage() {
  const [plans, setPlans] = useState<MyPracticePlan[]>([]);
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [development, setDevelopment] = useState<TeamDevelopment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focus, setFocus] = useState<PracticeFocus>("pitching");
  const [minutes, setMinutes] = useState<number>(90);
  const [opponentNote, setOpponentNote] = useState("");
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([getMyPracticePlans(), getMyTeam()]);
      setPlans(p);
      setTeam(t.team);
      setError(null);
      // Context for the choice above it, and it doubles as a check that the caller really can
      // act on this team — a non-owner gets 403 here exactly as they would on generate.
      if (t.team?.isOwner) {
        try { setDevelopment(await getTeamDevelopment(t.team.teamId)); } catch { setDevelopment(null); }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load practice plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Awaited inside an async IIFE so the setState calls are not synchronous in the effect body
  // (react-hooks/set-state-in-effect) — same shape as the admin and verification pages.
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);

  async function onGenerate() {
    if (!team) return;
    setGenerating(true);
    try {
      const result = await generatePracticePlan({
        teamId: team.teamId, minutes, focus,
        opponentNote: opponentNote.trim() || undefined,
      });
      setGenerated(result);
      // 🔑 plan:null is a real answer, not a failure — a roster with no analyses in this mode
      // has nothing to plan from. Saying so plainly beats an empty card that reads as broken.
      if (!result.plan) {
        toast.message("Nothing to plan from yet", {
          description: "No one on this roster has an analysis in that mode. Analyze a session in the app first.",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function onSave() {
    if (!team || !generated?.plan) return;
    setSaving(true);
    try {
      const { id } = await savePracticePlan({
        teamId: team.teamId, plan: generated.plan, focus,
        opponentNote: generated.opponentNote,
      });
      toast.success("Practice plan saved.");
      setGenerated(null);
      setOpponentNote("");
      await load();
      return id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState rows={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Program"
        title="Practice Plans"
        subtitle={`${plans.length} saved ${plans.length === 1 ? "plan" : "plans"}`}
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* 🔑 Only the team's owner can generate — that is the server's rule (team.ownerUserId),
          not a guess. Showing the controls to everyone and letting them 403 is the mistake the
          mobile TeamScreen already made once. Members get an explanation instead. */}
      {team?.isOwner ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <h2 className="text-sm font-bold">Build a practice</h2>
            </div>

            {development && development.categories.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs font-semibold">
                  WHAT YOUR ROSTER NEEDS MOST · {development.players} analyzed
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Server-sorted weakest-first. No ranking is computed here. */}
                  {development.categories.slice(0, 3).map((c) => (
                    <Badge key={c.category} variant="secondary">
                      {categoryLabel(c.category)} · {c.average}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Focus</Label>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_FOCUS.map((f) => (
                    <Button
                      key={f}
                      type="button"
                      size="sm"
                      variant={focus === f ? "default" : "outline"}
                      onClick={() => setFocus(f)}
                    >
                      {focusLabel(f)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Length</Label>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_MINUTES.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={minutes === m ? "default" : "outline"}
                      onClick={() => setMinutes(m)}
                    >
                      {m}m
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent note (optional)</Label>
              <Input
                id="opponent"
                value={opponentNote}
                onChange={(e) => setOpponentNote(e.target.value)}
                placeholder="Anything about the next opponent"
                maxLength={500}
              />
              {/* Stated plainly so a coach does not expect it to change the plan. */}
              <p className="text-muted-foreground text-xs">
                Saved with the practice as context. It does not affect any score or drill choice.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onGenerate} disabled={generating}>
                {generating ? "Generating…" : "Generate"}
              </Button>
              {generated?.plan && (
                <Button variant="outline" onClick={onSave} disabled={saving}>
                  {saving ? "Saving…" : "Save this plan"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : team ? (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-sm">
            Only the coach who created this team can build practice plans for it.
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No team yet"
          body="Create or join a team in the mobile app, then build practices for it here."
        />
      )}

      {generated?.plan && <GeneratedPreview result={generated} />}

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No saved practice plans"
          body="Plans you build here, or save in the mobile app, appear in this list."
        />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <PlanCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeneratedPreview({ result }: { result: GenerateResponse }) {
  const plan = result.plan!;
  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Generated practice</p>
            <p className="text-muted-foreground text-xs">
              {plan.totalPlayers} {plan.totalPlayers === 1 ? "player" : "players"} ·{" "}
              {plan.wallClockMinutes ?? plan.totalMinutes} min · {focusLabel(result.mode)}
            </p>
          </div>
          {/* §8: every plan is explainable later. Surfaced, not hidden in the record. */}
          <span className="text-muted-foreground shrink-0 text-xs">
            Mechanics Engine v{result.engineVersion}
          </span>
        </div>

        {plan.focusThemes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {plan.focusThemes.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        )}

        {/* 🔑 Named, not silently dropped. A coach who sees 9 of 11 players needs to know which
            two were left out and why, or they will assume the plan covers everyone. */}
        {result.excludedPlayers.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Not included (no analysis in this mode yet): {result.excludedPlayers.join(", ")}
          </p>
        )}

        <div className="space-y-1.5 pt-1">
          {plan.segments.map((seg) => (
            <div key={seg.segmentId} className="flex items-start justify-between gap-3 border-l-2 pl-3 text-sm">
              <div>
                <p>{seg.title}</p>
                {seg.drills && seg.drills.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {seg.drills.map((d) => d.drillName).filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {seg.durationMinutes != null && (
                <span className="text-muted-foreground shrink-0">{seg.durationMinutes} min</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ p }: { p: MyPracticePlan }) {
  const saved = p.savedAt ? new Date(p.savedAt).toLocaleDateString() : null;
  const raw = (p.plan as { segments?: unknown } | null)?.segments;
  const segments = Array.isArray(raw) ? (raw as { segmentId?: string; title?: string; durationMinutes?: number }[]) : [];

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/practice-plans/${encodeURIComponent(p.id)}`} className="font-semibold hover:underline">
              {p.mode ? `${focusLabel(p.mode)} Plan` : "Practice Plan"}
            </Link>
            <p className="text-muted-foreground text-xs">
              {saved && `Saved ${saved}`}{p.ageDivision && ` · ${p.ageDivision}`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {p.totalMinutes != null && <Badge variant="outline">{p.totalMinutes} min</Badge>}
            {p.planConfidence != null && (
              <span className="text-muted-foreground text-xs">Confidence {p.planConfidence}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {p.totalPlayers != null && <Badge variant="secondary">{p.totalPlayers} players</Badge>}
          {p.focusThemes.map((t) => (
            <Badge key={t} variant="secondary" className="capitalize">{t}</Badge>
          ))}
        </div>

        {segments.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {segments.map((seg, i) => (
              <div key={seg.segmentId || i} className="flex items-center justify-between border-l-2 pl-3 text-sm">
                <span>{seg.title || `Segment ${i + 1}`}</span>
                {seg.durationMinutes != null && (
                  <span className="text-muted-foreground">{seg.durationMinutes} min</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
