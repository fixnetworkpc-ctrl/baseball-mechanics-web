# Admin Dashboard — Pre-Implementation Audit

**Date:** 2026-08-02
**Scope:** `baseball-mechanics-app/server` (Express + Supabase), `baseball-mechanics-app/src` (Expo client), `baseball-mechanics-web` (Next.js portal)
**Status:** Audit only. No implementation code written.

---

## 1. Executive summary

The admin system is **~20% built, and the 20% that exists is the expensive part** — authorization, app attribution, per-analysis cost capture, and a one-round-trip SQL aggregate. None of that needs rebuilding.

The blocking constraint is **not UI and not aggregation. It is that most metrics have no writer.** Three tables that look like they hold business data are empty by construction:

| Table | Migration | Writer | Reality |
|---|---|---|---|
| `analysis_events` | 013 | ✅ `recordAnalysisEvent()` | Live, populating |
| `user_attribution` | 022 | ⚠️ `POST /attribution` exists — **no client calls it** | Permanently empty |
| `attribution_events` | 022 | 🔴 **none, anywhere** | Permanently empty |

Verified by grep across `server.js`, `lib/*.js`, and the entire Expo `src/` tree.

Three further structural findings change the spec:

- **There is no queue.** `/analyze` calls Claude inline and returns via `res.json()`. "Queue size", "background job status" and "restart workers" describe an architecture this system does not have.
- **There is no health endpoint.** `GET /` returns a static `{status:"ok"}` with no database, Redis, or storage probe.
- **The live `/admin/metrics` payload ships a dead metric.** Its `referrals` block reads the `referrals` table from the referral-rewards program that was **retired for App Store Guideline 3.1.1**. Both entry points now return `410`. That block can only report zeros or stale rows.

**Recommendation:** merge and deploy the page that already exists (2 commits, already pushed, never rendered against a live server), then spend Phase 2 on writers — not on cards.

---

## 2. Current implementation inventory

### 2.1 Backend — endpoints

| Route | Middleware chain | Status |
|---|---|---|
| `GET /admin/metrics` | `adminLimiter` (30/min) → `requireRealAuth` → `requireAdmin` | Live |
| `GET /admin/access?email=` | same | Live — user lookup + resolved entitlement + grants |
| `POST /admin/access` | same | Live — grant/revoke, mirrors to RevenueCat |
| `GET /` | none | Static `{status:"ok"}` — **not a health check** |
| `POST /webhooks/revenuecat` | `webhookLimiter` + shared-secret | Live, but writes no revenue |
| `GET /referral-codes/:code` | `attributionReadLimiter` | Live, public, validate-one-never-enumerate |
| `POST /attribution` | `attributionWriteLimiter` → `requireAuth` | Live — **zero callers** |

`requireAdmin` (`server.js:3584`) checks membership in the `ADMIN_USER_IDS` env allowlist and **fails closed when unset**. There is deliberately no `profiles.is_admin` column — migration 006 exists because a client-writable privilege column was a mistake once already.

### 2.2 Backend — the aggregate

`admin_metrics(target_app TEXT DEFAULT 'baseball')`, migration 013, `SECURITY DEFINER`, `REVOKE`d from `anon`/`authenticated`, `GRANT EXECUTE` to `service_role` only. It reads `auth.users`, which is why it cannot be exposed any other way.

Returned keys, verified against the SQL:

```
users.{total_auth_users, attributed, unattributed, new_7d, new_30d}
active_users.{d1, d7, d30}
sessions.{total, last_7d, last_30d, unattributed, by_mode}
sessions_per_active_user_30d
avg_score_by_mode
cost.{events_total, usd_total, usd_last_30d, usd_per_analysis,
      usd_per_user_30d, p50_latency_ms, by_tier}
```

The endpoint merges in `free_cap` (Redis SCAN) and `referrals` (dead — see §6).

### 2.3 Database objects

- **Tables (relevant):** `sessions`, `profiles`, `analysis_events`, `webhook_events`, `referrals`, `referral_codes`, `reward_grants`, `access_grants`, `referral_campaigns`, `user_attribution`, `attribution_events`, `teams`, `team_members`, `drill_outcomes`, `guardian_consents`
- **Views:** exactly one — `drill_effectiveness_agg` (migration 010)
- **Materialized views:** none
- **Triggers:** `after_favorite_insert`, `after_session_insert_pmi` (both notification fan-out, migration 005)
- **Scheduled jobs:** no `pg_cron`, no `cron.schedule`. The only scheduled thing in the system is `.github/workflows/backup.yml`
- **Indexes for the dashboard:** `analysis_events(created_at DESC)`, `analysis_events(user_id)`, `sessions(user_id)`, `sessions(session_date DESC)`, `sessions(app)` — all added by 013

### 2.4 Redis (Upstash REST)

| Key pattern | TTL | What it can tell you |
|---|---|---|
| `analyze_lifetime:{userId}` | **none — durable** | Free-tier consumption; paywall intent |
| `analyze_player:{userId}:{YYYY-MM}` | 60d | Player Premium monthly usage |
| `analyze_role:{role}:{userId}:{YYYY-MM}` | 60d | Comped-role usage, kept separate from paid |
| `analyze_fairuse:{userId}:{YYYY-MM}` | 60d | Coach fair-use consumption |
| `analyze:global:{date}` | **48h** | Daily analysis volume — **unrecoverable after 2 days** |
| `rc_tier:{appUserId}` | short | RevenueCat tier cache |
| `team:{id}`, `joincode:{code}` | none | Team persistence |

`countUsersAtFreeCap()` bounds its SCAN at `FREE_CAP_SCAN_MAX = 5000` and reports `truncated: true` rather than a wrong total.

### 2.5 AI cost capture

`/analyze` computes, at `server.js:1085`:

```
cost = (in×3 + cache_write×3.75 + cache_read×0.30 + out×15) / 1e6
```

Hardcoded Sonnet pricing. Every field (tokens, cost, latency, stop reason, frame count, tier, mode) is persisted by `recordAnalysisEvent()` **after** `res.json()`, in a function that never throws or rejects.

⚠️ **`analysis_events` records successes only.** A failed, refused, or dropped analysis leaves no row. Failure rate, error rate and completion rate are therefore not derivable from this table.

### 2.6 Frontend — what exists

`baseball-mechanics-web`, branch `feat/admin-dashboard`, **2 commits ahead of `origin/main`, pushed, NOT merged ⇒ not deployed.**

- `src/app/(app)/admin/page.tsx` — 4 sections: Activity, Users, Sessions (+ per-mode table), Cost
- `src/lib/admin-service.ts` — `getAdminMetrics()`, `ForbiddenError`, Supabase bearer token
- `AdminMetrics` type in `src/lib/types.ts`
- Deliberately absent from `nav-config.ts`; reachable by URL only
- 401 vs 403 surfaced differently; `unattributed`, `free_cap.truncated`, `free_cap.unavailable` all rendered honestly, never as `0`
- Verified green: `tsc --noEmit`, `eslint`, `next build`, `check:a11y`, `check:contrast`. **Never rendered against a live server.**

---

## 3. Metrics inventory

Effort: **S** ≤ half a day · **M** 1–3 days · **L** ≥ 1 week.

### 3.1 Available now — Phase 1 candidates

| Dashboard metric | Available | Source | Endpoint / RPC | Missing work | Effort |
|---|---|---|---|---|---|
| Daily Active Users | ✅ | `sessions` | `admin_metrics` → `active_users.d1` | Card exists | — |
| Weekly Active Users | ✅ | `sessions` | `active_users.d7` | Card exists | — |
| Monthly Active Users | ✅ | `sessions` | `active_users.d30` | Card exists | — |
| New users 7d / 30d | ✅ | `auth.users` | `users.new_7d/new_30d` | Card exists | — |
| Total analyses | ✅ | `analysis_events` | `cost.events_total` | Card exists | — |
| Analyses by mode | ✅ | `sessions` | `sessions.by_mode` | Table exists | — |
| AI cost 30d / lifetime | ✅ | `analysis_events` | `cost.usd_last_30d`, `usd_total` | Card exists | — |
| Avg AI cost per analysis | ✅ | `analysis_events` | `cost.usd_per_analysis` | Card exists | — |
| Avg processing time (p50) | ✅ | `analysis_events` | `cost.p50_latency_ms` | Card exists | — |
| Analyses by tier | ✅ | `analysis_events` | `cost.by_tier` | Rendered as a text line | S |
| Users at free cap | ✅ | Redis SCAN | `free_cap.atCap` | Card exists | — |
| Avg mechanics score by mode | ✅ | `sessions` | `avg_score_by_mode` | Table exists | — |
| **New users today** | ⚠️ | `auth.users` | — | Add `new_1d` to the RPC | S |
| **Analyses today** | ⚠️ | `analysis_events` | — | Add `events_1d` / `usd_1d` to the RPC | S |
| **AI cost today** | ⚠️ | `analysis_events` | — | Same | S |
| **p95 latency** | ⚠️ | `analysis_events` | — | Second `PERCENTILE_CONT` | S |
| **Day-over-day deltas** | ⚠️ | all of the above | — | Return prior-period values so the UI can compute % change | M |
| **Sparkline series** | ⚠️ | `analysis_events`, `sessions` | — | Add a daily-bucket time series to the RPC | M |
| **Cost per mode / per tier** | ⚠️ | `analysis_events` | — | `GROUP BY` already indexed | S |

### 3.2 Blocked on a missing writer

| Dashboard metric | Available | Source that *should* feed it | Missing work | Effort |
|---|---|---|---|---|
| Revenue today / week / month | ❌ | RevenueCat webhook → `attribution_events.revenue_usd` | **Write revenue on webhook.** Table + dedupe key already exist | M |
| MRR / ARR | ❌ | RevenueCat | Either read RevenueCat Charts (zero code) or derive from stored events | M |
| Active subscribers | ❌ | RevenueCat | Webhook state machine per user, or RC REST | M |
| New subscribers today | ❌ | RevenueCat `INITIAL_PURCHASE` | Webhook writer | M |
| Cancellations / churn | ❌ | RevenueCat `CANCELLATION`, `EXPIRATION` | Webhook writer + cohort logic | L |
| Trial conversions | ❌ | RevenueCat trial events | Webhook writer | M |
| Refunds | ❌ | RevenueCat `REFUND` | Webhook writer | M |
| ARPU / LTV | ❌ | derived | Depends on all of the above | L |
| **Gross margin, revenue vs AI cost** | ❌ | revenue ÷ `analysis_events` | **Cost half is done.** Blocked only on revenue | S *(once revenue lands)* |
| QR code scans | ❌ | landing `/r/:code` | Landing page must POST a scan event; no scan table exists | M |
| Creator referrals | ❌ | `user_attribution` | **Client never calls `POST /attribution`** | M |
| Referral revenue / commission | ❌ | `attribution_events` | Both writers missing | L |
| App ratings / reviews | ❌ | App Store Connect API | **No ASC credential exists in the server env at all** | M |
| Crash count / crash-free rate | ❌ | `POST /report-error` | Reports go to **stdout + email only**. No table, no aggregation | M |
| Support tickets | ❌ | `POST /feedback` → email | No ticket store | M |
| Upload funnel, frame-extraction success | ❌ | client | **No funnel events instrumented anywhere** | L |
| Analysis completion / error rate | ❌ | `analysis_events` | Table is **success-only** — needs a failure row or an outcome column | M |
| Retention 7d / 30d | ❌ | `sessions` | Data exists; no cohort query written | M |
| Returning users | ❌ | `sessions` | Data exists; no query | S |
| API / DB / Redis / storage health | ❌ | — | **No health endpoint exists** | S |
| Avg API response time, slowest endpoint | ❌ | — | No request-timing middleware | M |
| Queue size, worker status | ❌ | — | **No queue exists** — `/analyze` is synchronous | n/a |
| Website visitors, traffic sources | ❌ | Vercel Analytics | Not enabled | S |
| Social follower counts | ❌ | external APIs | Manual entry is the honest option | M |

---

## 4. Gap analysis

### 4.1 Missing telemetry (no data is being captured)

1. **Funnel events** — app open, video selected, frames extracted, upload started, AI started/completed, results viewed, results shared. Nothing is instrumented. `analysis_events` fires at completion only, so every drop-off step in §8 of the spec is unobservable.
2. **Failed analyses** — `analysis_events` is success-only. Error rate and completion rate cannot be computed.
3. **Crash persistence** — `/report-error` logs to stdout and emails. Render log retention is the only durability, and the sending Gmail account has already been flagged once.
4. **Subscription events** — the RevenueCat webhook dedupes into `webhook_events` and updates the retired `referrals` table. It stores **no product, no price, no revenue, no status transition** for the live subscription business.
5. **QR / landing scans** — `GET /referral-codes/:code` validates a code but records nothing.
6. **Attribution** — `POST /attribution` has zero callers in the Expo client.
7. **Daily analysis volume** — `analyze:global:{date}` expires in 48h. Volume older than two days exists only in `analysis_events` (which is fine) but the Redis counter is not a historical source.

### 4.2 Missing backend

1. `GET /health` (or `/admin/health`) probing Supabase, Redis, Anthropic reachability, and reporting the deployed commit.
2. Today-scoped and prior-period figures in `admin_metrics` for delta arrows.
3. Daily time-series buckets for charts and sparklines.
4. Retention / cohort SQL.
5. Revenue aggregation — no endpoint, no view.
6. Request-timing middleware for response-time and slowest-endpoint metrics.
7. No caching layer on `/admin/metrics`. Every load runs the full aggregate. Fine now; it is a table-scan-per-load pattern as `sessions` grows.
8. `target_app` is a parameter of the RPC but the endpoint hardcodes `'baseball'` (`server.js:3662`), as does `recordAnalysisEvent` (`server.js:445`).

### 4.3 Missing frontend

Alerts, revenue, subscriptions, funnel, health, crashes, reviews, support, marketing, activity feed, charts, global search, filtering, quick actions, notifications, auto-refresh, environment badge, exec-summary deltas and sparklines. Also: no data-fetching library — every page hand-rolls `useEffect` + `useState`.

---

## 5. Reuse opportunities — do not rebuild these

**Backend**
- `requireRealAuth` + `requireAdmin` + `adminLimiter` — the full admin chain. Any new admin route reuses it verbatim.
- `admin_metrics()` — extend this function; do **not** add a second aggregate RPC.
- `analysis_events` — extend with columns; do **not** create a parallel events table.
- `attribution_events` / `user_attribution` / `referral_campaigns` — the marketing schema is already designed, with `rc_event_id UNIQUE` for webhook dedupe and `user_id` as PK for write-once. It needs writers, not tables.
- `webhook_events` — idempotency is already solved.
- `resolveEntitlement()` — the single source of truth for "what is this user entitled to". `GET /admin/access` already reuses it rather than defining a second notion of premium. Any subscription metric must go through it too.
- `oneLine()`, `isRealUserId()`, `denied()` — existing log/PII/response helpers.

**Frontend**
- `StatTile` — already supports value, decimals, suffix, hint, accent
- `DeltaBadge` — exactly the % change indicator the exec summary needs
- `AnimatedCounter`, `ProgressRing`, `ScoreCard`, `MetricRow`, `PlayerCard`
- `charts/sparkline`, `charts/trend-line`, `charts/category-bar`, `charts/chart-tooltip`, `charts/radar-categories` — **recharts 3.9 is already a dependency**
- `EmptyState`, `LoadingState`, `StatRowSkeleton`
- `Table`, `Tabs`, `Select`, `Dialog`, `DropdownMenu`, `Input`, `Skeleton`, `Badge`, `Card`
- `filter-chips.tsx` — the §18 filter bar
- `sonner` toasts — already wired
- `use-chart-colors.ts` + `lib/design/tokens.ts` (`brand.warning`, `brand.muted`). **Never hardcode a hex** — `check:contrast` gates it and `--accent-gold` does not exist
- `admin-service.ts` `authHeader()` pattern

---

## 6. Risks and technical debt

| # | Finding | Severity |
|---|---|---|
| 1 | **`/admin/metrics` ships a dead `referrals` block.** It reads the referral-rewards tables retired under Guideline 3.1.1 (both routes now `410`). It will report zeros forever and reads as "the program is broken" rather than "the program is gone" | High — misleading on a trust-critical screen |
| 2 | **`attribution_events` has no writer.** Every campaign revenue figure is structurally 0 | High |
| 3 | **`user_attribution` has no client writer.** Attribution coverage will be 0% until the onboarding field ships (queued for 1.2.4) | High |
| 4 | **`analysis_events` is success-only.** Any "completion rate" built on it silently reports 100% | High — a plausible-looking wrong number |
| 5 | `src/services/adminStats.js` still exists in the Expo client (2.7 KB, `__DEV__`-gated). Device-local `AsyncStorage`; `lifetimeRevenue` = purchases on one phone, `uniqueUsers` = local distinct names `\|\| 1`. **This is the precedent to avoid, and arguably should be deleted** | Medium |
| 6 | Claude pricing is hardcoded at `server.js:1085`. A price change or model swap silently corrupts every historical cost figure with no version marker on the row | Medium |
| 7 | No caching on `/admin/metrics`; full aggregate per load, ~12 subqueries | Medium (scales) |
| 8 | `REVENUECAT_WEBHOOK_SECRET` fails closed. If unset, a broken pipeline is indistinguishable from "no purchases" — the exact failure `referralFunnel()`'s `stuck_claimed_over_7d` was written to detect. **Verify it is set on Render before trusting any subscription metric** | Medium |
| 9 | No ASC credential in the server environment ⇒ reviews and Apple sales data are hard-blocked | Medium |
| 10 | Baseball and softball share one Supabase project; `sessions`/`profiles` co-mingle. `batting`-only rows are **undecidable** between the two apps and stay `unattributed`. Already surfaced honestly in the UI — keep it that way | Low (handled) |
| 11 | Web `/admin` has never been rendered against a live server | Low |

---

## 7. Recommended improvements

### 7.1 Database
- Extend `admin_metrics()` in place — today-scoped values, prior-period values for deltas, daily buckets, p95. One RPC, one round trip.
- Add an outcome discriminator to `analysis_events` (e.g. `outcome` + `error_kind`) so failures are countable. Extend the existing table; do not add a second one.
- Add a `pricing_version` or per-token-rate columns to `analysis_events` so historical cost survives a price change.
- Consider a materialized view for daily rollups **only when `sessions` makes the live aggregate slow** — not before.
- Migrations **019 and 020 are reserved** for COPPA Phase 4. The next free number is **023**.

### 7.2 API
- `GET /health` — Supabase, Redis, Anthropic, deployed commit. Small, and it unblocks the whole §9 App Health section.
- Extend the RevenueCat webhook to write `attribution_events` (revenue) and a subscription-state table. This single change unblocks §5 and §6 of the spec.
- Short-TTL cache on `/admin/metrics` (Redis, 30–60s) matching the auto-refresh interval.
- Thread `target_app` through from query string instead of hardcoding `'baseball'` — this is the §22 multi-product requirement, and the RPC already accepts it.
- Persist `/report-error` reports to a table before adding any crash card.

### 7.3 Frontend
- **Merge `feat/admin-dashboard` to `main` first** so the existing page is deployed and verified against real data.
- Adopt a data-fetching library **only if** auto-refresh + multiple parallel sections make hand-rolled `useEffect` unmanageable. TanStack Query is not currently a dependency; adding it is a real decision, not a default.
- Build the exec summary from `StatTile` + `DeltaBadge` + `charts/sparkline`. No new primitives.
- Reuse `filter-chips.tsx` for date-range and product filters.
- Keep the honesty rules from the existing page: never render a missing metric as `0`, always distinguish "unavailable" from "zero", always distinguish 401 from 403.

---

## 8. Phased roadmap

### Phase 1 — Ship what has data (highest ROI, no new telemetry)
1. Merge `feat/admin-dashboard` → `main`; deploy; render against the live server for the first time.
2. **Remove the dead `referrals` block** from `/admin/metrics` (risk #1).
3. Extend `admin_metrics()` with today-scoped and prior-period values + daily buckets.
4. Exec summary row: DAU, analyses today, AI cost today, new users today, users at free cap — each with a delta and a sparkline.
5. Charts: analysis volume, AI cost, DAU over time, with a 24h/7d/30d/90d selector.
6. Environment badge, last-updated timestamp, auto-refresh, `Ctrl/Cmd-K` no-op placeholder omitted until search has a backend.
7. Quick Actions as external links (Supabase, RevenueCat, ASC, Play Console, Render, Vercel) — zero backend.

*Explicitly not in Phase 1: revenue, subscriptions, crashes, reviews, support, funnel, health.*

### Phase 2 — Lightweight telemetry (unlocks the most sections per unit of work)
1. **RevenueCat webhook → revenue + subscription state.** Highest single-item ROI in this document: unblocks Revenue, Subscriptions, Gross Margin, and Referral Revenue at once. Verify `REVENUECAT_WEBHOOK_SECRET` on Render first.
2. `GET /health` + surface the App Health section.
3. Persist `/report-error` to a table; add crash count and crash-free rate.
4. Failure rows (or an outcome column) on `analysis_events`; add error rate and completion rate.
5. `POST /attribution` client call in onboarding (already queued for 1.2.4) + scan events on `/r/:code`.

### Phase 3 — Advanced analytics
Retention cohorts (7d/30d), funnel instrumentation and the funnel visual, campaign/creator attribution reporting, marketing dashboard, activity feed.

### Phase 4 — Operational monitoring
Request-timing middleware, slowest-endpoint tracking, AI cost optimization (cache-hit ratio is already captured in `cache_read_tokens`), alerting and notification transport, support-ticket store, ASC reviews integration.

---

## 9. Open questions for the operator

1. Is `REVENUECAT_WEBHOOK_SECRET` set on Render? Everything in Phase 2 item 1 depends on it.
2. Is `ADMIN_USER_IDS` set, and does it contain your Supabase user id? Without it `/admin/metrics` returns 403 to everyone including you.
3. Buy an App Store Connect API key for reviews and sales, or accept manual entry?
4. Delete `src/services/adminStats.js` from the client?
5. Multi-product (§22) in Phase 1 as a filter, or single-product until a second app ships?
