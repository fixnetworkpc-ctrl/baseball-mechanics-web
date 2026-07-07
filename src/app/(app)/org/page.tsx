"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrg, joinOrg, getMyOrgs, getOrgAnalytics } from "@/lib/org-service";
import type { Org, OrgAnalytics } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FilterChips } from "@/components/filter-chips";

const ORG_TYPES = ["Travel Ball", "Academy", "HS Program", "Showcase Org", "Other"];

export default function OrgPortalPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, OrgAnalytics | null>>({});
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Travel Ball");
  const [state, setState] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);

  async function load() {
    try {
      const myOrgs = await getMyOrgs();
      setOrgs(myOrgs || []);
      if (myOrgs?.length) {
        const entries = await Promise.all(
          myOrgs.map(async (org) => {
            try {
              return [org.id, await getOrgAnalytics(org.id)] as const;
            } catch {
              return [org.id, null] as const;
            }
          })
        );
        setAnalytics(Object.fromEntries(entries));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load organizations.");
    }
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createOrg(name.trim(), type, state.trim().toUpperCase());
      setCreateOpen(false);
      setName(""); setState("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await joinOrg(code.trim().toUpperCase(), playerName.trim() || undefined);
      setJoinOpen(false);
      setCode(""); setPlayerName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code or join failed.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Travel ball, academy, and program management</p>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => setCreateOpen(true)}>+ Create Org</Button>
        <Button variant="outline" className="flex-1" onClick={() => setJoinOpen(true)}>Join with Code</Button>
      </div>

      {orgs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">No organizations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a travel ball organization or academy, then invite coaches, parents, and players using your org&apos;s invite code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} analytics={analytics[org.id]} onOpen={() => router.push(`/org/${org.id}`)} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization name</Label>
              <Input placeholder="e.g. Elite Baseball Academy" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <FilterChips options={ORG_TYPES.map((t) => ({ key: t, label: t }))} value={type} onChange={(v) => v && setType(v)} />
            </div>
            <div className="space-y-2">
              <Label>State (optional)</Label>
              <Input className="w-20 uppercase" maxLength={2} placeholder="MI" value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} />
            </div>
            <p className="text-xs text-muted-foreground">
              An invite code will be generated automatically. Share it with coaches, parents, and players to join your org.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name.trim() || creating} onClick={handleCreate}>
              {creating ? "Creating…" : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Join Organization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invite code</Label>
              <Input placeholder="ABC123" className="uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Player name (optional)</Label>
              <Input placeholder="If joining as a player" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button disabled={!code.trim() || joining} onClick={handleJoin}>
              {joining ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrgCard({
  org,
  analytics,
  onOpen,
}: {
  org: Org;
  analytics: OrgAnalytics | null | undefined;
  onOpen: () => void;
}) {
  const role = org.role || "player";

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary" onClick={onOpen}>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{org.name}</p>
            <p className="text-xs text-muted-foreground">
              {[org.type, org.state, role.toUpperCase()].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-4 gap-2">
            <StatChip label="Members" val={analytics.memberCount ?? "—"} />
            <StatChip label="Avg PMI" val={analytics.avgPMI ?? "—"} />
            <StatChip label="Avg HMI" val={analytics.avgHMI ?? "—"} />
            <StatChip label="Improving" val={analytics.improvementRate != null ? `${analytics.improvementRate}%` : "—"} />
          </div>
        )}

        {org.invite_code && role === "owner" && (
          <div className="flex items-center gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground">Invite Code</span>
            <span className="font-bold tracking-widest">{org.invite_code}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatChip({ label, val }: { label: string; val: string | number }) {
  return (
    <div className="rounded-md bg-muted p-2 text-center">
      <p className="text-sm font-bold">{val}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
