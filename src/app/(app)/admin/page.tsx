"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getAdminMetrics, ForbiddenError } from "@/lib/admin-service";
import { brand } from "@/lib/design/tokens";
import type { AdminMetrics } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/data-display/stat-tile";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState, StatRowSkeleton } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MODE_LABEL: Record<string, string> = {
  pitching: "Pitching",
  batting: "Batting",
  catching: "Catching",
};

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [forbidden, setForbidden] = useState(false);
  // Starts true so the first paint is the skeleton. The initial fetch must NOT
  // set it again — a synchronous setState before the first `await` runs inside the
  // effect body and cascades a render.
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    try {
      const data = await getAdminMetrics();
      if (!alive.current) return;
      setMetrics(data);
      setForbidden(false);
      if (isRefresh) toast.success("Metrics refreshed");
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ForbiddenError) setForbidden(true);
      else toast.error(err instanceof Error ? err.message : "Could not load metrics.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  // Wrapped in a nested async function rather than `void load()`: the lint rule
  // treats a direct call to any setState-containing function as a synchronous
  // effect-body update. Same shape as org/[id]/page.tsx.
  useEffect(() => {
    void (async () => { await load(); })();
  }, [load]);

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <LoadingState rows={0} />
        <StatRowSkeleton count={4} />
        <StatRowSkeleton count={4} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not authorized"
        body="This account is not on the operator allowlist. Access is granted by the ADMIN_USER_IDS environment variable on the server, which admits nobody until it is set."
      />
    );
  }

  if (!metrics) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Metrics unavailable"
        body="The server could not produce metrics. Check that migration 013 has been applied."
        action={<Button onClick={() => void load(true)}>Try again</Button>}
      />
    );
  }

  const { users, active_users, sessions, cost, free_cap } = metrics;
  const unattributed = sessions.unattributed + users.unattributed;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operator"
        title="Admin"
        subtitle={`Baseball · generated ${new Date(metrics.generated_at).toLocaleString()}`}
        actions={
          <Button variant="outline" onClick={() => void load(true)} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        }
      />

      {/* Surfaced, not buried. A dashboard that silently drops rows it cannot
          classify is how you end up trusting a number that was never true. */}
      {unattributed > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">
                {sessions.unattributed} session{sessions.unattributed === 1 ? "" : "s"} and {users.unattributed} profile
                {users.unattributed === 1 ? "" : "s"} are excluded from every figure below.
              </p>
              <p className="mt-1 text-muted-foreground">
                Baseball and softball share one Supabase project, and softball&apos;s batting frame labels are identical to
                ours — so a batting-only user cannot be assigned to either app. These rows are counted here rather than
                guessed at. The count falls as clients ship the app tag.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Section title="Activity">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Active 24h" value={active_users.d1} hint="distinct users with a session" />
          <StatTile label="Active 7d" value={active_users.d7} />
          <StatTile label="Active 30d" value={active_users.d30} />
          <StatTile
            label="Sessions / active user"
            value={metrics.sessions_per_active_user_30d}
            decimals={2}
            hint="last 30 days"
          />
        </div>
      </Section>

      <Section title="Users">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Baseball users" value={users.attributed} hint="attributed profiles" />
          <StatTile label="New 7d" value={users.new_7d} />
          <StatTile label="New 30d" value={users.new_30d} />
          {/* auth.users is project-wide. Labelling this "total users" would overstate
              the product's size by however large softball is. */}
          <StatTile
            label="All accounts"
            value={users.total_auth_users}
            accent={brand.muted}
            hint="both apps — shared project"
          />
        </div>
      </Section>

      <Section title="Sessions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={sessions.total} />
          <StatTile label="Last 7d" value={sessions.last_7d} />
          <StatTile label="Last 30d" value={sessions.last_30d} />
          <StatTile
            label="At free cap"
            value={"atCap" in free_cap ? free_cap.atCap : null}
            accent={brand.warning}
            hint={
              "unavailable" in free_cap
                ? "Redis unavailable"
                : free_cap.truncated
                  ? `≥ this many (scan capped at ${free_cap.scanned})`
                  : `users at the ${free_cap.limit}-analysis limit`
            }
          />
        </div>

        <ModeTable byMode={sessions.by_mode} avgScore={metrics.avg_score_by_mode} />
      </Section>

      <Section title="Cost">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Spend 30d" value={cost.usd_last_30d} decimals={2} suffix=" USD" />
          <StatTile label="Per analysis" value={cost.usd_per_analysis} decimals={4} suffix=" USD" />
          <StatTile label="Per user 30d" value={cost.usd_per_user_30d} decimals={4} suffix=" USD" />
          <StatTile label="Claude p50" value={cost.p50_latency_ms} suffix=" ms" />
        </div>

        {cost.events_total === 0 ? (
          <EmptyState
            title="No cost events yet"
            body="analysis_events records one row per analysis from the moment migration 013 is applied. It is not backfilled — the cost of every analysis run before then lives only in Render's logs, and expires with them."
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            {cost.events_total.toLocaleString()} analyses recorded · {formatUsd(cost.usd_total)} lifetime ·{" "}
            {Object.entries(cost.by_tier).map(([tier, n]) => `${n} ${tier}`).join(" · ") || "no tier data"}
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ModeTable({
  byMode,
  avgScore,
}: {
  byMode: Record<string, number>;
  avgScore: Record<string, number>;
}) {
  // Union of both maps: a mode can have sessions but no scored rows (older sessions
  // predate the MIS), and rendering it as a zero would invent a score of nought.
  const modes = Array.from(new Set([...Object.keys(byMode), ...Object.keys(avgScore)])).sort();
  if (modes.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Avg score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modes.map((m) => (
                <TableRow key={m}>
                  <TableCell className="font-medium">{MODE_LABEL[m] ?? m}</TableCell>
                  <TableCell className="text-right tabular-nums">{(byMode[m] ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {avgScore[m] != null ? Number(avgScore[m]).toFixed(1) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUsd(n: number) {
  return `$${Number(n ?? 0).toFixed(2)}`;
}
