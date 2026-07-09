"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import { aiRecruit, addFavorite, followPlayer } from "@/lib/recruiter-service";
import type { AiRecruitResponse, AiRecruitResult } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const QUICK_QUERIES = [
  "Show me the fastest improving pitchers",
  "Find sleeper players with rising velocity",
  "Who are the hidden gems with few sessions?",
  "Top players not yet saved by any recruiter",
  "Best composite scores at shortstop",
];

export default function AiRecruitPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRecruitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  async function run(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await aiRecruit(text);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(player: AiRecruitResult) {
    try {
      await addFavorite(player.player_id, player.player_name, {
        pmi: player.pmi, hmi: player.hmi, position: player.position, gradYear: player.grad_year,
      });
      setSaved((prev) => ({ ...prev, [player.player_id]: true }));
    } catch { /* no-op, matches mobile */ }
  }

  async function handleFollow(player: AiRecruitResult) {
    try {
      await followPlayer(player.player_id, player.player_name);
      setFollowed((prev) => ({ ...prev, [player.player_id]: true }));
    } catch { /* no-op, matches mobile */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Scouting"
        title="AI Recruit Assistant"
        subtitle="Ask anything about the player pool"
      />

      <div className="flex gap-2">
        <Input
          placeholder="e.g. fastest improving pitchers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <Button disabled={loading} onClick={() => run()}>Go</Button>
      </div>

      {!result && !loading && (
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Try these</p>
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); run(q); }}
              className="w-full rounded-lg border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-10 text-center text-sm text-muted-foreground">Analyzing player pool…</div>
      )}

      {/* Tints stay at /5: token text over a /10 tint drops below 4.5:1. */}
      {error && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="py-4 text-sm text-warning">{error}</CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="border-accent-blue/30 bg-accent-blue/5">
            <CardContent className="py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-accent-blue">
                {result.intent?.replace(/_/g, " ") || "Results"}
              </p>
              <p className="text-sm mt-1">{result.explanation}</p>
            </CardContent>
          </Card>

          {result.players.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No players matched this search"
              body="Try rephrasing your question, or start from one of the suggested searches."
            />
          ) : (
            <div className="space-y-3">
              {result.players.map((p) => (
                <AiPlayerCard
                  key={p.player_id}
                  player={p}
                  saved={!!saved[p.player_id]}
                  followed={!!followed[p.player_id]}
                  onSave={() => handleSave(p)}
                  onFollow={() => handleFollow(p)}
                />
              ))}
            </div>
          )}

          <Button variant="link" onClick={() => { setResult(null); setQuery(""); }}>
            New Search
          </Button>
        </>
      )}
    </div>
  );
}

function AiPlayerCard({
  player,
  saved,
  followed,
  onSave,
  onFollow,
}: {
  player: AiRecruitResult;
  saved: boolean;
  followed: boolean;
  onSave: () => void;
  onFollow: () => void;
}) {
  // A catching-only athlete has no pmi/hmi velocity — fall through to cmi.
  const vel = player.pmi_velocity ?? player.hmi_velocity ?? player.cmi_velocity ?? null;
  const velSign = (vel ?? 0) > 0 ? "+" : "";
  const meta = [player.position, player.grad_year && `'${String(player.grad_year).slice(-2)}`, player.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-muted-foreground">#{player.rank}</span>
              {player.upside_tier && <Badge variant="secondary">{player.upside_tier}</Badge>}
            </div>
            <p className="font-semibold">{player.player_name}</p>
            {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {player.pmi != null && <Badge variant="outline">PMI {player.pmi}</Badge>}
            {player.hmi != null && <Badge variant="outline">HMI {player.hmi}</Badge>}
            {player.cmi != null && <Badge variant="outline">CMI {player.cmi}</Badge>}
            {player.composite_score != null && <Badge variant="outline">CMP {player.composite_score}</Badge>}
          </div>
        </div>

        {(vel != null || player.session_count != null || player.tags?.length > 0) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {vel != null && (
              <span className={vel >= 0 ? "font-bold text-success" : "font-bold text-destructive"}>
                {velSign}{vel} pts/session
              </span>
            )}
            {player.session_count != null && (
              <span className="text-muted-foreground">
                {player.session_count} session{player.session_count !== 1 ? "s" : ""}
              </span>
            )}
            {player.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={saved} onClick={onSave}>
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" disabled={followed} onClick={onFollow}>
            {followed ? "Following" : "Follow"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
