"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMyOrgs, getOrgAnalytics } from "@/lib/org-service";
import type { OrgAnalytics } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [orgs, data] = await Promise.all([getMyOrgs(), getOrgAnalytics(id)]);
        if (!active) return;
        setOrgName(orgs.find((o) => o.id === id)?.name ?? null);
        setAnalytics(data);
      } catch (err) {
        if (active) toast.error(err instanceof Error ? err.message : "Could not load organization dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

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
        <Button variant="link" className="px-0 mb-2" onClick={() => router.push("/org")}>← Back to Organizations</Button>
        <h1 className="text-2xl font-bold tracking-tight">{orgName ?? "Organization"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Roster overview and team-wide mechanics stats</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Members" val={analytics?.memberCount ?? "—"} />
        <StatCard label="Avg PMI" val={analytics?.avgPMI ?? "—"} />
        <StatCard label="Avg HMI" val={analytics?.avgHMI ?? "—"} />
        <StatCard label="Improving" val={analytics?.improvementRate != null ? `${analytics.improvementRate}%` : "—"} />
        <StatCard label="Recruiting Exposure" val={analytics?.recruitingExposure != null ? `${analytics.recruitingExposure}%` : "—"} wide />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Roster</h2>
        {!analytics?.members?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <p className="font-medium">No members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your org&apos;s invite code from the Organization Portal to bring on coaches, players, and parents.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {analytics.members.map((m) => (
              <Card key={m.userId}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex size-10 items-center justify-center rounded-full border bg-muted font-bold text-muted-foreground shrink-0">
                    {(m.playerName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.playerName || "Unnamed member"}</p>
                    <p className="text-xs text-muted-foreground">{(m.role || "player").toUpperCase()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, val, wide }: { label: string; val: string | number; wide?: boolean }) {
  return (
    <Card className={wide ? "col-span-2" : undefined}>
      <CardContent className="pt-6 text-center">
        <p className="text-2xl font-bold">{val}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
