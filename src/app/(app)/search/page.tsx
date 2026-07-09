"use client";

import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { toast } from "sonner";
import {
  searchPlayers,
  addFavorite,
  getFavorites,
  saveSearch,
} from "@/lib/recruiter-service";
import type { SearchResult, SearchFilters } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "OF", "DH"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035"];
const BATS_OPTS = [{ key: "R", label: "R" }, { key: "L", label: "L" }, { key: "S", label: "S" }];
const THROWS_OPTS = [{ key: "R", label: "R" }, { key: "L", label: "L" }];
const MODE_OPTS = [
  { key: "pitching", label: "Pitching" },
  { key: "batting", label: "Batting" },
  { key: "catching", label: "Catching" },
];

const EMPTY_FILTERS = { position: "", gradYear: "", bats: "", throws: "", mode: "" };
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function SearchPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stateInput, setStateInput] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);

  useEffect(() => {
    getFavorites().then((favs) => setFavoriteIds(new Set(favs.map((f) => f.player_id))));
  }, []);

  function setFilter(key: keyof typeof EMPTY_FILTERS, val: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === val ? "" : val }));
  }

  async function handleSearch() {
    const applied: SearchFilters = { ...filters, state: stateInput.trim().toUpperCase() };
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchPlayers(applied);
      setResults(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect to server. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    setStateInput("");
    setResults([]);
    setSearched(false);
  }

  async function handleAddFavorite(player: SearchResult) {
    setSaving((s) => ({ ...s, [player.playerId]: true }));
    try {
      const snapshot = {
        position: player.position,
        gradYear: player.gradYear,
        school: player.school,
        state: player.state,
        pmi: player.avgPitchScore,
        hmi: player.avgHitScore,
        exitVelo: player.athletic?.exitVelo,
        pitchVelo: player.athletic?.pitchVelo,
        sixty: player.athletic?.sixty,
      };
      await addFavorite(player.playerId, player.playerName, snapshot);
      setFavoriteIds((prev) => new Set([...prev, player.playerId]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add to favorites.");
    } finally {
      setSaving((s) => ({ ...s, [player.playerId]: false }));
    }
  }

  async function handleSaveSearch() {
    if (!saveName.trim()) return;
    setSavingSearch(true);
    try {
      const applied: SearchFilters = { ...filters, state: stateInput.trim().toUpperCase() };
      await saveSearch(saveName.trim(), applied);
      setSaveDialogOpen(false);
      toast.success(`Search "${saveName.trim()}" saved to your dashboard.`);
      setSaveName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save search.");
    } finally {
      setSavingSearch(false);
    }
  }

  const hasFilters = filters.position || filters.gradYear || stateInput.trim() || filters.bats || filters.throws || filters.mode;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruiting"
        title="Player Search"
        subtitle="Filter the athlete pool by position, class, mode, and location"
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Position</Label>
            <FilterChips options={POSITIONS.map((p) => ({ key: p, label: p }))} value={filters.position} onChange={(v) => setFilter("position", v)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Mode</Label>
            <FilterChips options={MODE_OPTS} value={filters.mode} onChange={(v) => setFilter("mode", v)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Grad Year</Label>
            <FilterChips options={GRAD_YEARS.map((y) => ({ key: y, label: y }))} value={filters.gradYear} onChange={(v) => setFilter("gradYear", v)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs font-bold tracking-widest text-muted-foreground uppercase">State</Label>
              <Input
                id="state"
                className="w-20 uppercase"
                maxLength={2}
                placeholder="MI"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value.toUpperCase().slice(0, 2))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Bats</Label>
              <FilterChips options={BATS_OPTS} value={filters.bats} onChange={(v) => setFilter("bats", v)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Throws</Label>
              <FilterChips options={THROWS_OPTS} value={filters.throws} onChange={(v) => setFilter("throws", v)} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button className="flex-1" disabled={loading} onClick={handleSearch}>
              {loading ? "Searching…" : "Search"}
            </Button>
            {hasFilters && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
            {searched && results.length > 0 && (
              <Button variant="ghost" onClick={() => setSaveDialogOpen(true)}>
                Save Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {searched && !loading && (
        results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No players found"
            body="Try broadening your filters — clear the state field, widen the grad-year range, or drop the position."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.length} player{results.length !== 1 ? "s" : ""} found
            </p>
            {results.map((player) => (
              <PlayerResultCard
                key={player.playerId}
                player={player}
                isFav={favoriteIds.has(player.playerId)}
                saving={!!saving[player.playerId]}
                onAddFav={() => handleAddFavorite(player)}
              />
            ))}
          </div>
        )
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name This Search</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="e.g. MI Pitchers 2027"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button disabled={!saveName.trim() || savingSearch} onClick={handleSaveSearch}>
              {savingSearch ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerResultCard({
  player,
  isFav,
  saving,
  onAddFav,
}: {
  player: SearchResult;
  isFav: boolean;
  saving: boolean;
  onAddFav: () => void;
}) {
  const meta = [player.position, player.gradYear && `Class of ${player.gradYear}`, player.school, player.state]
    .filter(Boolean)
    .join(" · ");
  const handInfo = [player.bats && `B: ${player.bats}`, player.throws && `T: ${player.throws}`]
    .filter(Boolean)
    .join("  ");
  const subLine = [player.height, player.weight && `${player.weight} lbs`, handInfo].filter(Boolean).join("  |  ");
  const athletic = player.athletic as { exitVelo?: string; pitchVelo?: string; sixty?: string; popTime?: string };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{player.playerName}</p>
            {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
            {subLine && <p className="text-xs text-muted-foreground mt-0.5">{subLine}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {player.avgPitchScore != null && <Badge variant="outline">PMI {player.avgPitchScore}</Badge>}
            {player.avgHitScore != null && <Badge variant="outline">HMI {player.avgHitScore}</Badge>}
            {player.sessionCount > 0 && (
              <span className="text-xs text-muted-foreground">{player.sessionCount} sessions</span>
            )}
          </div>
        </div>

        {(athletic?.exitVelo || athletic?.pitchVelo || athletic?.sixty || athletic?.popTime) && (
          <div className="flex flex-wrap gap-2">
            {athletic.exitVelo && <Badge variant="secondary">EV {athletic.exitVelo} mph</Badge>}
            {athletic.pitchVelo && <Badge variant="secondary">Velo {athletic.pitchVelo} mph</Badge>}
            {athletic.sixty && <Badge variant="secondary">60: {athletic.sixty}</Badge>}
            {athletic.popTime && <Badge variant="secondary">Pop {athletic.popTime}</Badge>}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant={isFav ? "default" : "outline"}
            size="sm"
            disabled={isFav || saving}
            onClick={onAddFav}
          >
            {isFav ? "Saved" : saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`${BACKEND_URL}/p/${player.playerId}`, "_blank")}>
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
