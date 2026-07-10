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

export class ForbiddenError extends Error {}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const res = await fetch(`${BACKEND_URL}/admin/metrics`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));

  // 401 and 403 mean different things to the operator: "you are signed out" versus
  // "this account is not on the allowlist". Collapsing them into one error message
  // sends you looking for the wrong problem.
  if (res.status === 401 || res.status === 403) {
    throw new ForbiddenError(data.error || data.message || 'Not authorized');
  }
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as AdminMetrics;
}
