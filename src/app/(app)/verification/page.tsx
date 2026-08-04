"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingVerifications,
  resolveVerification,
  getCoachProfile,
  saveCoachProfile,
} from "@/lib/recruiter-service";
import type { PendingVerification, CoachProfile } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CLAIM_LABELS: Record<string, string> = {
  sixty: "60 Yard Dash",
  exit_velo: "Exit Velocity",
  pitch_velo: "Pitch Velocity",
  pop_time: "Pop Time",
  height: "Height",
  weight: "Weight",
};

/**
 * A coach's inbound verification queue.
 *
 * ⚠️ This list arrives ALREADY filtered by the server: /verification/pending matches on the
 * email the athlete typed, then discards anything the caller has no real authority over.
 * Nothing here re-derives permission and nothing here should — a client that decides what a
 * coach may answer is a client that can be told to decide otherwise.
 */
export default function VerificationPage() {
  const [requests, setRequests] = useState<PendingVerification[]>([]);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, rows] = await Promise.all([getCoachProfile(), getPendingVerifications()]);
      setProfile(p);
      setRequests(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load verification requests.");
    } finally {
      setLoading(false);
    }
  }

  async function createProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await saveCoachProfile({ displayName: name.trim(), schoolOrTeam: team.trim() || undefined });
      toast.success("Coach profile saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your coach profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  useEffect(() => {
    void (async () => { await load(); })();
  }, []);

  async function decide(row: PendingVerification, decision: "approved" | "rejected") {
    setBusyId(row.id);
    try {
      // By id, not by token: only the sha256 of a token is ever stored, so the server
      // physically cannot hand this page a usable one. Authority is re-resolved server-side.
      await resolveVerification(row.id, decision);
      toast.success(decision === "approved" ? "Verified." : "Recorded as not accurate.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that decision.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrity"
        title="Verification Requests"
        subtitle="Athletes you coach have asked you to confirm a specific measurable"
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState icon={BadgeCheck} title="Could not load" body={error} />
      ) : !profile ? (
        /* 🔑 A coach profile is required before any request can be answered — the server
           resolves the verifier through it. Creating one grants NOTHING on its own:
           authority over a specific athlete still comes from team or organization
           membership, which a coach cannot self-assign. That is why this is a plain form
           and not an approval queue. */
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-sm font-bold">Set up your coach profile</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Your name appears on every measurable you verify. This does not grant you
                access to anyone — you can only verify athletes already on your team or in
                your organization.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach-name">Your name</Label>
              <Input
                id="coach-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coach Smith"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach-team">School or team (optional)</Label>
              <Input
                id="coach-team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="e.g. Northview HS"
                maxLength={120}
              />
            </div>
            <Button disabled={!name.trim() || savingProfile} onClick={createProfile}>
              {savingProfile ? "Saving…" : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Nothing waiting"
          body="When an athlete you coach asks you to confirm a measurable, it appears here. You can also answer directly from the email."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="text-sm font-bold">{row.playerName}</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground text-sm">
                    {CLAIM_LABELS[row.claim_field] ?? row.claim_field}
                  </span>
                  <span className="text-2xl font-extrabold">{row.claim_value}</span>
                </div>
                {/* The specific number, stated plainly. A coach asked to "verify this
                    athlete" has been asked nothing they can meaningfully agree to. */}
                <p className="text-muted-foreground text-xs">
                  You are confirming this exact value, not the profile as a whole. It is
                  recorded against your name, and stops applying if the athlete changes it.
                </p>
                <div className="flex gap-2">
                  <Button disabled={busyId === row.id} onClick={() => decide(row, "approved")}>
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => decide(row, "rejected")}
                  >
                    Not Accurate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
