// Operator metrics. Mirrors the fetch/auth shape of org-service.ts — one shared
// Supabase session on web, whose bearer token the server accepts for any flow.
//
// Authorisation is enforced ENTIRELY server-side by an ADMIN_USER_IDS env allowlist
// (server.js requireAdmin), which fails closed when unset. Nothing on this page is a
// security control: hiding the nav link keeps a non-admin from being confused, not
// from reading the data. Never add a client-side `isAdmin` check and treat it as one.

import { createClient } from '@/lib/supabase/client';
import type { AdminMetrics } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// 401 and 403 are DIFFERENT problems and must stay different all the way to the screen.
// 401 = no usable token reached the server (signed out, or the session expired).
// 403 = a valid user the ADMIN_USER_IDS allowlist does not contain.
// These were previously one error class, so a signed-out operator was told they were not
// on the allowlist and went to edit a Render env var that was already correct.
export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const headers = await authHeader();

  // No session at all: report it as unauthenticated WITHOUT calling the backend. The
  // server would answer 401 anyway, and asking first only adds a round trip and a
  // rate-limit hit to a question already answered locally.
  if (!headers.Authorization) {
    throw new UnauthenticatedError('Not signed in');
  }

  const res = await fetch(`${BACKEND_URL}/admin/metrics`, { headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    throw new UnauthenticatedError(data.error || data.message || 'Sign in required');
  }
  if (res.status === 403) {
    throw new ForbiddenError(data.error || data.message || 'Not authorized');
  }
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as AdminMetrics;
}
