// Web port of baseball-mechanics-app/src/services/orgService.js.
// Mobile authenticates these with the *player* auth flow (getAuthHeader());
// on web there's one shared Supabase session, so the same bearer token used
// for the recruiter endpoints works here too — the server doesn't
// distinguish which client flow issued a token.

import { createClient } from '@/lib/supabase/client';
import type { Org, OrgAnalytics } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeader() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { headers: await authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const createOrg = (name: string, type: string, state: string) =>
  post<Org>('/org/create', { name, type, state });

export const joinOrg = (code: string, playerName?: string) =>
  post<{ id: string; name: string }>('/org/join', { code, playerName });

export const getMyOrgs = () => get<Org[]>('/org/mine');

export const getOrgAnalytics = (id: string) => get<OrgAnalytics>(`/org/${id}/analytics`);
