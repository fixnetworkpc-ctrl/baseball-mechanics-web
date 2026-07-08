"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAlerts,
  createAlert,
  toggleAlert,
  deleteAlert,
  checkAlerts,
} from "@/lib/recruiter-service";
import type { RecruiterAlert } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Mirrors ALERT_TYPES in baseball-mechanics-app/src/screens/AlertsScreen.js.
const ALERT_TYPES = [
  { type: "PMI_THRESHOLD",   label: "PMI Above",              hasThreshold: true,  placeholder: "80", description: "Triggers when any player's PMI score exceeds your threshold." },
  { type: "CONSISTENCY",     label: "Release Consistency",    hasThreshold: true,  placeholder: "82", description: "Triggers when pitching consistency score exceeds threshold." },
  { type: "HIP_SHOULDER",    label: "Hip-Shoulder Separation", hasThreshold: true, placeholder: "85", description: "Triggers when kineticSequence category score exceeds threshold." },
  { type: "BALANCE",         label: "Balance Score",          hasThreshold: true,  placeholder: "85", description: "Triggers when balance & stability category exceeds threshold." },
  { type: "VELOCITY_GAIN",   label: "Pitch Velocity Gain",    hasThreshold: true,  placeholder: "3",  description: "Triggers when pitching improvement rate ≥ threshold pts/session." },
  { type: "HIGH_PROJECTION", label: "High Projection",        hasThreshold: false, description: "Triggers when a player reaches Elite or High upside tier." },
  { type: "BREAKOUT",        label: "BREAKOUT Status",        hasThreshold: false, description: "Triggers when a rising athlete accelerates ≥ 5 pts/session." },
  { type: "RISING",          label: "RISING Status",          hasThreshold: false, description: "Triggers when any player qualifies as a Rising Athlete." },
  { type: "WINDOW_OPENING",  label: "Window Opening",         hasThreshold: false, description: "Triggers when a player crosses the D1-evaluable threshold with momentum." },
] as const;

const TYPE_META = Object.fromEntries(ALERT_TYPES.map((t) => [t.type, t]));

interface AlertTrigger {
  alertId: string;
  player: {
    playerId?: string;
    playerName: string;
    position?: string | null;
    gradYear?: string | null;
    state?: string | null;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<RecruiterAlert[]>([]);
  const [triggered, setTriggered] = useState<AlertTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selType, setSelType] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getAlerts(), checkAlerts()])
      .then(([al, tr]) => {
        if (!active) return;
        setAlerts(al);
        setTriggered(tr as AlertTrigger[]);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleCheck() {
    setChecking(true);
    try {
      const tr = (await checkAlerts()) as AlertTrigger[];
      setTriggered(tr);
      if (tr.length === 0) toast.info("No conditions triggered right now.");
    } catch {
      toast.error("Could not check alerts. Try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleToggle(a: RecruiterAlert) {
    try {
      await toggleAlert(a.id, !a.enabled);
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, enabled: !a.enabled } : x)));
    } catch {
      toast.error("Could not update alert.");
    }
  }

  async function handleDelete(a: RecruiterAlert) {
    try {
      await deleteAlert(a.id);
      setAlerts((prev) => prev.filter((x) => x.id !== a.id));
      setTriggered((prev) => prev.filter((t) => t.alertId !== a.id));
    } catch {
      toast.error("Could not delete alert.");
    }
  }

  async function handleCreate() {
    if (!selType) return;
    const meta = TYPE_META[selType];
    const thresh = meta?.hasThreshold ? parseFloat(threshold) : undefined;
    if (meta?.hasThreshold && (thresh == null || isNaN(thresh) || thresh < 1 || thresh > 100)) {
      toast.error("Enter a threshold between 1 and 100.");
      return;
    }
    setCreating(true);
    try {
      const config = meta?.hasThreshold ? { threshold: thresh } : {};
      const label = meta?.hasThreshold ? `${meta.label} > ${thresh}` : meta?.label;
      await createAlert(selType, config, label);
      const al = await getAlerts();
      setAlerts(al);
      setAddOpen(false);
      setSelType(null);
      setThreshold("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create alert.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const selMeta = selType ? TYPE_META[selType] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when athletes cross your thresholds
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={checking} onClick={handleCheck}>
            {checking ? "Checking…" : "Check Now"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>New Alert</Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">No alerts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add conditions and get notified when athletes hit your thresholds. Tap “Check Now” any time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const trig = triggered.filter((t) => t.alertId === a.id);
            const meta = TYPE_META[a.type];
            return (
              <Card key={a.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{a.label || a.type}</p>
                      {meta?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      )}
                    </div>
                    <Button
                      variant={a.enabled ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleToggle(a)}
                    >
                      {a.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  {trig.length > 0 && (
                    <div className="space-y-1.5">
                      {trig.slice(0, 5).map((t, i) => {
                        const meta2 = [
                          t.player.position,
                          t.player.gradYear && `'${String(t.player.gradYear).slice(-2)}`,
                          t.player.state,
                        ].filter(Boolean).join(" · ");
                        return (
                          <div key={i} className="flex items-center justify-between text-sm border-l-2 border-l-primary pl-3">
                            <span className="font-medium">{t.player.playerName}</span>
                            {meta2 && <span className="text-xs text-muted-foreground">{meta2}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button variant="link" size="sm" className="px-0 text-destructive" onClick={() => handleDelete(a)}>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setSelType(null); setThreshold(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {ALERT_TYPES.map((at) => (
              <button
                key={at.type}
                type="button"
                onClick={() => setSelType(at.type)}
                className={cn(
                  "w-full text-left rounded-md border p-3 transition-colors",
                  selType === at.type ? "border-primary bg-accent" : "hover:bg-accent"
                )}
              >
                <p className="text-sm font-semibold">{at.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{at.description}</p>
              </button>
            ))}
          </div>
          {selMeta?.hasThreshold && (
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Threshold (1–100)</p>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={selMeta.placeholder}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setSelType(null); setThreshold(""); }}>
              Cancel
            </Button>
            <Button disabled={!selType || creating} onClick={handleCreate}>
              {creating ? "Creating…" : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
