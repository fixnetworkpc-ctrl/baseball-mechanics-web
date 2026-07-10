// Recruiting-domain types, ported from baseball-mechanics-server's migrations/
// and response shapes (server.js) + baseball-mechanics-app's recruiterService.js.

export interface RecruiterProfile {
  id: string;
  user_id: string;
  email: string;
  college: string | null;
  organization: string | null;
  division: 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO' | 'Other' | null;
  conference: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruiterFavorite {
  id: string;
  recruiter_id: string;
  player_id: string;
  player_name: string;
  notes: string | null;
  rating: number | null;
  snapshot: Record<string, unknown>;
  saved_at: string;
  updated_at: string;
}

export interface SavedSearch {
  id: string;
  recruiter_id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

export interface RecruiterAlert {
  id: string;
  recruiter_id: string;
  type: string;
  config: Record<string, unknown>;
  label: string;
  enabled: boolean;
  created_at: string;
}

export interface SearchFilters {
  position?: string;
  gradYear?: string;
  state?: string;
  bats?: string;
  throws?: string;
  mode?: string;
  limit?: number;
  offset?: number;
}

// GET /search response row
export interface SearchResult {
  playerId: string;
  playerName: string;
  position: string | null;
  secondaryPosition: string | null;
  gradYear: string | null;
  school: string | null;
  state: string | null;
  bats: string | null;
  throws: string | null;
  height: string | null;
  weight: string | null;
  athletic: Record<string, unknown>;
  sessionCount: number;
  avgPitchScore: number | null;
  avgHitScore: number | null;
}

// GET /discover player card shape (toPlayerCard in server.js)
export interface PlayerCard {
  playerId: string;
  playerName: string;
  position: string | null;
  gradYear: string | null;
  school: string | null;
  state: string | null;
  athletic: Record<string, unknown>;
  latestPMI: number | null;
  latestHMI: number | null;
  latestCMI: number | null;
  pmiVelocity: number | null;
  hmiVelocity: number | null;
  cmiVelocity: number | null;
  compositeScore: number;
  upsideTier: 'elite' | 'high' | 'moderate' | 'developing' | string;
  tags: string[];
}

export interface DiscoverCategory {
  id: string;
  title: string;
  subtitle: string;
  players: PlayerCard[];
}

// POST /ai-recruit response
export interface AiRecruitResult {
  rank: number;
  player_id: string;
  player_name: string;
  position: string | null;
  grad_year: string | null;
  state: string | null;
  composite_score: number;
  pmi: number | null;
  hmi: number | null;
  cmi: number | null;
  pmi_velocity: number | null;
  hmi_velocity: number | null;
  cmi_velocity: number | null;
  upside_tier: string;
  session_count: number;
  tags: string[];
}

export interface AiRecruitResponse {
  explanation: string;
  intent: string;
  players: AiRecruitResult[];
}

// notifications table row (migrations/005_follows_notifications.sql)
export interface AppNotification {
  id: string;
  user_id: string;
  type: 'saved_by_recruiter' | 'pmi_increase' | string;
  title: string;
  body: string;
  player_id: string | null;
  player_name: string | null;
  actor_name: string | null;
  read: boolean;
  created_at: string;
}

// follows table row
export interface Follow {
  id: string;
  follower_id: string;
  follower_type: 'coach' | 'parent' | 'recruiter';
  player_id: string;
  player_name: string;
  created_at: string;
}

// organizations table row, +role merged in by GET /org/mine
export interface Org {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  invite_code: string;
  state: string | null;
  created_at: string;
  role?: 'owner' | 'coach' | 'parent' | 'player';
}

export interface OrgAnalytics {
  memberCount: number;
  avgPMI: number | null;
  avgHMI: number | null;
  improvementRate: number | null;
  recruitingExposure: number | null;
  members: { userId: string; role: string; playerName: string | null }[];
}

// ── Phase 2: personal team/roster/results/practice data ──────────────────────
// Response shapes from baseball-mechanics-server's web-portal read endpoints
// (/my-players, /my-sessions, /my-practice-plans, /my-team). All require a real
// (non-anon) auth token and are scoped server-side to the caller's own user_id.

// GET /my-players → { players }
export interface MyPlayer {
  playerName: string | null;
  playerId: string | null;
  sessionCount: number;
  modes: string[];
  latest: {
    date: string | null;
    mode: string | null;
    grade: string | null;
    mechanicsScore: unknown; // versioned object; interpret client-side
  };
}

// GET /my-sessions → { sessions, nextCursor }
export interface MySession {
  id: string;
  playerId: string | null;
  playerName: string | null;
  date: string | null;
  mode: string | null;
  grade: string | null;
  summary: string | null;
  opportunitiesCount: number | null;
  strengthsCount: number | null;
  analysis: unknown;
  frameLabels: string[];
  mechanicsScore: unknown;
  coachNote: string | null;
  drillAssignments: unknown[];
  normalizedSignals: unknown;
}
export interface MySessionsResponse {
  sessions: MySession[];
  nextCursor: string | null;
}

// GET /my-practice-plans → { plans }
export interface MyPracticePlan {
  id: string;
  savedAt: string | null;
  mode: string | null;
  totalMinutes: number | null;
  totalPlayers: number | null;
  ageDivision: string | null;
  focusThemes: string[];
  planConfidence: number | null;
  plan: Record<string, unknown> | null;
}

// GET /my-team → { team, membership }
export interface LeaderboardEntry {
  rank: number;
  firstName: string;
  score: number;
}
export interface TeamPayload {
  teamId: string;
  teamName: string | null;
  ageDivision: string | null;
  joinCode: string | null;
  createdAt: string | null;
  totalPlayers: number;
  avgPMI: number | null;
  avgHMI: number | null;
  avgCMI: number | null;
  pmiLeaderboard: LeaderboardEntry[];
  hmiLeaderboard: LeaderboardEntry[];
  cmiLeaderboard: LeaderboardEntry[];
}
export interface TeamMembership {
  teamId: string;
  teamName: string | null;
  ageDivision: string | null;
}
export interface MyTeamResponse {
  team: TeamPayload | null;
  membership: TeamMembership | null;
}

// GET /admin/metrics. Shape is produced by the admin_metrics() Postgres function
// (migration 013), with free_cap merged in from Redis by the server.
//
// `unattributed` is not noise to hide. Baseball and softball share one Supabase
// project and softball's batting frame labels are byte-identical to ours, so some
// rows cannot be assigned to either app. They are counted, never guessed at.
export interface AdminMetrics {
  app: string;
  generated_at: string;
  users: {
    total_auth_users: number;   // spans BOTH apps — the shared project's whole user table
    attributed: number;
    unattributed: number;
    new_7d: number;
    new_30d: number;
  };
  active_users: { d1: number; d7: number; d30: number };
  sessions: {
    total: number;
    last_7d: number;
    last_30d: number;
    unattributed: number;
    by_mode: Record<string, number>;
  };
  sessions_per_active_user_30d: number;
  avg_score_by_mode: Record<string, number>;
  cost: {
    events_total: number;
    usd_total: number;
    usd_last_30d: number;
    usd_per_analysis: number;
    usd_per_user_30d: number;
    p50_latency_ms: number | null;
    by_tier: Record<string, number>;
  };
  // Redis. `unavailable` when Redis is down; `truncated` when the SCAN hit its bound
  // and `atCap` is therefore a floor, not a total.
  free_cap:
    | { unavailable: true }
    | { atCap: number; scanned: number; truncated: boolean; limit: number };
}
