# Speed Cube Hub — Post-MVP Task List

Shared task board for multiple Claude sessions. All MVP tasks are complete.

## How to Use This File

**Before starting work:**
1. `git pull origin dev` to get the latest
2. Find a task that is `🔲 Available` with all dependencies `✅ Done`
3. Change status to `🏗️ In Progress` and add your identifier (e.g., `[Claude-A]`)
4. Commit and push the claim immediately

**When you finish a task:**
1. Change status to `✅ Done`
2. Commit and push your code + this file update together
3. Look for the next available task

**Rules:**
- Never start a task whose dependencies aren't all `✅ Done`
- Always pull before claiming
- Each task must result in a passing build (`npm run build`)
- Read the PRD and CLAUDE.md before starting any work

---

## Phase 1 — Bug Fixes (No Dependencies)

### T10: Fix Login Redirect Loop

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-E |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

Rewrote auth callback to use `createServerClient` with cookies set directly on the redirect response.

---

### T11: Fix WCA OAuth "Unknown Client" Error

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file + Vercel config |

Applied same cookie fix to WCA callback. User needs to verify Vercel env vars are set for WCA.

---

## Phase 2 — Quick UI Fixes (No Dependencies)

### T12: Navbar Logo + Footer Text

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 4 files |

Changed Timer→Box icon in navbar, login, signup. Updated footer text + added "Brand True".

---

### T13: Dynamic Landing Page Stats

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 3 files |

Created `getGlobalStats()` in `src/lib/actions/stats.ts`. Landing page fetches real DB stats and passes to SocialProof.

---

## Phase 3 — Dashboard Heatmap

### T14: Practice Activity Heatmap (Skool/GitHub Style)

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Built `PracticeHeatmap` component. 52-week grid with color intensity, hover tooltips, month/day labels, mobile scroll. Added to dashboard after stats cards.

---

## Phase 4 — Profile Overhaul

### T15: Database Schema Update for Profile Customization

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | SQL + 1 file |

Added `cubes`, `links`, `accomplishments` JSONB columns via migration `002_add_profile_customization.sql`. Updated Profile type with `ProfileCube`, `ProfileLink`, `ProfileAccomplishment` types. **Note:** SQL must be run in Supabase dashboard.

---

### T16: Profile Edit Mode (Edit Bio, Name, Avatar)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-E |
| **Dependencies** | T15 ✅ |
| **Estimated scope** | 3 files |

Added `updateProfile()` server action, `EditProfileModal` dialog component, and "Edit Profile" button (owner only) to profile header. Also displays actual avatar image when available.

---

### T17: Notable Accomplishments Section

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 2 files |

Built `Accomplishments` component with add/edit/delete modals. Added `updateProfileAccomplishments()` server action. Visible to all visitors, edit controls for owner only.

---

### T18: Editable Main Cubes

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 1 file |

Replaced hardcoded cubes with editable list from `cubes` JSONB column. Added `updateProfileCubes()` server action with add/edit/delete modals. Event selector uses WCA_EVENTS.

---

### T19: Editable Social Links

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-E |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 1 file |

Replaced hardcoded links with editable list from `links` JSONB column. Supports YouTube, IG, TikTok, X, Discord, WCA, Website. Inline add/edit/delete forms for owner. Added `updateProfileLinks()` server action.

---

### T20: Upcoming Competitions (Stretch)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-E |
| **Dependencies** | T15 ✅ |
| **Estimated scope** | 2 files |

Added `getUpcomingCompetitions()` to WCA actions (public API, cached 1hr). Built `UpcomingCompetitions` component with date badges, city/venue info, and external links. Fetched in profile server component, shown only when WCA ID is linked. Hidden gracefully if no upcoming comps.

---

---

## Phase 5 — Social Wave 2: Engagement

### T21: Likes/Kudos on Feed Sessions

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-F |
| **Dependencies** | None |
| **Estimated scope** | SQL migration + 2 server action files + 1 component + feed-item update |

Created `likes` table (`003_create_likes.sql`) with RLS policies. Built `likeSession()`, `unlikeSession()`, `getSessionLikeInfo()` server actions in `src/lib/actions/likes.ts`. Added `LikeButton` component (`src/components/feed/like-button.tsx`) with optimistic UI using `useOptimistic`. Updated `FeedItem` type with `like_count` and `has_liked`. Updated `getFeed()` to enrich items with like data.

---

### T22: Comments on Feed Sessions

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | SQL migration + 2 server action files + 2 components + feed-item update |

Created `comments` table with RLS policies (migration `004_create_comments.sql`). Built server actions: `addComment()`, `getComments()`, `deleteComment()`, `getCommentCounts()` in `src/lib/actions/comments.ts`. Added `Comment` type to `src/lib/types.ts`. Built `CommentSection` component with lazy-load on expand, add/delete with optimistic count updates. Added comment button (speech bubble icon + count) to feed items next to the like button. Comments load oldest-first for natural conversation flow. **Note:** SQL must be run in Supabase dashboard.

---

### T23: Notifications — Backend

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | T21 ✅, T22 ✅ |
| **Estimated scope** | SQL migration + 1 server action file |

Created `notifications` table (migration `006_create_notifications.sql`) with RLS policies (users can SELECT and UPDATE their own notifications only). Built server actions in `src/lib/actions/notifications.ts`: `createNotification()`, `getNotifications()`, `markAsRead()`, `markAllAsRead()`, `getUnreadCount()`. Added `Notification` type to `src/lib/types.ts`. Wired notification creation into `likeSession()` (likes.ts), `addComment()` (comments.ts), and `followUser()` (follows.ts) — each creates a notification for the target user, skipping self-notifications. **Note:** SQL must be run in Supabase dashboard.

---

### T24: Notifications — Page + Navbar Badge

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | T23 ✅ |
| **Estimated scope** | 1 page + 1 content component + navbar update |

Built `/notifications` page with server component (fetches notifications) + `NotificationsContent` client component. Notification cards show actor avatar, type-specific icon + message (like/comment/follow/pb/badge), relative timestamps via date-fns. Unread notifications highlighted with primary left border + subtle background tint. "Mark all as read" button with optimistic UI. Clicking a notification marks it as read and links to relevant page. Empty state with bell icon. Added bell icon to navbar with red unread count badge (shows number, caps at 99+). Updated middleware to protect `/notifications` route.

---

## Phase 6 — Social Wave 3: Motivation & Retention

### T25: Goals System

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-G |
| **Dependencies** | None |
| **Estimated scope** | SQL migration + 1 server action file + 2 components + dashboard update |

Built `goals` table with RLS. Server actions: `createGoal()`, `getGoals()`, `updateGoal()`, `deleteGoal()`, `checkGoalProgress()`. Goals section on dashboard with progress bars, auto-achievement detection (last 5 sessions avg), auto-expiry on deadline. Create/edit modal with event picker and target date.

---

### T26: PB History / Progress Charts

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-G |
| **Dependencies** | None |
| **Estimated scope** | 1 server action + 1 component + dashboard update |

Added `PBProgressChart` component to dashboard below pie/bar charts. Step-line chart shows running PB progression (best single + best avg) over time for each event. Event selector dropdown, custom tooltip with formatted times, reversed Y-axis (lower = better). Uses full session history (unfiltered by date range). No additional server action needed — computed client-side from existing session data.

---

### T27: Enhanced Streaks

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-H |
| **Dependencies** | None |
| **Estimated scope** | 1 component + profile update + dashboard update |

Added `longestStreak` to `getSessionStats()`. Created `StreakCard` component on dashboard with animated fire icon, current streak (prominent), longest streak, and milestone badges (7d, 30d, 100d, 365d). Updated profile stats with streak banner showing current streak with fire animation, plus longest streak in the stats grid. Milestones light up in cyan when earned.

---

### T28: Weekly/Monthly Challenges

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 1 server action file + 1 page + 2 components |

Built `challenges` and `challenge_participants` tables with RLS. Server actions in `src/lib/actions/challenges.ts`: `getChallenges()`, `joinChallenge()`, `leaveChallenge()`, `getChallengeProgress()`, `createChallenge()`. Built `/challenges` page with active/past sections, progress bars, join/leave buttons. Admin can create challenges via modal.

---

### T29: Badges & Credentials System

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 2 server action files + 3 components + profile update |

Built `badges` and `user_badges` tables with RLS (migration `008_create_badges.sql`). Seeded 17 badge definitions across 3 categories. Server actions: `getBadgeDefinitions()`, `getUserBadges()`, `claimCompetitionBadge()`, `claimSponsorBadge()`, `removeBadge()`, `approveBadge()`, `checkAndAwardMilestones()` in `src/lib/actions/badges.ts`. Built `BadgesSection` component (grouped display by category with tier-based styling) and `ClaimBadgeModal` (competition + sponsor claim forms). Wired into both profile pages. Auto-award milestones triggered after session creation. **Note:** SQL must be run in Supabase dashboard.

A dedicated badges section on every profile. Three badge categories:

**1. Competition Credentials (admin-verified)**
Pre-defined badge types: World Record Holder, Continental Record Holder, National Record Holder, World Champion, Continental Champion, National Champion, World Finalist, National Finalist. Users claim a credential (e.g., "National Record Holder — 3x3, 2024"), it shows as "pending" until an admin approves it. Current record holders get a gold/highlighted badge; former holders get a visually muted version (`is_current` flag). Each badge dated by year.

**2. Sponsor Badge (self-reported)**
Users enter their sponsor name and it displays as a visually impressive badge on their profile. No admin approval needed — takes effect immediately.

**3. Practice Milestones (auto-awarded)**
Initial set: "First 100 Solves", "First 1,000 Solves", "7-Day Streak", "30-Day Streak", "100-Day Streak", "Practiced All 17 Events", "100 Hours Practiced". Auto-award logic runs after session logging. Future: badges for algorithm sets mastered, more hour/solve milestones.

**Implementation:**
- Create `badges` table (name, description, icon, category, tier, criteria_type, criteria_value, verification)
- Create `user_badges` table (user_id, badge_id, year, detail, is_current, verified, earned_at)
- Seed initial badge definitions
- Build server actions: `claimBadge()`, `getUserBadges()`, `getPublicBadges()`, `approveBadge()` (admin), `checkAndAwardMilestones()` (auto)
- Build `BadgesSection` component on profile (dedicated card/section with grid of earned badges)
- Build `ClaimBadgeModal` for users to claim competition credentials or add sponsor
- Build admin badge approval UI (admin-only)

---

## Phase 7 — Social Wave 4: Community & Discovery

### T30: Public Leaderboards

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file + 1 page + 2 components |

Built `/leaderboards` page with 4 category tabs (Fastest Average, Most Solves, Longest Streak, Most Practice Time). Event selector for Fastest Average. Friends-only toggle for logged-in users. Desktop table + mobile card layout. Top-3 gold/silver/bronze styling. Server actions in `src/lib/actions/leaderboards.ts` using admin client. Added Leaderboards link to navbar for all users.

---

### T31: Clubs / Groups

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 1 server action file + 2 pages + 3 components |

Built `clubs` and `club_members` tables (migration `009_create_clubs.sql`) with RLS policies. Server actions split into `src/lib/actions/clubs.ts` (queries: getClubs, getClub, getClubMembers, getClubFeed, getUserClubs) and `src/lib/actions/club-mutations.ts` (mutations: createClub, joinClub, leaveClub, updateClub, deleteClub). Built `/clubs` page with search, create modal, join/leave buttons. Built `/clubs/[id]` detail page with activity tab (reusing FeedItem), members tab (with role badges: Owner gold, Admin primary, Member muted), edit/delete for owners/admins. Added Club and ClubMember types to `src/lib/types.ts`. **Note:** SQL must be run in Supabase dashboard.

---

### T32: Year in Review / Wrapped

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 server action + 1 page + 2 components |

Build `/wrapped` page showing annual stats summary for the logged-in user. Sections: total solves, total practice hours, number of sessions, most-practiced event, biggest PB improvement, longest streak, events practiced, month-by-month breakdown. Fun visual design inspired by Spotify Wrapped. Shareable (ties into T33).

---

### T33: Share Cards

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | 1 API route + 1 component + feed-item update |

Built OG image API route at `src/app/api/og/route.tsx` using `@vercel/og` (edge runtime). Accepts query params: `type` (session/pb), `name`, `event`, `time`, `solves`, `handle`. Generates 1200x630 branded dark-theme image with user info, event, stat, and SpeedCubeHub branding. Built `ShareButton` component (`src/components/feed/share-button.tsx`) with Web Share API (mobile) and clipboard fallback (desktop). Added share button to feed items (next to like/comment) and profile PB grid rows.

---

## Phase 8 — Built-In Timer

### T34: Timer Database Schema

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | SQL migration (2 new tables + 1 ALTER) |

Create `timer_sessions` table (id, user_id, event, mode, status, started_at, ended_at, session_id FK) and `solves` table (id, timer_session_id, user_id, solve_number, time_ms, penalty, scramble, event, comp_sim_group, notes, solved_at). Add `timer_session_id` nullable FK to existing `sessions` table. All with RLS policies and indexes. Add `TimerSession` and `Solve` types to `src/lib/types.ts`. Update `Session` type with optional `timer_session_id`.

**Database design notes:**
- `time_ms` is integer milliseconds (no floating point issues, standard in cubing timers)
- `user_id` and `event` are denormalized on `solves` for RLS policies and query efficiency
- `comp_sim_group` is null in normal mode, group number (1, 2, 3...) in comp sim mode
- `penalty` is text: null (no penalty), '+2' (+2 seconds), 'DNF' (did not finish)
- `timer_sessions.session_id` links to auto-created `sessions` row after finalization
- `sessions.timer_session_id` links back for "View Individual Solves" from feed items

**Full SQL** — see plan file at `.claude/plans/vivid-spinning-frost.md` Step 1 for CREATE TABLE statements.

---

### T35: Scramble Generation

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 npm package + 1 new file |

Install `cubing` package. Create `src/lib/timer/scrambles.ts` wrapping `cubing/scramble` → `randomScrambleForEvent(eventId)`. Map WCA event IDs to cubing.js IDs. Handle Next.js compatibility (client-side only, dynamic import with ssr: false). If cubing.js fails in Next.js build, fall back to `cstimer_module`. Pre-generate next scramble in background.

**Known risk:** cubing.js has a Next.js build compatibility issue (GitHub issue #309 — `import.meta.resolve()`). Mitigation: load only client-side. Fallback: `cstimer_module` npm package.

---

### T36: Timer Server Actions

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T34 ✅ |
| **Estimated scope** | 1 new file + 1 minor edit |

Create `src/lib/actions/timer.ts` with: `createTimerSession(event, mode)`, `addSolve(timerSessionId, data)`, `updateSolve(solveId, data)`, `deleteSolve(solveId)`, `getTimerSession(timerSessionId)`, `getActiveTimerSession(event)`, `finalizeTimerSession(timerSessionId)`.

**Finalize logic:** compute aggregates from solves → insert `sessions` row with practice_type 'Solves' or 'Comp Sim' → link bidirectionally (sessions.timer_session_id ↔ timer_sessions.session_id) → set status completed. Minor update to `src/lib/actions/sessions.ts` to accept optional `timer_session_id`.

---

### T37: Timer Averages + Inspection Utilities

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 new files |

Create `src/lib/timer/averages.ts`: `computeAoN(solves, n)` (trimmed mean — drop best + worst), `computeMoN(solves, n)` (straight mean), `computeSessionStats(solves)`, `getEffectiveTime(solve)` (applies +2/DNF penalty). All computed client-side from in-memory solve array.

Create `src/lib/timer/inspection.ts`: `useInspection()` React hook with 15-second countdown, voice warnings at 8s and 12s via Web Speech API `speechSynthesis`, auto-penalty rules (15-17s = +2, 17s+ = DNF).

---

### T38: Core Timer UI

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T34 ✅, T35 ✅, T36 ✅, T37 ✅ |
| **Estimated scope** | 7 new component files + 1 page + navbar + middleware |

Build the full timer UI:
- `src/app/(main)/timer/page.tsx` — server component, auth check, render TimerContent
- `src/components/timer/timer-content.tsx` — main orchestrator, adaptive layout (full-screen mobile, dashboard desktop via `md:grid md:grid-cols-[1fr_350px]`)
- `src/components/timer/timer-display.tsx` — big time display in `font-mono`, spacebar hold-to-ready (green) → release-to-start → any-key-to-stop (desktop), tap equivalent (mobile), toggle show/hide time while solving
- `src/components/timer/scramble-display.tsx` — scramble notation, adaptive font size, copy button, pre-fetches next scramble
- `src/components/timer/solve-list.tsx` — scrollable solve history, penalty buttons (+2/DNF/OK), delete, expand for full scramble; comp sim mode groups by Ao5 sets
- `src/components/timer/stats-panel.tsx` — running Ao5, Ao12, Mo100, BPA, WPA, best single, best Ao5, session mean; compact strip on mobile, sidebar on desktop
- `src/components/timer/timer-settings.tsx` — event selector, mode toggle (Normal/Comp Sim), inspection toggle, timer display toggle; gear icon opens Sheet panel

Add Timer link to navbar (`src/components/shared/navbar.tsx`). Add `/timer` to middleware protected routes.

---

### T39: Inspection Timer + Comp Sim Mode

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T38 ✅ |
| **Estimated scope** | 1 new component + updates to timer-content and solve-list |

Build `src/components/timer/inspection-overlay.tsx` — full-screen 15s countdown, color changes (green 15-8s → yellow 8-3s → red 3-0s → flashing DNF past 17s), voice warnings at 8s and 12s. Wire into timer-content when inspection setting is on.

Add comp sim mode: group solves in sets of 5 in solve-list with group averages, show "Solve 3/5" progress in stats-panel, compute trimmed mean per group.

---

### T40: Session Finalization + Summary

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T38 ✅ |
| **Estimated scope** | 1 new component + timer-content update |

Build `src/components/timer/session-summary-modal.tsx` — triggered by "End Session" button, shows total solves, session mean, best single, best Ao5, best Ao12, duration. "Save & Close" calls `finalizeTimerSession()` → auto-creates sessions row for feed/stats/leaderboards. "Keep Going" dismisses modal, stays in session. Update CLAUDE.md and PRD to mark timer as complete.

---

### T52: Upgrade Scrambles to WCA-Standard Random-State

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T35 ✅ |
| **Estimated scope** | 1 file rewrite + possible npm package swap or Next.js config |
| **Priority** | HIGH — current scrambles are random-move, not competition-grade |

**The problem:** `src/lib/timer/scrambles.ts` currently uses a simple random-move scramble generator as a fallback because `cubing.js` (which produces proper WCA random-state scrambles) fails in the browser due to Next.js Turbopack Web Worker bundling issues. Random-move scrambles are fine for casual practice but are NOT WCA-standard — they don't guarantee uniform state distribution, which matters for fair practice and comp sim mode.

**What "WCA-standard" means:**
- **2x2–4x4:** Must use random-state scrambles (every possible cube state is equally likely). This requires a solver/pruning table, not just random moves.
- **5x5–7x7:** Random-move scrambles are acceptable (WCA uses these too), but the move count and move set must follow WCA specs.
- **Pyraminx, Skewb, Clock, Square-1, Megaminx:** Each has specific WCA scramble generation rules.

**Approaches to investigate (in priority order):**
1. **Fix cubing.js in Next.js** — The root cause is Web Worker bundling. Options: configure Turbopack/Webpack to handle cubing.js workers, load cubing.js from a CDN via `<script>` tag, or run scramble generation in an iframe/service worker.
2. **Use `cstimer_module`** — The csTimer scramble engine as an npm package. Powers the most popular timer in the world. May have similar bundling issues but worth testing.
3. **Use `tnoodle` via API** — TNoodle is the official WCA scramble program (Java). Could run as a serverless function or microservice that returns scrambles via API. Adds latency but guarantees WCA compliance.
4. **Pre-generate scramble pools** — Generate batches of WCA-standard scrambles server-side (via a script using cubing.js in Node, where it works fine) and store them in a database table. Client pulls from the pool. Refill pool via cron job.

**File to modify:** `src/lib/timer/scrambles.ts`

**Acceptance criteria:** Scrambles for 2x2, 3x3, and 4x4 must be random-state. All other events must follow their respective WCA scramble specifications. The `cubing.js` fallback random-move generator can remain as a last-resort emergency fallback but should not be the primary path.

---

## Dependency Graph

```
Phases 1-4 (T10-T20) — ALL ✅ Done

Phase 5 — Social Wave 2: Engagement
T21 (Likes)          — no deps
T22 (Comments)       — no deps
T23 (Notifications)  — T21, T22
T24 (Notif Page)     — T23

Phase 6 — Social Wave 3: Motivation & Retention
T25 (Goals)          — no deps
T26 (PB Charts)      — no deps
T27 (Streaks)        — no deps
T28 (Challenges)     — no deps
T29 (Badges)         — no deps

Phase 7 — Social Wave 4: Community & Discovery
T30 (Leaderboards)   — no deps
T31 (Clubs)          — no deps
T32 (Wrapped)        — no deps
T33 (Share Cards)    — no deps
```

Phase 8 — Built-In Timer
T34 (DB Schema)          — no deps
T35 (Scrambles)          — no deps
T37 (Averages/Inspect)   — no deps
T36 (Server Actions)     — T34
T38 (Core Timer UI)      — T34, T35, T36, T37
T39 (Inspection + CompSim) — T38
T40 (Session Final)      — T38
T52 (WCA Scrambles)      — T35 (upgrade random-move → random-state)
```

**Max parallelism:**
- Phase 5 Wave A: T21, T22 (2 parallel)
- Phase 5 Wave B: T23 (after T21 + T22) → T24 (after T23)
- Phase 6: T25, T26, T27, T28, T29 (all 5 parallel — no deps on each other)
- Phase 7: T30, T31, T32, T33 (all 4 parallel — no deps on each other)
- Phase 8 Wave A: T34, T35, T37 (3 parallel — no deps on each other)
- Phase 8 Wave B: T36 (after T34)
- Phase 8 Wave C: T38 (after T34, T35, T36, T37) → T39, T40 (2 parallel after T38)
- Phase 9 Wave A: T41, T42, T43, T44, T45, T46 (all 6 parallel — no deps)
- Phase 9 Wave B: T47 (after T46)
- Phase 9 Wave C: T48, T49, T50 (all 3 parallel — no deps)

---

## Phase 9 — Security & Performance Hardening

Full audit completed 2026-02-25. Issues ranked by severity. Most tasks are independent and can run in parallel.

### SECURITY FIXES

---

### T41: Fix Open Redirect in Google OAuth Callback

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file, 1-line fix |
| **Priority** | HIGH — exploitable today |

**The problem:** In `src/app/api/auth/callback/route.ts` (lines 7, 14), the `next` query parameter is taken from user input and used as a redirect URL. An attacker can craft `?next=https://evil.com` and after Google login, the user gets silently redirected to a malicious site.

**The fix:** Validate that `next` is a relative path (starts with `/` and not `//`):
```ts
const rawNext = searchParams.get("next") ?? "/practice-stats"
const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/practice-stats"
```

---

### T42: Add Middleware for Route Protection + Session Refresh

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 new file (`src/middleware.ts`) |
| **Priority** | HIGH — auth sessions don't refresh without this |

**The problem:** There is no `middleware.ts` in the project. Without it:
- Supabase auth tokens don't get refreshed — users randomly get logged out
- No server-side route protection — anyone can hit protected page URLs directly
- Supabase's official `@supabase/ssr` docs require middleware for proper auth

**The fix:** Create `src/middleware.ts` that:
1. Creates a Supabase server client and calls `getUser()` to refresh the session on every request
2. Redirects unauthenticated users away from protected routes: `/practice-stats`, `/dashboard`, `/feed`, `/notifications`, `/log`, `/pbs`, `/wrapped`, `/challenges`, `/clubs`, `/profile` (own profile only — `/profile/[handle]` stays public), `/timer`, `/admin/*`
3. Allows public routes: `/`, `/login`, `/signup`, `/discover`, `/leaderboards`, `/profile/[handle]`, `/privacy`, `/terms`, `/api/*`

**Note:** There was previously a middleware that was removed during a login redirect fix (T10). The new one must use `createServerClient` with cookies set directly on the response to avoid that same issue.

---

### T43: Make createNotification and checkAndAwardMilestones Internal

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |
| **Priority** | MEDIUM — exploitable today but low impact |

**The problem:** Two functions in server action files are exported (making them callable from the browser) but should be internal helpers only:

1. **`createNotification`** in `src/lib/actions/notifications.ts` (lines 13-34) — No auth check. Anyone can call it to spam fake notifications to any user with any actor_id.
2. **`checkAndAwardMilestones`** in `src/lib/actions/badges.ts` (lines 316-431) — No auth check. Anyone can trigger badge recalculation for any user via the admin client.

**The fix:** Move these functions out of the `"use server"` exports. Options:
- Option A: Create internal helper files (e.g., `src/lib/helpers/notifications.ts`) that are NOT marked `"use server"`, and import from there in the server actions that need them.
- Option B: Keep them in the same files but don't export them — make them module-scoped functions called only by other exported functions in the same file.
- Either way, the functions must remain callable from OTHER server actions (likes.ts, comments.ts, follows.ts call createNotification; sessions.ts calls checkAndAwardMilestones).

---

### T44: Add Zod Input Validation to Session and PB Server Actions

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 3 files (shared schemas + 2 server action files) |
| **Priority** | MEDIUM |

**The problem:** Session and PB creation/update actions accept user input with no validation. Someone could submit negative solve counts, million-character titles, invalid event names, or times of 0.0001 seconds. Zod is already installed but unused.

**Files and functions to add validation:**
- `src/lib/actions/sessions.ts`: `createSession()` (line 25), `createSessionsBulk()` (line 116), `updateSession()` (line 192)
- `src/lib/actions/personal-bests.ts`: `logNewPB()` (line 40), `bulkImportPBs()` (line 110)

**Validation rules to enforce:**
- `event` — must be one of the values in `WCA_EVENTS` constant
- `practice_type` — must be one of `PRACTICE_TYPES` constant
- `num_solves` — integer, 0-10000
- `duration_minutes` — integer, 1-1440 (max 24 hours)
- `avg_time`, `best_time` — positive number, max 3600 (1 hour in seconds)
- `title` — max 200 characters
- `notes` — max 2000 characters
- `session_date`, `date_achieved` — valid ISO date string, not in the future
- `pb_type` — must be one of known types ("single", "ao5", "ao12", "ao50", "ao100")
- `time_seconds` — positive number, max 3600
- `bulkImportPBs` — add a count cap (e.g., 500) like `createSessionsBulk` already has

---

### T45: Sanitize PostgREST Search Filter in searchProfiles

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file |
| **Priority** | MEDIUM |

**The problem:** In `src/lib/actions/profiles.ts` (lines 88-92), the search input is interpolated into a PostgREST `.or()` filter string:
```ts
const searchTerm = `%${trimmed}%`
qb = qb.or(`display_name.ilike.${searchTerm},handle.ilike.${searchTerm},location.ilike.${searchTerm}`)
```
A search term containing `,` or `.` characters could break or manipulate the filter.

**The fix:** Replace the string interpolation with individual `.or()` using the filter builder, or sanitize the input to strip PostgREST special characters (`,`, `.`, `(`, `)`, `!`). The cleanest approach:
```ts
query = query.or(`display_name.ilike.%${sanitized}%,handle.ilike.%${sanitized}%,location.ilike.%${sanitized}%`)
```
where `sanitized` strips or escapes `,` and `.` characters from the input.

---

### T46: Reduce Admin Client Overuse — Fix RLS Policies

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations + 8-10 server action files |
| **Priority** | MEDIUM — defense-in-depth improvement |

**The problem:** Many server actions use `createAdminClient()` (which bypasses all database security rules) when the regular user client would work if proper RLS policies existed. This defeats the purpose of database-level security.

**Files using admin client unnecessarily (read-only queries on public data):**
- `src/lib/actions/follows.ts` — `getFollowCounts()`, `isFollowing()`, `getFollowers()`, `getFollowing()`
- `src/lib/actions/clubs.ts` — `getClubs()`, `getClub()`, `getClubMembers()`, `getClubFeed()`, `getUserClubs()`
- `src/lib/actions/challenges.ts` — `getChallenges()`, `joinChallenge()`, `leaveChallenge()`, `getChallengeProgress()`
- `src/lib/actions/leaderboards.ts` — all functions
- `src/lib/actions/stats.ts` — `getGlobalStats()`
- `src/lib/actions/badges.ts` — `getBadgeDefinitions()`, `getUserBadges()`
- `src/lib/actions/sor-kinch.ts` — all functions
- `src/lib/actions/feed.ts` — `getFeed()`
- `src/lib/actions/notifications.ts` — all functions

**The fix:**
1. Add SELECT RLS policies to tables that need them: `follows`, `clubs`, `club_members`, `challenges`, `challenge_participants`, `sessions` (public read), `badges`, `user_badges`, `wca_rankings`, `wca_countries`
2. Replace `createAdminClient()` with `createClient()` in the functions listed above
3. Keep admin client ONLY for: profile creation during signup (no session yet), creating notifications for other users, admin badge approval, WCA revalidation endpoint

**This is the largest task in this phase.** Consider splitting: do follows + clubs first, then challenges + leaderboards, etc.

---

### PERFORMANCE FIXES

---

### T47: Fix Leaderboards — Move Aggregation to Database

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T46 (if RLS policies change, leaderboard queries need to match) |
| **Estimated scope** | 1 server action file + SQL (RPC functions or views) |
| **Priority** | CRITICAL — 3 full-table scans on every leaderboard page visit |

**The problem:** `src/lib/actions/leaderboards.ts` (lines 78-168) fetches the ENTIRE sessions table into Node.js memory THREE times (once per leaderboard type), aggregates in JavaScript Maps, sorts, then returns only the top 50. With 1,000 users × 100 sessions = 300,000 rows loaded on every page visit. Also, Supabase's default 1,000-row limit means results may already be silently wrong.

**The fix:** Create Supabase RPC functions (database-level SQL) for each leaderboard:

1. **Most Solves:** `SELECT user_id, SUM(num_solves) as total FROM sessions GROUP BY user_id ORDER BY total DESC LIMIT 50`
2. **Most Practice Time:** `SELECT user_id, SUM(duration_minutes) as total FROM sessions GROUP BY user_id ORDER BY total DESC LIMIT 50`
3. **Longest Streak:** This is the hardest — need a SQL window function to compute consecutive-day streaks. Consider a pre-computed `user_stats` table updated after session creation instead.
4. **Fastest Average:** Already uses a proper query pattern — verify it respects the row limit.

Each RPC function should JOIN profiles for display_name, handle, avatar_url so only one query is needed per leaderboard. Update `src/lib/actions/leaderboards.ts` to call these RPCs instead of loading all data into memory. Also add friends-only filtering as a parameter to the RPC.

---

### T48: Fix Landing Page Stats — Use Database Aggregation

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file + SQL |
| **Priority** | CRITICAL — full table scan on every landing page visit |

**The problem:** `src/lib/actions/stats.ts` (lines 15-19) fetches EVERY session row to compute totals for the landing page. Every visitor (including non-logged-in users) triggers this.

**The fix:** Replace with database aggregation. Options:
- **Option A (simple):** Create a Supabase RPC function: `SELECT COUNT(*) as session_count, COALESCE(SUM(duration_minutes), 0) as total_minutes, COALESCE(SUM(num_solves), 0) as total_solves FROM sessions` — one query, no rows transferred.
- **Option B (best perf):** Create a `global_stats` single-row table updated by a database trigger on sessions INSERT/UPDATE/DELETE. Landing page reads one row instead of scanning the entire table.
- Also get profile count via `supabase.from("profiles").select("*", { count: "exact", head: true })` (returns count without loading rows).

---

### T49: Fix Navbar — Reduce Server Calls from 8 to 1

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file + 1 component |
| **Priority** | HIGH — runs on EVERY page navigation |

**The problem:** `src/components/shared/navbar.tsx` (lines 31-89) fires 4 server calls on mount (`getUser`, `getProfile`, `getUnreadCount`, `checkIsAdmin`), then `onAuthStateChange` fires and triggers the same 4 calls again. That's 8 round trips on every page load. `getProfile()` fetches the entire profile (including large JSONB columns) when the navbar only needs `avatar_url` and `display_name`.

**The fix:**
1. Create a lightweight `getNavbarData()` server action that returns `{ displayName, avatarUrl, unreadCount, isAdmin }` in a single database query + admin check.
2. In the navbar, call `getNavbarData()` once on mount.
3. Remove the duplicate `onAuthStateChange` calls — only use `onAuthStateChange` to detect sign-out (clear state), not to re-fetch everything.
4. Only `unreadCount` needs periodic refresh — consider a 30-second polling interval instead of re-fetching on every navigation.

---

### T50: Fix Dashboard — Deduplicate Session Fetches + Add Limits

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1-2 server action files + 1-2 page files |
| **Priority** | HIGH — doubles the data load on practice-stats and dashboard pages |

**The problem:** Multiple overlapping issues on the practice-stats and dashboard pages:

1. **Double fetch:** Both `/practice-stats/page.tsx` and `/dashboard/page.tsx` call `getSessions()` AND `getSessionStats()`, which both run `select("*")` on the full sessions table for the current user. Same data loaded twice.
2. **No limit:** Neither query has a `.limit()`. A user with 2,000 sessions loads all of them.
3. **Over-fetching:** `getSessionStats()` fetches all columns (`select("*")`) but only uses `session_date` and `duration_minutes`.
4. **Goal check N+1:** `checkGoalProgress()` (called on both pages) loops through each active goal making 1-3 sequential DB queries per goal.

**The fix:**
1. Change `getSessionStats()` to `select("session_date, duration_minutes")` instead of `select("*")`.
2. Add `.limit(500)` to `getSessions()` (or implement cursor-based pagination).
3. Refactor `checkGoalProgress()`: fetch all user sessions once, group by event in memory, check all goals against pre-loaded data. Batch expired/achieved updates using `.in("id", idsToUpdate)`.
4. Either compute stats from the already-fetched sessions on the client, or remove the duplicate fetch by having `getSessionStats()` accept an array of sessions instead of re-querying.

**Also fix in this task:**
- `getSessionsByUserId()` in sessions.ts (line 11) — add `.limit(200)` for profile pages
- `getFollowers()`/`getFollowing()` in follows.ts — add `.limit(100)`
- `generateUniqueHandle()` in profiles.ts (lines 162-171) — replace the up-to-999 sequential query loop with a single `.ilike("handle", baseHandle + "%")` query

---

### T51: Replace select("*") With Explicit Column Lists

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 5-6 server action files |
| **Priority** | MEDIUM — reduces bandwidth and prevents future data leaks |

**The problem:** Most queries use `select("*")` which fetches every column. This wastes bandwidth (especially for JSONB columns like `cubes`, `links`, `accomplishments`) and means if a sensitive column is ever added to a table, it would automatically be exposed.

**Files to fix:**
- `src/lib/actions/sessions.ts`: `getSessions()` line 87, `getSessionsByUserId()` line 13 — only need: `id, user_id, session_date, event, practice_type, num_solves, duration_minutes, avg_time, best_time, title, notes, feed_visible, created_at`
- `src/lib/actions/profiles.ts`: `getProfile()` line 24, `getProfileByHandle()` line 43, `searchProfiles()` line 75 — for search results only need: `id, display_name, handle, avatar_url, bio, location, main_event, wca_id`
- `src/lib/actions/clubs.ts`: `getClubs()` line 31 — only needs: `id, name, description, avatar_url, created_by, created_at`
- `src/lib/actions/challenges.ts`: `getChallenges()` line 26 — only needs: `id, title, description, type, target_value, start_date, end_date, created_at`
- `src/lib/actions/feed.ts`: `getFeed()` session query — limit to columns actually displayed in feed items

---

## Phase 9 Dependency Graph

```
Phase 9 — Security & Performance Hardening

SECURITY (Wave A — all parallel, no deps):
T41 (Open Redirect)         — no deps ⚡ quickest fix
T42 (Middleware)             — no deps
T43 (Internal Helpers)       — no deps
T44 (Zod Validation)         — no deps
T45 (Search Sanitize)        — no deps
T46 (RLS + Admin Client)     — no deps (largest task)

PERFORMANCE (Wave B — mostly parallel):
T47 (Leaderboard SQL)        — T46 (needs RLS policies in place)
T48 (Landing Stats SQL)      — no deps
T49 (Navbar Optimization)    — no deps
T50 (Dashboard Dedup)        — no deps
T51 (select("*") cleanup)    — no deps
```

**Max parallelism:** Up to 5 agents on Wave A, then up to 4-5 agents on Wave B. T47 must wait for T46 since leaderboard queries need matching RLS policies.
