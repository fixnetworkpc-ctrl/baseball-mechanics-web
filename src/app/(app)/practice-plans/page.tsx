"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { getMyPracticePlans } from "@/lib/team-service";
import type { MyPracticePlan } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PracticePlansPage() {
  const [plans, setPlans] = useState<MyPracticePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMyPracticePlans()
      .then((p) => { if (active) setPlans(p); })
      .catch((e) => { if (active) setError(e.message || "Could not load practice plans."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
      ) : plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No saved practice plans"
          body="Practice plans you generate and save in the mobile app appear here."
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

type Segment = { label?: string; name?: string; title?: string; minutes?: number; duration?: number };

function PlanCard({ p }: { p: MyPracticePlan }) {
  const saved = p.savedAt ? new Date(p.savedAt).toLocaleDateString() : null;
  const raw = (p.plan as { segments?: unknown } | null)?.segments;
  const segments: Segment[] = Array.isArray(raw) ? (raw as Segment[]) : [];

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold capitalize">{p.mode || "Practice"} Plan</p>
            <p className="text-xs text-muted-foreground">
              {saved && `Saved ${saved}`}{p.ageDivision && ` · ${p.ageDivision}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {p.totalMinutes != null && <Badge variant="outline">{p.totalMinutes} min</Badge>}
            {p.planConfidence != null && <span className="text-xs text-muted-foreground">Confidence {p.planConfidence}</span>}
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
            {segments.map((seg, i) => {
              const label = seg.label || seg.name || seg.title || `Segment ${i + 1}`;
              const mins = seg.minutes ?? seg.duration;
              return (
                <div key={i} className="flex items-center justify-between border-l-2 pl-3 text-sm">
                  <span>{label}</span>
                  {mins != null && <span className="text-muted-foreground">{mins} min</span>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
