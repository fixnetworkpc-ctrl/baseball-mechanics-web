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
  const res = await fetch(`${BACKEND_URL}/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search request failed (${res.status})`);
  return res.json();
}

// ── Discover ──────────────────────────────────────────────────────────────────

export async function getDiscoverCategories(): Promise<DiscoverCategory[]> {
  const res = await fetch(`${BACKEND_URL}/discover`);
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
