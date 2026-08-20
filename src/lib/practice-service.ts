// Coach Portal — the practice lifecycle, as fetch wrappers.
//
// 🔴 NO SCORING LOGIC LIVES IN THIS REPO. Every number and every drill choice on these pages
// is computed by the server, which runs the SAME vendored engines the mobile app runs
// (server/vendor/mechanicsIntelligence, proved byte-identical to mobile by
// test/vendorDrift.test.js). If a calculation ever starts happening here, the web and the
// phone will begin disagreeing about the same roster — which is the entire failure that
// vendoring the engines exists to prevent. These functions fetch and nothing else.
//
// Same one-shared-session bearer pattern as team-service.ts.

import { createClient } from '@/lib/supabase/client';
import type {
  GenerateResponse,
  PracticePlanDetail,
  PracticeHighlights,
  TeamDevelopment,
  DevelopmentCard,
  GeneratedPlan,
  PracticeFocus,
} from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...await authHeader(), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

// Runs the engines. Persists nothing — saving is a separate, deliberate step, so a coach can
// regenerate freely while deciding.
export const generatePracticePlan = (input: {
  teamId: string;
  minutes: number;
  focus: PracticeFocus;
  opponentNote?: string;
}) => post<GenerateResponse>('/practice-plans/generate', input);

export const savePracticePlan = (input: {
  teamId: string;
  plan: GeneratedPlan;
  focus: PracticeFocus;
  opponentNote?: string | null;
}) => post<{ id: string; status: string }>('/practice-plans', input);

export const getPracticePlan = (id: string) =>
  call<PracticePlanDetail>(`/practice-plans/${encodeURIComponent(id)}`);

export const startPractice = (id: string) =>
  post<{ status: string; startedAt: string }>(`/practice-plans/${encodeURIComponent(id)}/start`);

// The ONLY writer of evidence for a highlights report. Everything the report may ever say
// comes from what a coach records here.
export const recordObservations = (
  id: string,
  observations: { playerName: string; attended?: boolean; participation?: string | null; winTag?: string | null; coachNote?: string | null }[],
) => post<{ recorded: number }>(`/practice-plans/${encodeURIComponent(id)}/observations`, { observations });

export const completePractice = (id: string, segmentsCompleted: string[]) =>
  post<{ status: string; endedAt: string; segmentsCompleted: string[] }>(
    `/practice-plans/${encodeURIComponent(id)}/complete`, { segmentsCompleted });

// 🔑 `observationCount` comes back so the UI can say "a quiet practice" honestly rather than
// rendering an empty card that looks broken. Zero is a legitimate, reportable number.
export const buildHighlights = (id: string) =>
  post<{ report: PracticeHighlights; observationCount: number }>(
    `/practice-plans/${encodeURIComponent(id)}/highlights`);

export const getTeamDevelopment = (teamId: string) =>
  call<TeamDevelopment>(`/teams/${encodeURIComponent(teamId)}/development`);

export const getDevelopmentCard = (playerName: string) =>
  call<{ card: DevelopmentCard }>(`/players/${encodeURIComponent(playerName)}/development-card`)
    .then((r) => r.card);

// 🔴 "Hitting" is the user-facing word; `batting` is the internal key and must never be
// renamed — the server, the engines and every stored session use `batting`. Lives here, not in
// a page, so the plan list and the run page can never label the same mode differently.
export const FOCUS_LABEL: Record<string, string> = {
  pitching: 'Pitching',
  batting: 'Hitting',
  catching: 'Catching',
  full_team: 'Full Team',
};

export const focusLabel = (key: string | null | undefined): string =>
  (key && FOCUS_LABEL[key]) || key || 'Practice';

// Display helper — formatting only, no judgement. The engines emit camelCase category keys
// and the server sends them through unchanged rather than inventing a second label vocabulary.
export function categoryLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
