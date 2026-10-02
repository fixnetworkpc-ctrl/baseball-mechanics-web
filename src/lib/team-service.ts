// Personal team/roster/results/practice data for the signed-in user.
// Backs the Phase 2 pages by calling the server's web-portal read endpoints,
// which use `requireRealAuth` (no anon fallthrough) and scope every query to
// the caller's own user_id. Same one-shared-session bearer-token pattern as
// org-service.ts.

import { createClient } from '@/lib/supabase/client';
import type {
  MyPlayer,
  MySessionsResponse,
  MyPracticePlan,
  MyTeamResponse,
  MyTeamsResponse,
} from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { headers: await authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const getMyPlayers = () =>
  get<{ players: MyPlayer[] }>('/my-players').then((r) => r.players);

export function getMySessions(opts: {
  playerId?: string;
  mode?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<MySessionsResponse> {
  const q = new URLSearchParams();
  if (opts.playerId) q.set('playerId', opts.playerId);
  if (opts.mode) q.set('mode', opts.mode);
  if (opts.cursor) q.set('cursor', opts.cursor);
  if (opts.limit) q.set('limit', String(opts.limit));
  const qs = q.toString();
  return get<MySessionsResponse>(`/my-sessions${qs ? `?${qs}` : ''}`);
}

export const getMyPracticePlans = () =>
  get<{ plans: MyPracticePlan[] }>('/my-practice-plans').then((r) => r.plans);

export const getMyTeam = () => get<MyTeamResponse>('/my-team');

// Every team, for the team picker. Falls back to the single /my-team answer while a server
// without /my-teams is still live, so the web can deploy first without losing the page.
export async function getMyTeams(): Promise<MyTeamsResponse> {
  const res = await fetch(`${BACKEND_URL}/my-teams`, { headers: await authHeader() });
  if (res.status === 404) {
    const one = await getMyTeam();
    return { teams: one.team ? [one.team] : [], activeTeamId: one.team?.teamId ?? null };
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// mechanics_score is stored as a versioned object; pull an overall number
// defensively for display without importing the mobile scoring engines.
export function overallScore(mechanicsScore: unknown): number | null {
  if (mechanicsScore && typeof mechanicsScore === 'object') {
    const s = (mechanicsScore as Record<string, unknown>).score;
    if (typeof s === 'number') return Math.round(s);
  }
  return null;
}
