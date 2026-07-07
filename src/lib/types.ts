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
  pmiVelocity: number | null;
  hmiVelocity: number | null;
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
  pmi_velocity: number | null;
  hmi_velocity: number | null;
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
