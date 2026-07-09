"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { getFavorites, updateFavorite, removeFavorite } from "@/lib/recruiter-service";
import type { RecruiterFavorite } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<RecruiterFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<RecruiterFavorite | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftRating, setDraftRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RecruiterFavorite | null>(null);

  useEffect(() => {
    getFavorites().then((favs) => { setFavorites(favs); setLoading(false); });
  }, []);

  function openEdit(fav: RecruiterFavorite) {
    setEditTarget(fav);
    setDraftNotes(fav.notes || "");
    setDraftRating(fav.rating || 0);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateFavorite(editTarget.player_id, { notes: draftNotes, rating: draftRating || null });
      setFavorites((prev) =>
        prev.map((f) =>
          f.player_id === editTarget.player_id ? { ...f, notes: draftNotes, rating: draftRating || null } : f
        )
      );
      setEditTarget(null);
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await removeFavorite(removeTarget.player_id);
      setFavorites((prev) => prev.filter((f) => f.player_id !== removeTarget.player_id));
    } catch {
      toast.error("Could not remove favorite. Try again.");
    } finally {
      setRemoveTarget(null);
    }
  }

  if (loading) return <LoadingState rows={2} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruiting"
        title="Favorites"
        subtitle={`${favorites.length} ${favorites.length === 1 ? "player" : "players"} on your watchlist`}
      />

      {favorites.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No favorites yet"
          body="Find players via Search and add them to your watchlist. Their public profiles will appear here."
        />
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <FavoriteCard
              key={fav.id}
              fav={fav}
              onEdit={() => openEdit(fav)}
              onRemove={() => setRemoveTarget(fav)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget?.player_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Rating</p>
              <StarRating value={draftRating} onChange={setDraftRating} size={22} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Notes</p>
              <Textarea
                rows={4}
                placeholder="Arm strength, hit tool, makeup..."
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSaveEdit}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Favorite</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove {removeTarget?.player_name} from your favorites?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FavoriteCard({
  fav,
  onEdit,
  onRemove,
}: {
  fav: RecruiterFavorite;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const snap = fav.snapshot as {
    position?: string; gradYear?: string; school?: string; state?: string;
    pmi?: number; hmi?: number; exitVelo?: string; pitchVelo?: string; sixty?: string;
  };
  const meta = [snap.position, snap.gradYear && `Class of ${snap.gradYear}`, snap.school, snap.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{fav.player_name}</p>
            {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            {snap.pmi != null && <Badge variant="outline">PMI {snap.pmi}</Badge>}
            {snap.hmi != null && <Badge variant="outline">HMI {snap.hmi}</Badge>}
          </div>
        </div>

        {(snap.exitVelo || snap.pitchVelo || snap.sixty) && (
          <div className="flex flex-wrap gap-2">
            {snap.exitVelo && <Badge variant="secondary">EV {snap.exitVelo} mph</Badge>}
            {snap.pitchVelo && <Badge variant="secondary">Velo {snap.pitchVelo} mph</Badge>}
            {snap.sixty && <Badge variant="secondary">60yd {snap.sixty}</Badge>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <StarRating value={fav.rating || 0} readOnly />
          <span className="text-xs text-muted-foreground">
            Saved {new Date(fav.saved_at).toLocaleDateString()}
          </span>
        </div>

        {fav.notes && <p className="text-sm text-muted-foreground italic">{fav.notes}</p>}

        <div className="flex items-center gap-4 pt-1">
          <Button variant="link" size="sm" className="px-0" onClick={onEdit}>Edit Notes</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`${BACKEND_URL}/p/${fav.player_id}`, "_blank")}
          >
            View Profile
          </Button>
          <Button variant="link" size="sm" className="px-0 text-destructive ml-auto" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
