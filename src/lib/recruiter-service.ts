// Web port of baseball-mechanics-app/src/services/recruiterService.js.
// Mobile uses a *separate* Supabase client instance for the recruiter flow
// purely to avoid clobbering the player app's anonymous session on the same
// device — a browser tab has no such conflict, so this uses the one shared
// client from lib/supabase/client.ts.

import { createClient } from '@/lib/supabase/client';
import type {
  RecruiterProfile,
  RecruiterFavorite,
  SavedSearch,
  RecruiterAlert,
  SearchFilters,
  SearchResult,
  DiscoverCategory,
  AiRecruitResponse,
  AppNotification,
  Follow,
  PendingVerification,
} from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function recruiterSignUp(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function recruiterSignIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function recruiterSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// ── Password recovery ─────────────────────────────────────────────────────────
//
// CODE-based, not link-based, and that choice is load-bearing. A link flow needs
// its redirect URL on Supabase's allowlist, and every Vercel preview deployment
// gets a new URL — so recovery would silently break on previews and on any future
// domain change. A numeric code carries no URL at all.
//
// ⚠️ Do NOT assume the code is 6 digits. Supabase's email OTP length is a project
// setting (6-10); this project is on 8. Anything that hardcodes a length — an input
// maxLength, a validator, UI copy — breaks verification silently the moment that
// setting differs. The UI is length-agnostic and lets Supabase reject bad codes.
//
// 🔴 REQUIRES the Supabase "Reset Password" email template to contain {{ .Token }}.
// It is a THIRD template, separate from Magic Link and Confirm-signup (both of
// which were already switched to {{ .Token }}). Left at its default it mails a
// {{ .ConfirmationURL }} link and the user never receives a code to type here.

// Deliberately resolves the same way whether or not the account exists — Supabase
// does not error on an unknown email, and the caller must not either. Reporting
// "no such account" would turn this box into an account-existence oracle.
export async function requestPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Verifying a recovery code SIGNS THE USER IN — that session is what authorizes
// the updateUser call below. The two steps therefore cannot be split across a
// page reload, and updatePassword is useless on its own.
export async function verifyPasswordResetCode(email: string, token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

async function requireAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return session.access_token;
}

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');
  return session.user.id;
}

// ── Recruiter Profile ────────────────────────────────────────────────────────

export async function getRecruiterProfile(): Promise<RecruiterProfile | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from('recruiter_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
  return (data as RecruiterProfile) || null;
}

export async function saveRecruiterProfile(profile: {
  college?: string; organization?: string; division?: string; conference?: string; state?: string;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('recruiter_profiles')
    .upsert({
      user_id: session.user.id,
      email: session.user.email,
      college: profile.college || null,
      organization: profile.organization || null,
      division: profile.division || null,
      conference: profile.conference || null,
      state: profile.state || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function getFavorites(): Promise<RecruiterFavorite[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data } = await supabase
    .from('recruiter_favorites')
    .select('*')
    .eq('recruiter_id', session.user.id)
    .order('saved_at', { ascending: false });
  return (data as RecruiterFavorite[]) || [];
}

export async function addFavorite(playerId: string, playerName: string, snapshot: Record<string, unknown> = {}) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from('recruiter_favorites')
    .upsert({
      recruiter_id: userId,
      player_id: playerId,
      player_name: playerName,
      snapshot,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'recruiter_id,player_id' });
  if (error) throw error;
}

export async function updateFavorite(playerId: string, updates: Partial<Pick<RecruiterFavorite, 'notes' | 'rating'>>) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from('recruiter_favorites')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('recruiter_id', userId)
    .eq('player_id', playerId);
  if (error) throw error;
}

export async function removeFavorite(playerId: string) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from('recruiter_favorites')
    .delete()
    .eq('recruiter_id', userId)
    .eq('player_id', playerId);
  if (error) throw error;
}

// ── Saved Searches ────────────────────────────────────────────────────────────

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data } = await supabase
    .from('recruiter_saved_searches')
    .select('*')
    .eq('recruiter_id', session.user.id)
    .order('created_at', { ascending: false });
  return (data as SavedSearch[]) || [];
}

export async function saveSearch(name: string, filters: SearchFilters = {}) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from('recruiter_saved_searches')
    .insert({ recruiter_id: userId, name, filters });
  if (error) throw error;
}

export async function deleteSavedSearch(id: string) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase
    .from('recruiter_saved_searches')
    .delete()
    .eq('recruiter_id', userId)
    .eq('id', id);
  if (error) throw error;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<RecruiterAlert[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];
  const { data } = await supabase
    .from('recruiter_alerts')
    .select('*')
    .eq('recruiter_id', session.user.id)
    .order('created_at', { ascending: true });
  return (data as RecruiterAlert[]) || [];
}

export async function createAlert(type: string, config: Record<string, unknown>, label?: string) {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from('recruiter_alerts').insert({
    recruiter_id: userId, type, config, label: label || type, enabled: true,
  });
  if (error) throw error;
}

export async function toggleAlert(id: string, enabled: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('recruiter_alerts').update({ enabled }).eq('id', id);
  if (error) throw error;
}

export async function deleteAlert(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('recruiter_alerts').delete().eq('id', id);
  if (error) throw error;
}

export async function checkAlerts(): Promise<unknown[]> {
  const token = await requireAccessToken().catch(() => null);
  if (!token) return [];
  const res = await fetch(`${BACKEND_URL}/alerts/check`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Player Search ─────────────────────────────────────────────────────────────

export async function searchPlayers(filters: SearchFilters = {}): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  if (filters.position) params.append('position', filters.position);
  if (filters.gradYear) params.append('gradYear', filters.gradYear);
  if (filters.state) params.append('state', filters.state);
  if (filters.bats) params.append('bats', filters.bats);
  if (filters.throws) params.append('throws', filters.throws);
  if (filters.mode) params.append('mode', filters.mode);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));
  // /search and /discover return lists of athletes — mostly minors — and used to take
  // no token at all, which made them a bulk enumeration surface on the open internet.
  // They now require a real Supabase user, so both must send the recruiter's JWT.
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Search request failed (${res.status})`);
  return res.json();
}

// ── Discover ──────────────────────────────────────────────────────────────────

export async function getDiscoverCategories(): Promise<DiscoverCategory[]> {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/discover`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Discover request failed (${res.status})`);
  return res.json();
}

// ── AI Recruiter Assistant ────────────────────────────────────────────────────

export async function aiRecruit(query: string): Promise<AiRecruitResponse> {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/ai-recruit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`AI recruit failed (${res.status})`);
  return res.json();
}

// ── Follows ───────────────────────────────────────────────────────────────────

export async function followPlayer(playerId: string, playerName: string) {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/follow/${encodeURIComponent(playerId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ playerName, followerType: 'recruiter' }),
  });
  if (!res.ok) throw new Error(`Follow failed (${res.status})`);
}

export async function unfollowPlayer(playerId: string) {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/follow/${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Unfollow failed (${res.status})`);
}

export async function getFollows(): Promise<Follow[]> {
  const token = await requireAccessToken().catch(() => null);
  if (!token) return [];
  const res = await fetch(`${BACKEND_URL}/follows`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<AppNotification[]> {
  const token = await requireAccessToken().catch(() => null);
  if (!token) return [];
  const res = await fetch(`${BACKEND_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function markNotificationsRead(ids: string[]) {
  const token = await requireAccessToken().catch(() => null);
  if (!token) return;
  await fetch(`${BACKEND_URL}/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids: ids || [] }),
  });
}

// ── Athlete verification (Phase 1) ────────────────────────────────────────────
//
// 🔑 Nothing here sends a role, an organization, or a coach identity. Authority is resolved
// entirely server-side from team/org membership plus a coach_profiles row — a client that
// asserted its own role would make the whole ledger self-asserted.

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/verification/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Could not load verification requests (${res.status})`);
  const data = await res.json();
  return data.requests ?? [];
}

// Addressed by request id, NOT by token: only the sha256 of a token is ever stored, so the
// server has no raw token to hand back. The emailed link uses the token form instead.
export async function resolveVerification(
  requestId: string,
  decision: 'approved' | 'rejected',
  note?: string,
): Promise<void> {
  const token = await requireAccessToken();
  const res = await fetch(`${BACKEND_URL}/verification/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requestId, decision, note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Could not record that decision (${res.status})`);
  }
}
