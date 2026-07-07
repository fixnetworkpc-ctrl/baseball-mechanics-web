# Baseball Mechanics — Web Portal

Companion web app for [baseball-mechanics-app](../baseball-mechanics-app), giving recruiters and coaches browser access on a laptop. Built as a separate Next.js codebase hitting the same [baseball-mechanics-server](../baseball-mechanics-server) backend and Supabase project — see `C:\Users\jordanstotts\.claude\plans\cuddly-wiggling-wind.md` for the full phased plan this was built from.

## Phase 1 (this repo, current state)

Recruiter Portal only — the one domain that was already fully server/Postgres-backed on mobile, so it ported with no new backend work beyond a CORS fix. Sign in/up, Dashboard, Profile, Player Search, Discover, AI Recruit, Notifications, Favorites, Organization Portal.

**Not included yet** (see the plan doc for why): Team Dashboard, Player Roster, Session Results, Practice Plans — that data currently lives only on each coach's phone (written to Postgres but never read back by anything). Needs new server read endpoints + live-schema verification first (Phase 2).

Also explicitly dropped for v1: photos (no cloud storage anywhere in the mobile app either), native PDF export, IAP/premium gating, Recruiting Board / Prospect Rankings (local-only on mobile too, pre-existing gap).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in from baseball-mechanics-app/.env's EXPO_PUBLIC_* values
npm run dev
```

## Auth

One shared Supabase client (`src/lib/supabase/`) against the same project the mobile app uses. Mobile runs two separate client instances (player vs. recruiter) purely to avoid two local sessions clobbering each other on the same device — irrelevant on web, where each browser session is already isolated.

`src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) gates every route except `/login` and `/search` (the latter is genuinely public per `server.js`'s `/search` endpoint — no auth required there either).

## Deploying

Needs `WEB_APP_ORIGINS` set on the server (baseball-mechanics-server's Render env) to include this app's deployed origin(s), or every request will fail CORS — see `server.js`'s `cors()` config.
