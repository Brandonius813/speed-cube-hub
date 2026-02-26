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
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T35 ✅ |
| **Estimated scope** | 1 file rewrite + possible npm package swap or Next.js config |
| **Priority** | HIGH — current scrambles are random-move, not competition-grade |

**Solution:** Created a server-side API route (`/api/scramble`) that runs cubing.js in Node.js (where Web Workers work correctly). Added `serverExternalPackages: ["cubing"]` to `next.config.ts` so Next.js doesn't try to bundle cubing.js. Updated `src/lib/timer/scrambles.ts` to call the API route first, falling back to random-move scrambles if the API is unavailable. The timer's existing pre-generation pattern (fetching the next scramble while the user solves) masks any network latency.

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
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
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
| **Priority** | LOW — must audit live DB schema before re-attempting |

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

---

## Phase 10 — QoL Polish (All Independent — Max 4 Parallel Agents)

---

### T53: Navbar Active Tab + Notification Popup

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files (1 modify, 1 create) |
| **Priority** | HIGH |

**Two changes to the navbar:**

**A) Active Tab Highlighting** — No visual indication of which page you're on currently.

File: `src/components/shared/navbar.tsx`
- Import `usePathname` from `next/navigation` and `cn` from `@/lib/utils`
- Create `navLinkClass(href)` helper that compares `pathname` to each link's `href`
- Active state: `text-foreground` + `border-b-2 border-primary` underline on desktop; brighter icon on mobile
- Inactive: existing `text-muted-foreground` with hover
- Replace all hardcoded className strings on nav `<Link>` elements with `navLinkClass()` calls
- Special case: admin link keeps yellow color treatment, just make it brighter when active

**B) Notification Popup** — Bell icon currently navigates to a full page. Should be a popup dropdown.

Create: `src/components/shared/notification-popup.tsx` (~200 lines)
Modify: `src/components/shared/navbar.tsx` — swap bell `<Link>` for popup component

- Use existing Shadcn `Popover` component (renders via portal, handles click-outside)
- Bell icon becomes `PopoverTrigger` (keeps the unread badge)
- On open: fetch `getNotifications(10)` for 10 most recent; show loading skeleton while fetching
- Each notification item shows icon, message, time ago, unread dot (copy styling from `NotificationCard` in `notifications-content.tsx`)
- Header: "Mark all as read" button
- Footer: "View all notifications" link to `/notifications`
- **On popover close:** call `markAllAsRead()` if any were unread, update navbar badge to 0, dispatch `notifications-updated` event
- Clicking a notification: marks as read, closes popover, navigates to target page
- Mobile: popup width `w-[calc(100vw-2rem)]`, `max-h-[70vh]` with scroll
- Keep `/notifications` full page as-is — popup is an addition, not a replacement
- Component receives `unreadCount` + `onUnreadCountChange` props from navbar

**Helper functions to copy into popup** (don't refactor existing file — smallest change rule):
`getNotificationIcon`, `getNotificationMessage`, `getNotificationLink`, `getInitials` from `notifications-content.tsx`

**Existing code to reuse (don't rebuild):**
- `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`
- `getNotifications`, `markAllAsRead`, `markAsRead` from `@/lib/actions/notifications`
- `notifications-updated` custom window event pattern (already used by navbar + notifications page)

---

### T54: Practice Stats Page Overhaul

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-F → Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 10 files (4 create, 4 modify, 2 delete) |
| **Priority** | HIGH |

Complete overhaul of the practice stats page layout, filters, and visualizations.

**New layout order in `dashboard-content.tsx`:**
```
1. PracticeStreak (heatmap + streak counters merged — NEW component)
2. DashboardFilters (enhanced with more controls)
3. StatsCards (2 cards only — Sessions This Week + Total Practice Time)
4. Grid: TimeByEventChart (NEW) + EventPieChart (existing)
5. DailyBarChart (modified to respect date filter)
6. EventBreakdownTable (NEW)
7. SessionLog (unchanged)
```

**Removed from page:** StreakCard (merged into heatmap), GoalsSection (defer to profile later), PBProgressChart (separate PBs page exists)

#### Files to create:

**1. `src/components/dashboard/practice-streak.tsx`** (~200 lines)
- Merges `practice-heatmap.tsx` + `streak-card.tsx` into one card
- Title: "Practice Streak" (was "Practice Activity")
- Header area: current streak (flame icon + number) + longest streak (trophy + number) + milestone badges (7d, 30d, 100d, 365d) — all from old `StreakCard`
- Below header: 52-week heatmap grid (reuse existing grid logic from `practice-heatmap.tsx`)
- Props: `sessions: Session[]`, `currentStreak: number`, `longestStreak: number`
- Pre-compute `sessionsByDate` map (`Map<string, Session[]>`) for tooltip lookup
- Heatmap cells use `onMouseMove` (not `onMouseEnter`) to track cursor position for floating tooltip
- Tooltip state: `{ date: string, mouseX: number, mouseY: number } | null`

**2. `src/components/dashboard/heatmap-tooltip.tsx`** (~120 lines)
- Portal-based floating tooltip using `createPortal(content, document.body)`
- Props: `sessions: Session[]` (sessions for hovered date), `date: string`, `mouseX: number`, `mouseY: number`, `visible: boolean`
- Smart positioning: offset 12px from cursor, flips when near right/bottom viewport edges, clamped to viewport
- `pointer-events-none` + `z-[9999]` so it never interferes or gets clipped
- Shows:
  - Date formatted ("Wed, Feb 25, 2026")
  - List of sessions: event name, num solves, duration per session
  - Separator line + Total row with summed duration
- Empty state: "No practice" text

**3. `src/components/dashboard/time-by-event-chart.tsx`** (~100 lines)
- Horizontal bar chart using Recharts `BarChart` with `layout="vertical"`
- Shows total practice time per event from filtered sessions, sorted descending
- `XAxis type="number"` with `formatDuration` tick formatter
- `YAxis type="category" dataKey="event"` with event labels
- Uses shared `EVENT_COLORS` from `@/lib/constants`
- Card wrapper matching existing chart card styling

**4. `src/components/dashboard/event-breakdown-table.tsx`** (~100 lines)
- Table columns: Event (with cubing icon), Total Time (formatted), Solves, % of Total
- Computed from filtered sessions, sorted by most time descending
- `font-mono` for all numeric values
- Desktop: standard table; Mobile: card layout per row

#### Files to modify:

**5. `src/components/dashboard/filters.tsx`**
- Add Practice Type multi-select dropdown (same pattern as Event dropdown)
  - Derive available types from sessions (pass as `availablePracticeTypes` prop)
- Add "Search Notes" text input (filters by `notes`/`title` substring, case-insensitive)
- Add "Clear Filters" button (visible only when any filter is active)
- Expand date range buttons: Today (`1d`), Last Week (`7d`), 30 days, 90 days, This Year (`1y`), Last 365 Days (`365d`), All Time, Custom
- Update `DateRange` type: `"1d" | "7d" | "30d" | "90d" | "1y" | "365d" | "all" | "custom"`
- New props: `selectedPracticeTypes`, `onPracticeTypesChange`, `searchNotes`, `onSearchNotesChange`, `onClearFilters`, `availablePracticeTypes`

**6. `src/components/dashboard/dashboard-content.tsx`**
- Add state: `selectedPracticeTypes: string[]`, `searchNotes: string`
- Derive `availablePracticeTypes` via useMemo from `initialSessions`
- Update `filteredSessions` useMemo: add practice type + notes search filters, new date ranges
- Compute filtered stats from filteredSessions (sessions count, total minutes, weekly stats)
- Remove imports: `StreakCard`, `GoalsSection`, `PBProgressChart`
- Add imports: `PracticeStreak`, `TimeByEventChart`, `EventBreakdownTable`
- Remove `initialGoals` prop and `goalAverages` computation
- New render order per layout above; pass `filteredSessions` to ALL components
- Add `handleClearFilters` callback

**7. `src/components/dashboard/daily-bar-chart.tsx`**
- Change from hardcoded 7 days to showing data from all passed sessions
- Adaptive grouping: <=14 days daily, <=90 days weekly, >90 days monthly
- Still stacked bars by top 3 events + "other" bucket

**8. `src/components/dashboard/stats-cards.tsx`**
- Remove the third "Current Streak" card (now in heatmap)
- Change grid from `md:grid-cols-3` to `md:grid-cols-2`

#### Server component + shared constant:

**9. `src/app/(main)/practice-stats/page.tsx`** — Remove `getGoals`/`checkGoalProgress` imports/calls, remove `initialGoals` prop

**10. `src/lib/constants.ts`** — Add shared `EVENT_COLORS` export, update `event-pie-chart.tsx` and `daily-bar-chart.tsx` to import from here

#### Files to delete:
- `src/components/dashboard/streak-card.tsx` (merged into practice-streak)
- `src/components/dashboard/practice-heatmap.tsx` (replaced by practice-streak)
- `goals-section.tsx` and `goal-modal.tsx` stay — just remove imports from dashboard-content

**Reference design:** Filters styled similar to https://www.brandontruecubing.com/practicestats

**Existing code to reuse:** Heatmap grid logic from `practice-heatmap.tsx`, streak UI from `streak-card.tsx`, `formatDuration` from `@/lib/utils`, `WCA_EVENTS`/`CubingIcon`, Recharts components

---

### T55: PB Type Fix — Add Ao5 for 6x6 and 7x7

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file, 2-line change |
| **Priority** | LOW |

File: `src/lib/constants.ts` (lines 86-87 in `EVENT_PB_TYPES`)

```
Before: "666": ["Single", "Mo3", "Ao12", "Ao50", "Ao100"]
After:  "666": ["Single", "Ao5", "Mo3", "Ao12", "Ao50", "Ao100"]

Before: "777": ["Single", "Mo3", "Ao12", "Ao50", "Ao100"]
After:  "777": ["Single", "Ao5", "Mo3", "Ao12", "Ao50", "Ao100"]
```

No other files need changes — `getPBTypesForEvent()` reads from this config and all consumers use that function.

---

### T56: Time Distribution + Time Trend Charts (Solve-Level Analytics)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 server action + 2 components + 2 integration points |
| **Priority** | MEDIUM |

Two new charts that visualize individual solve data (from the `solves` table). Accessible from both the timer page and practice stats page. Most users don't have much solve data yet, so empty states are important.

**A) Time Distribution Histogram** — Like csTimer's distribution view

Shows how solve times are distributed across time buckets (e.g., 6-8s, 8-10s, 10-12s). Each bar shows the count of solves in that bucket. Optionally shows cumulative count.

Create: `src/components/shared/time-distribution-chart.tsx` (~150 lines)
- Recharts `BarChart` with 2-second buckets (adaptive bucket size based on time range)
- X axis: time buckets (e.g., "8-10s", "10-12s")
- Y axis: solve count
- Two display modes (toggle): frequency count vs cumulative
- Filter out DNF solves
- Event selector (if showing across events)
- Empty state: "No individual solve data yet. Use the built-in timer to start tracking!"
- Props: `solves: Solve[]` (pre-filtered by event)

**B) Time Trend Graph** — Like csTimer's trend view

Shows individual solve times as bars over solve number, with Ao5 and Ao200 rolling average lines overlaid.

Create: `src/components/shared/time-trend-chart.tsx` (~180 lines)
- Recharts `ComposedChart` with:
  - `Bar` for individual solve times (gray, thin)
  - `Line` for Ao5 rolling average (red)
  - `Line` for Ao200 rolling average (blue)
- X axis: solve number
- Y axis: time in seconds
- Legend showing which lines are which (clickable to toggle on/off)
- Filter out DNF solves from the visual
- Props: `solves: Solve[]` (pre-filtered by event)
- Uses existing `computeAoN` from `src/lib/timer/averages.ts` for rolling averages

**C) Server Action: Get All Solves for User/Event**

Currently solves are only queried per-session. Need a new function.

Add to `src/lib/actions/timer.ts`:
```ts
export async function getSolvesByEvent(event: string, limit = 5000)
  // Fetch all solves for current user for this event
  // Order by solved_at ASC (oldest first) for trend chart
  // Return: { solves: Solve[], error?: string }
```

**D) Integration Points**

1. **Timer page** (`src/components/timer/stats-panel.tsx` or `timer-content.tsx`):
   - Add a "Charts" tab or expandable section below the stats grid
   - Show both charts for the current timer session's event
   - Use current session's solves from memory (no extra fetch)
   - Toggle: "This Session" vs "All Time" (All Time triggers `getSolvesByEvent`)

2. **Practice Stats page** (`src/components/dashboard/dashboard-content.tsx`):
   - Add both charts after existing charts area (before SessionLog)
   - Event selector to pick which event to show
   - Calls `getSolvesByEvent(selectedEvent)` on selection
   - Empty state if no solve data for that event

**Data notes:**
- `Solve.time_ms` is integer milliseconds (10320 = 10.32s)
- `Solve.penalty` can be `"+2"` (add 2000ms), `"DNF"` (exclude), or `null`
- Use `getEffectiveTime(solve)` from `src/lib/timer/averages.ts` to apply penalties
- `formatTimeMs()` from same file for display

---

### Phase 10 Dependency Graph

```
Phase 10 — QoL Polish (all parallel, no deps):
T53 (Navbar + Notifications)  — no deps
T54 (Practice Stats Overhaul) — no deps
T55 (PB Ao5 Fix)              — no deps ⚡ 2-line change
T56 (Solve Analytics Charts)  — no deps
```

**Max parallelism:** Up to 3 agents. T55 is trivial — do it first then start T56.

**Merge conflict note:** T54 and T55 both touch `src/lib/constants.ts`. T55 should commit first (tiny change). T54 agent should `git pull` before modifying constants.ts. T56 also adds to `dashboard-content.tsx` — if T54 runs in parallel, T54 does the restructure first, T56 adds solve charts after.

---

## Phase 11 — Profile Rework: 5-Tab Layout with Sidebar

Rework the profile page from a flat vertical stack into a 5-tab layout with a persistent Skool-style sidebar on desktop. On mobile, tabs are full-width and swipeable (Clash Royale-style). Applies to both `/profile` (own) and `/profile/[handle]` (public).

**Tab order (left to right):** PBs | Stats | Overview (default) | Cubes | Official

**Desktop:** Two-column grid — tabs + content on the left, sticky profile sidebar card on the right.
**Mobile:** Full-width tabs with swipe navigation. Sidebar info lives in the Overview tab.

---

### T57: Schema Change — `main_events` (up to 3)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | SQL migration + 3 files |
| **Priority** | HIGH — prerequisite for sidebar |

Add `main_events text[]` column to `profiles` table. Migrate existing `main_event` data. Update `Profile` type, `EditProfileModal` (multi-select, max 3), and `updateProfile` server action. Keep old `main_event` column for backward compatibility.

---

### T58: Server Action — `getPBsByUserId`

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 file |
| **Priority** | HIGH — prerequisite for PBs tab |

Add `getPBsByUserId(userId)` to `src/lib/actions/personal-bests.ts`. Fetches current PBs (`is_current = true`) for any user — no auth gate, since profiles are public. Caller filters by `profile.pb_visible_types`.

---

### T59: SessionLog `readOnly` Prop

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 file |
| **Priority** | HIGH — prerequisite for Stats tab |

Add `readOnly?: boolean` prop to `src/components/dashboard/session-log.tsx`. When true, hide select mode button, edit/pencil buttons, and bulk delete bar.

---

### T60: Profile Sidebar Component

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T57 |
| **Estimated scope** | 1 new file (~120 lines) |
| **Priority** | HIGH |

Create `src/components/profile/profile-sidebar.tsx` — Skool-style profile card. Contains: large avatar, up to 3 main event badges, display name + @handle, bio, meta rows (joined date, location, sponsor), 3-column stats (Followers / Following / Practice Time), Follow/Edit button, social link icons. Sticky on desktop (`sticky top-24`), hidden on mobile (`hidden lg:block`).

---

### T61: Profile Tabs Component

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 new file (~80 lines) |
| **Priority** | HIGH |

Create `src/components/profile/profile-tabs.tsx` — tab bar + swipe detection. Reads `?tab=` from URL, defaults to `"overview"`. 5 tab buttons with active indicator. Mobile swipe via touch events (60px threshold). Updates URL with `router.replace`.

---

### T62: Tab Content Components (5 tabs)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T58, T59, T60, T61 |
| **Estimated scope** | 5 new files (~400 lines total) |
| **Priority** | HIGH |

Create the 5 tab content wrappers:
- `tab-overview.tsx` (~90 lines) — Mobile: full ProfileHeader. Both: stat cards, badges, activity, YTD stats
- `tab-pbs.tsx` (~120 lines) — Owner: existing `PBsContent`. Visitors: read-only PB grid. Both: PBProgressChart
- `tab-stats.tsx` (~70 lines) — Stats cards, streak, heatmap, pie/bar charts, session log (readOnly for visitors)
- `tab-cubes.tsx` (~20 lines) — Thin wrapper around existing `MainCubes`
- `tab-official.tsx` (~110 lines) — WCA results (lazy-loaded), allrounding, accomplishments, upcoming competitions

---

### T63: Rewrite Profile Content Components

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T60, T61, T62 |
| **Estimated scope** | 4 files (2 rewrites + 2 page updates) |
| **Priority** | HIGH |

Rewrite `public-profile-content.tsx` and `profile-content.tsx` to use the new grid + tabs layout. Update both page server components (`profile/[handle]/page.tsx` and `profile/page.tsx`) to fetch PB data and widen container to `max-w-6xl`.

---

### Phase 11 Dependency Graph

```
Phase 11 — Profile Rework:
T57 (main_events schema)    — no deps
T58 (getPBsByUserId)         — no deps
T59 (SessionLog readOnly)   — no deps
T61 (ProfileTabs)            — no deps

T60 (ProfileSidebar)         — T57 (needs main_events)
T62 (Tab Components)         — T58, T59, T60, T61
T63 (Rewrite Content)        — T60, T61, T62
```

**Recommended order:** T57 + T58 + T59 + T61 in parallel (4 independent tasks) → T60 → T62 → T63

---

## Phase 12 — Performance Optimization Sprint

Full performance audit identified ~50 issues. Stream C (select("*") replacement) deferred until live schema audit. See `.claude/plans/golden-beaming-emerson.md` for full details.

---

### T64: Create RPC for Batch Like Counts

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 migration SQL + 1 server action file |

Created `get_batch_like_counts` RPC. `getSessionLikeInfo()` now uses batch RPC instead of JS counting.

---

### T65: Create RPC for Batch Comment Counts

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1 migration SQL + 1 server action file |

Created `get_batch_comment_counts` RPC. `getCommentCounts()` now uses batch RPC instead of JS counting.

---

### T66: Fix Club Member Counting

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file |

Uses `get_batch_club_member_counts` RPC in `getClubs()` and `getUserClubs()`. No JS counting loops.

---

### T67: Fix Challenge Participant Counting

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file |

Uses `get_batch_challenge_participant_counts` RPC in `getChallenges()`. No JS counting loops.

---

### T68: Add Limit to Feed Follows Query

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file |

Follows query in `getFeed()` has `.limit(1000)` and `.order("created_at", { ascending: false })`.

---

### T69: Add Limits to Other Unbounded Queries

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T65, T66 |
| **Estimated scope** | 3-4 server action files |

Limits added: `getDistinctLocations()` has `.limit(5000)`, `searchProfiles()` has `.limit(20)`, and other queries bounded.

---

### T73: Fix N+1 in Personal Bests Operations

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file |

`updatePB()` uses `Promise.all()` for parallel unmark/mark operations. `deletePB()` queries combined efficiently.

---

### T74: Fix N+1 in Badge Claims and Club Mutations

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 server action files |

`claimCompetitionBadge()` uses `Promise.all()` for parallel verification. `leaveClub()` uses `Promise.all()` for role + owner count.

---

### T75: Parallelize Leaderboards WCA Query

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 page file |

WCA ID profile query runs inside the initial `Promise.all()` on the leaderboards page, chained off the auth promise.

---

### T76: Split import-pbs-modal.tsx (789 lines)

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file split into 3-4 files |

Split into modal shell (310 lines), `import-manual-section.tsx`, and `import-csv-section.tsx`.

---

### T77: Timer Memoization + Split

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file + 1 new file |

React Compiler (`reactCompiler: true`) auto-memoizes computations. Timer controls extracted to `timer-sidebar.tsx` and `timer-top-bar.tsx`. Main file at 368 lines (within limits).

---

### T78: Add React.memo/useMemo to Feed & Leaderboards

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 4 component files |

React Compiler (`reactCompiler: true`) auto-memoizes all computations and callbacks. No manual React.memo/useMemo/useCallback needed.

---

### T79: Fix Session Log Dual DOM Rendering

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 component file |

Session log uses `useSyncExternalStore` for conditional rendering — only one layout (mobile cards OR desktop table) is rendered at a time.

---

### T80: Add Revalidation to Homepage

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 page file |

Homepage (`src/app/page.tsx`) has `export const revalidate = 300` — 5-minute ISR cache for global stats.

---

### T81: Fix Count Query Pattern

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 3-4 server action files |

Count queries use `.select("id", { count: "exact", head: true })` pattern across server actions.

---

### T82: Add Next.js Image Optimization Config

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 config file |

`next.config.ts` has `images.remotePatterns` configured for `*.supabase.co` storage domain.

---

### Phase 12 Dependency Graph

```
Phase 12 — Performance Optimization Sprint

Wave 1 (all parallel, no deps):
T64 (Like counts RPC)         — no deps
T65 (Comment counts RPC)      — no deps
T66 (Club member counting)    — no deps
T67 (Challenge counting)      — no deps
T68 (Feed follows limit)      — no deps

After Wave 1:
T69 (Other limits)            — T65, T66

Wave 2 (all parallel, no deps):
T73 (PB N+1)                  — no deps
T74 (Badge/Club N+1)          — no deps
T75 (Leaderboards parallel)   — no deps
T80 (Homepage cache)          — no deps
T81 (Count pattern)           — no deps
T82 (Image config)            — no deps

Wave 3 (all parallel, no deps):
T76 (Split import-pbs-modal)  — no deps
T77 (Timer memoization)       — no deps
T78 (Feed/LB memoization)     — no deps
T79 (Session log dual DOM)    — no deps
```

---

## Phase 13 — QoL Improvements Sprint

### T83: Clean Up Streak Display + Remove Pill Badges

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

Clean inline display with flame icon + number + "day streak" · trophy icon + number + "longest". No milestone pill badges.

---

### T84: Remove Search Notes from Practice Stats

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Removed search notes input and filtering logic from filters and dashboard content.

---

### T85: Make Stats Cards Dynamic Based on Filters

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Stats cards now reflect filtered sessions. `filteredStats` computed client-side from `filteredSessions`.

---

### T86: Add Solve Counts to Graph Tooltips

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 3 files |

All three chart tooltips now show solve counts alongside duration.

---

### T87: Session Log Pagination (20 per page)

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

Session log paginates at 20 per page with Previous/Next controls. Toggle all only affects current page.

---

### T88: Profile Overview — Remove Stat Cards, Add Heatmap, Remove YiR

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

Overview tab: ProfileHeader (mobile) → PracticeStreak → BadgesSection → RecentActivity. Removed ProfileStats and YtdStats.

---

### T89: Stats Tab — Remove Duplicate Tracker + Add Filters

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T83 |
| **Estimated scope** | 1 file |

Stats tab: PracticeStreak (unfiltered) → DashboardFilters → filtered charts + session log. Removed duplicate PracticeHeatmap and ProfileStats.

---

### T90: Tab Renames + PB History

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Tabs renamed: "Main Puzzles", "Official Results". Chart renamed: "PB History".

---

### T91: Replace Location with Country Dropdown + US State

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 4 files |

Searchable country combobox using `getWcaCountries()`. US state dropdown appears when US selected.

---

### T92: Remove Sponsor Field

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 3 files |

Removed sponsor input from edit modal and sponsor display from sidebar/header.

---

### T93: Add Social Links to Edit Profile Modal

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

Social links section with platform dropdown + URL input + delete + "Add Link" button. Saves via `updateProfileLinks()`.

---

### T94: PB Settings — 3-Event Limit + Order All Events

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

3-event limit for main events with counter, reorderable other events, full order saved as concatenated array.

---

### T95: Fix Navbar Avatar Not Updating After Profile Change

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Navbar listens for "profile-updated" custom event, re-fetches avatar/name. Edit modal dispatches event after save.

---

### Phase 13 Dependency Graph

```
Phase 13 — QoL Improvements Sprint

Wave 1 (all parallel, no deps):
T83 (Streak display cleanup)     — no deps
T84 (Remove search notes)        — no deps
T85 (Dynamic stats cards)        — no deps
T86 (Solve counts in tooltips)   — no deps
T87 (Session log pagination)     — no deps
T88 (Overview tab cleanup)       — no deps
T90 (Tab renames)                — no deps
T91 (Country dropdown)           — no deps
T92 (Remove sponsor)             — no deps
T93 (Social links in modal)      — no deps
T94 (PB settings improvements)   — no deps
T95 (Navbar avatar fix)          — no deps

Wave 2 (after T83):
T89 (Stats tab filters + dedup)  — T83 (needs clean streak component)
```

---

## Phase 14 — Timer Session Management

### T96: Database Migration — Create `solve_sessions` Table

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | None |
| **Estimated scope** | 1 SQL migration file |

Create `supabase/migrations/023_create_solve_sessions.sql`:
- New `solve_sessions` table (id, user_id, name, event, is_tracked, is_archived, active_from, sort_order, created_at, updated_at)
- Add `solve_session_id` FK to `solves`, `timer_sessions`, and `sessions` tables
- Add indexes for efficient queries
- RLS policies: users can only CRUD their own rows
- Backfill: create one `solve_sessions` row per unique (user_id, event) from existing solves, then UPDATE solves/timer_sessions/sessions to set the FK

**Files:** `supabase/migrations/023_create_solve_sessions.sql`

---

### T97: Types & Validation Schemas

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T96 |
| **Estimated scope** | 2 files |

- Add `SolveSession` type to `src/lib/types.ts`
- Add Zod schemas for create/update solve_session to `src/lib/validations.ts`
- Update `Solve`, `TimerSession`, and `Session` types to include optional `solve_session_id`

**Files:** `src/lib/types.ts`, `src/lib/validations.ts`

---

### T98: Server Actions — Solve Session CRUD

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T97 |
| **Estimated scope** | 1 new file |

Create `src/lib/actions/solve-sessions.ts` with:
- `getUserSolveSessions()` — fetch all non-archived sessions for current user
- `getSolveSession(id)` — fetch single session with solve count
- `createSolveSession(name, event, isTracked?)` — create a new named session
- `updateSolveSession(id, data)` — rename, change tracked status
- `resetSolveSession(id)` — set `active_from` to now (finalize active timer_session first)
- `archiveSolveSession(id)` — set `is_archived = true`
- `deleteSolveSession(id)` — hard delete (solves get NULL FK, preserved)
- `getOrCreateDefaultSession(event)` — find existing or create "Session 1" for an event

**Files:** `src/lib/actions/solve-sessions.ts`

---

### T99: Update Timer Server Actions

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T98 |
| **Estimated scope** | 1 file |

Update `src/lib/actions/timer.ts`:
- `createTimerSession()` — accept `solve_session_id` param, store it on the row
- `addSolve()` — accept `solve_session_id` param, store it on the solve row
- `getActiveTimerSession()` — change to look up by `solve_session_id` instead of event
- `getSolvesBySession(solveSessionId, activeFrom)` — new action to fetch solves for a named session (only those after `active_from`)
- `finalizeTimerSession()` — pass `solve_session_id` to the `sessions` row; skip creating `sessions` row if session's `is_tracked = false`

**Files:** `src/lib/actions/timer.ts`

---

### T100: Session Selector Component

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T98 |
| **Estimated scope** | 1 new file |

Build `src/components/timer/session-selector.tsx`:
- Dropdown showing user's sessions (name + event icon + solve count)
- Grouped by event
- "New Session" button at bottom
- Quick-create inline (name + event picker + tracked toggle)
- "Manage Sessions" link to open the full manager
- Selected session highlighted

**Files:** `src/components/timer/session-selector.tsx`

---

### T101: Session Manager Modal

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T100 |
| **Estimated scope** | 1 new file |

Build `src/components/timer/session-manager.tsx`:
- Full-screen modal/sheet for managing all sessions
- List view: session name, event, solve count, created date, tracked/untracked badge
- Actions per session: rename, reset (with confirmation), archive, delete (with confirmation)
- Create new session form
- Toggle tracked/untracked
- Mobile-responsive

**Files:** `src/components/timer/session-manager.tsx`

---

### T102: Timer Integration — Wire Up Named Sessions

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T99, T100, T101 |
| **Estimated scope** | 4 files |

Rewire `timer-content.tsx` to use solve_sessions:
- Replace `event` state with `currentSession` (SolveSession) state
- On mount: load user's sessions, select last-used or default
- Load solves by `solve_session_id` + `active_from` filter (not by event)
- When switching session: finalize active timer_session, load new session's solves
- When creating first solve: ensure timer_session exists with `solve_session_id`
- Pass session info to sidebar for display

Update `timer-top-bar.tsx`:
- Replace `EventSelector` with `SessionSelector`
- Rename "End Session" → "End Practice"

Update `session-summary-modal.tsx`:
- Change copy to indicate session persists ("Practice saved!")

Update `timer-settings.tsx`:
- Remove event selector (now handled by session selector)
- Keep mode, inspection, sidebar position settings

**Files:** `src/components/timer/timer-content.tsx`, `src/components/timer/timer-top-bar.tsx`, `src/components/timer/session-summary-modal.tsx`, `src/components/timer/timer-settings.tsx`

---

### T103: First-Time Defaults & Auto-Create

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T102 |
| **Estimated scope** | 2 files |

Handle edge cases for new/returning users:
- First timer visit: auto-create "Session 1" for 3x3
- Store last-used session ID in localStorage so it's restored on next visit
- If user has existing solves but no solve_sessions (migration didn't run yet): gracefully fall back

**Files:** `src/components/timer/timer-content.tsx`, `src/lib/actions/solve-sessions.ts`

---

### T104: Reset & Throwaway Behavior

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T102 |
| **Estimated scope** | 2 files |

- Reset: finalize any active timer_session, update `active_from`, reload solves (empty list)
- Throwaway: during finalization, check `is_tracked` — if false, skip `sessions` row creation
- Verify throwaway solves don't appear in: feed queries, streak calculations, leaderboard RPCs
- Add confirmation dialog for reset ("This will clear your solve list. Your all-time stats are not affected.")

**Files:** `src/lib/actions/timer.ts`, `src/components/timer/session-manager.tsx`

---

### T105: Update CLAUDE.md & PRD

| | |
|---|---|
| **Status** | ✅ Done |
| **Dependencies** | T104 |
| **Estimated scope** | 2 files |

- Update CLAUDE.md key files section with new files
- Update CLAUDE.md architecture section to describe solve_sessions
- Update PRD to mark session management as built
- Verify `npm run build` passes

**Files:** `.claude/CLAUDE.md`, `.claude/SPEED_CUBE_HUB_PRD.md`

---

### Phase 14 Dependency Graph

```
Phase 14 — Timer Session Management

Wave 1 (no deps):
T96 (DB migration)               — no deps

Wave 2 (after T96):
T97 (Types & validation)         — T96

Wave 3 (after T97):
T98 (Solve session CRUD actions) — T97

Wave 4 (after T98, parallel):
T99 (Update timer actions)       — T98
T100 (Session selector UI)       — T98

Wave 5 (after T100):
T101 (Session manager modal)     — T100

Wave 6 (after T99, T100, T101):
T102 (Timer integration)         — T99, T100, T101

Wave 7 (after T102, parallel):
T103 (First-time defaults)       — T102
T104 (Reset & throwaway)         — T102

Wave 8 (after T104):
T105 (Docs update)               — T104
```

---

## Phase 15 — Timer Core UX (csTimer Parity Baseline)

Goal: Make Speed Cube Hub's timer feel like csTimer to experienced cubers. The time list + stats panel should match csTimer's familiar layout. Every modal/popup should have dramatically better UI (CubeDesk-inspired).

### T106: Redesign Stats Panel to Match csTimer Layout

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 2-3 files |
| **Key files** | `src/components/timer/stats-panel.tsx`, `src/lib/timer/averages.ts` |

Rebuilt stats panel from card grid to csTimer-style compact table. Columns: label | current | best | σ (std dev per window). Added `computeAoNStdDev()` and `computeTargetTime()` to averages.ts. Session header shows solve count + μ (mean) + σ (session std dev). BPA/WPA shown for incomplete Ao5 windows. Rows are clickable (for future T108 stat detail modal).

---

### T107: Customizable Statistical Indicators

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-C |
| **Dependencies** | T106 |
| **Estimated scope** | 3-4 files |
| **Key files** | `src/lib/timer/averages.ts`, `src/components/timer/stats-panel.tsx`, `src/components/timer/timer-settings.tsx` |

Built customizable stat indicators. Users type any combination of `aoX` or `moX` (e.g., `mo3 ao5 ao12 ao50 ao100 ao500`) in a text field in Settings. Stats panel dynamically renders rows for each indicator with current/best/σ columns. Single row always shown at top. BPA/WPA auto-adapts to the smallest ao indicator. Persisted to localStorage under `sch_stat_indicators`. Default: `mo3 ao5 ao12 ao50 ao100`. **Note:** Configurable trim percentage deferred — currently uses standard WCA 5% trim (drop best + worst).

---

### T108: Statistics Detail Popup (Click Any Average)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-B |
| **Dependencies** | T106 |
| **Estimated scope** | 1-2 new files |
| **Key files** | New: `src/components/timer/stat-detail-modal.tsx` |

Click any stat → beautiful modal showing:
- All solves in that average window
- Trimmed solves marked with parentheses: `(7.12)`
- Each solve clickable → opens solve detail
- Copy button (csTimer text format)
- Standard deviation
- For "Best" stats: shows best window ever in session

---

### T109: Solve Detail Modal (Better Than csTimer)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1-2 new files |
| **Key files** | `src/components/timer/solve-detail-modal.tsx` |

Built polished modal card at `src/components/timer/solve-detail-modal.tsx`. Large time display (mono font), scramble text (copyable), date/time, editable notes field, penalty toggles (OK/+2/DNF), delete button, Escape to close. Wired through timer-sidebar → solve-list → timer-content. Modal renders at top level in timer-content.tsx.

---

### T110: Redesign Time List to Match csTimer Feel

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T109 ✅ |
| **Estimated scope** | 1-2 files |
| **Key files** | `src/components/timer/solve-list.tsx` |

Redesigned solve list to compact clickable rows (36px min height). Click opens solve detail modal (T109). PB solves highlighted green, DNF with strikethrough + red, +2 yellow. Notes icon shown for solves with notes. Comp Sim mode preserved with Ao5 group headers. Removed old expandable row + inline penalty controls.

---

### T111: Keyboard Shortcuts

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1-2 files |
| **Key files** | `src/components/timer/timer-content.tsx` |

Implemented keyboard shortcuts in timer-content.tsx: Ctrl+1 = OK, Ctrl+2 = +2, Ctrl+3 = DNF (last solve), Ctrl+Z = Undo last solve, Escape = close modals. Shortcuts disabled when input/textarea focused or when modals are open.

---

### T112: Undo Last Solve

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T111 ✅ |
| **Estimated scope** | 2 files |

Ctrl+Z instantly removes most recent solve. Fixed bottom toast with "Undo" button that restores the solve within 5 seconds. Toast auto-dismisses after 5s. Re-adds the solve to the DB via `addSolve()`. Works in Normal and Comp Sim modes.

---

### T113: Solve Notes/Comments UI

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T109 ✅ |
| **Estimated scope** | 2 files |

Editable notes field in solve detail modal with pencil icon toggle, inline textarea, save/cancel buttons. Saves to `notes` column via `updateSolve()`. StickyNote icon shown on time list rows that have notes. Notes synced optimistically via `handleNotesChange` in timer-content.

---

### T114: 2D Scramble Image Visualization

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 2-3 new files |
| **Key files** | `src/components/timer/scramble-image.tsx`, `src/components/timer/scramble-display.tsx` |

Built 2D scramble image using `cstimer_module.getImage()` which returns SVG strings for all events (3x3, 2x2, 4x4-7x7, Pyra, Mega, Skewb, SQ1, Clock). Toggle button (Image icon) in scramble display area. Image renders inline below scramble text. Same csTimer rendering engine used for scramble generation.

---

### T115: Cross Solver Tool

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-C |
| **Dependencies** | None |
| **Estimated scope** | 2-3 files |
| **Key files** | `src/lib/timer/cross-solver.ts`, `src/components/timer/cross-solver-panel.tsx`, `src/components/timer/scramble-display.tsx` |

- ✅ Optimal cross solutions for all 6 faces (BFS pruning tables)
- Toggleable panel via "+" button (3x3 only)
- Color-coded dots, move counts, copy buttons, best solutions highlighted
- Note: XCross deferred — requires full F2L state tracking beyond cross solver scope

---

## Phase 16 — Training Scrambles

### T116: 3x3 CFOP Training Scrambles (Core Set)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 3-4 files |
| **Key files** | `src/lib/timer/scrambles.ts`, `src/lib/timer/training-scrambles.ts`, `src/components/timer/scramble-type-selector.tsx` |

Built training scramble types for 3x3 and 3x3 OH: PLL, OLL, Last Layer, F2L, LSLL, Easy Cross, Easy XCross. Scramble type selector dropdown in timer top bar with category grouping. Training type persisted to localStorage. Case filtering UI deferred to T122.

---

### T117: 3x3 Advanced Training Scrambles

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added ZBLL, COLL, CLL, ELL, 2GLL, ZZLL, ZBLS, EOLS, WVLS, VLS, EOLine to training-scrambles.ts. Grouped under "Advanced" category in selector.

---

### T118: 3x3 Roux + Mehta Training Scrambles

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added Roux (2nd Block, CMLL, LSE, LSE M,U) and Mehta (3QB, EOLE, TDR, 6CP, CDRLL, L5EP, TTLL) to training-scrambles.ts. Each has its own category group in the selector.

---

### T119: 3x3 Move Subset Scrambles

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added 2-gen R,U / L,U / M,U, 3-gen F,R,U / R,U,L / R,r,U, half turns, edges only, corners only to training-scrambles.ts under "Subsets" category.

---

### T120: 2x2 Training Scrambles

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added EG, CLL, EG-1, EG-2, TCLL, TCLL+, TCLL-, LS, No Bar training types for 2x2 event.

---

### T121: 4x4+ Training Scrambles

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added 4x4 (Edges, R,r,U,u, LL, ELL, Edge Only, Center Only, UD Centers, UD+3E, Last 8 Edges, RL Centers), 5x5/6x6/7x7 (Edge Only), Pyraminx (L4E, No Bar), Skewb (No Bar), SQ1 (CSP, PLL), Megaminx (2-gen, LSLL, PLL, LL) training types.

---

### T122: Training Case Filtering UI

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus (parallel session) |
| **Dependencies** | T116 |
| **Estimated scope** | 2-3 new files |
| **Key files** | `src/lib/timer/algorithm-cases.ts`, `src/components/timer/case-filter-panel.tsx` |

- ✅ Case definitions for PLL (21), OLL (57), COLL (42), CLL (42), EG (42), EG-1/EG-2 (42 each), CMLL (42)
- ✅ Checkbox grid with select/deselect all buttons
- ✅ Case-specific scramble generation via cstimer_module's third parameter (case index)
- ✅ Filter button in timer top bar (shown only for filterable training types)
- ✅ Selected case count indicator (e.g., "8/21")
- ✅ Persist case filter per training type in localStorage

---

### T123: Training Case Statistics

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T116, T122 |
| **Estimated scope** | 2-3 files |

Best/mean time per case, attempt count, bar chart, weakest case identification.

---

## Phase 17 — Timer Modes & Advanced Input

### T124: Multi-Phase Timing

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 3-4 files |

2-10 phases (Cross/F2L/OLL/PLL), key press for splits, JSONB column, phase breakdown in detail modal, per-phase stats.

---

### T125: Configurable Timer Hold Duration

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-B |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Options: 0ms, 100ms, 200ms, 300ms (default), 500ms, 1000ms. Persists to localStorage.

---

### T126: Timer Display Customization

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-D |
| **Dependencies** | None |
| **Estimated scope** | 2 files |
| **Key files** | `src/components/timer/timer-display.tsx`, `src/components/timer/timer-settings.tsx`, `src/components/timer/timer-content.tsx`, `src/components/timer/timer-top-bar.tsx` |

- ✅ Timer size selector (Small/Medium/Large) — adjusts font size of time display
- ✅ Small decimals toggle — renders decimal portion in a smaller font
- ✅ Update mode (Real-time/Seconds/Hidden) — replaces binary "Show Time" toggle
- ✅ All settings persist to localStorage
- Note: Font selection and ms toggle deferred to future iteration

---

### T127: Mobile Swipe Gestures

| | |
|---|---|
| **Status** | 🏗️ In Progress |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 2-3 files |

8-direction: up-left=DNF, up=+2, up-right=OK, left=prev, right=next, down-left=comment, down=delete, down-right=inspect.

---

### T128: Manual Scramble Input

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-D |
| **Dependencies** | None |
| **Estimated scope** | 2 files |
| **Key files** | `src/components/timer/scramble-display.tsx`, `src/lib/timer/use-timer-scramble.ts`, `src/components/timer/timer-content.tsx` |

- ✅ Click scramble text or pencil icon to enter edit mode
- ✅ Inline textarea with Enter to apply, Esc to cancel
- ✅ Manual scrambles shown in blue to distinguish from auto-generated
- ✅ X button to clear manual scramble and return to auto
- ✅ Scramble image + cross solver update live from manual input
- ✅ After completing a solve, auto-scramble resumes automatically
- ✅ Keyboard shortcuts suppressed while editing (existing guard for textarea elements)

---

## Phase 18 — Timer Session Data Features

### T129: Session Merge & Split

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T96-T105 |
| **Estimated scope** | 2-3 files |

Merge two sessions, split at point, confirmation dialogs.

---

### T130: Cross-Session Statistics

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T96-T105 |
| **Estimated scope** | 2-3 new files |

Aggregate stats across sessions with date/event/name filters.

---

### T131: Daily Statistics

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 1-2 new files |

Solve count per day/week/month/year, configurable week start, heatmap/bar chart.

---

### T132: Export Timer Data

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-B |
| **Dependencies** | None |
| **Estimated scope** | 2 files |
| **Key files** | `src/lib/timer/export.ts`, `src/components/timer/timer-top-bar.tsx` |

Export button in timer top bar with dropdown: CSV, JSON, csTimer TXT formats + Copy Stats to clipboard. Export utility at `src/lib/timer/export.ts` with `solvesToCSV()`, `solvesToJSON()`, `solvesToCsTimerTxt()`, `statsToClipboard()`, `downloadFile()`. Files named `{sessionName}_{date}.{ext}`.

---

### T133: Import Timer Data

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T96-T105 |
| **Estimated scope** | 2-3 files |
| **Key files** | `src/app/(main)/import/page.tsx`, `src/components/import/import-content.tsx`, `src/components/import/import-drop-zone.tsx`, `src/components/import/import-preview.tsx`, `src/lib/import/types.ts`, `src/lib/import/detect-format.ts`, `src/lib/import/parsers.ts`, `src/lib/import/normalize.ts`, `src/app/api/import/parse/route.ts` |

- ✅ File drag-and-drop + paste textarea input
- ✅ Auto-detection of csTimer, CubeTime, Twisty Timer, generic CSV formats
- ✅ AI-powered parsing fallback (Claude Haiku via Anthropic API) for unknown formats
- ✅ Event selection step for formats that don't specify the event
- ✅ Session preview with summaries before import
- ✅ PB detection and import
- ✅ Bulk session import via `createSessionsBulk`
- ✅ `bulkImportSolves` server action for individual solve import
- ✅ Import link in navbar profile dropdown
- ✅ Route: `/import`

---

## Phase 19 — Advanced Tools

### T134: Batch Scramble Generator

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-D |
| **Dependencies** | None |
| **Estimated scope** | 1-2 new files |
| **Key files** | `src/components/tools/batch-scramble-generator.tsx`, `src/app/(main)/tools/scrambles/page.tsx` |

- ✅ Event selector (all WCA events except FMC and Multi-BLD)
- ✅ Count input (1-999) with quick-select buttons (5, 12, 25, 50, 100, 200, 500)
- ✅ Batched generation (50 at a time) to avoid UI blocking
- ✅ Numbered scramble list with hover-to-copy per row
- ✅ Copy All and Download as .txt file
- ✅ Route: `/tools/scrambles`

---

### T135: Metronome Tool

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-D |
| **Dependencies** | None |
| **Estimated scope** | 1-2 new files |
| **Key files** | `src/components/tools/metronome.tsx`, `src/app/(main)/tools/metronome/page.tsx` |

- ✅ BPM mode with adjustable tempo (20-300), slider, +/- buttons, quick presets
- ✅ Seconds mode — beep at configurable intervals (0.5s to 30s)
- ✅ Beats per measure selector (2, 3, 4, 6, 8)
- ✅ Visual beat indicators with accent on first beat
- ✅ Web Audio API for precise timing (lookahead scheduling)
- ✅ Route: `/tools/metronome`

---

### T136: Shared Scramble Seed

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

Seed → deterministic scrambles. Same seed = same scrambles for racing.

---

### T137: Additional Solvers

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T115 |
| **Estimated scope** | 3-4 files |

EOLine, Roux S1, 2x2 face, Pyraminx V, Skewb face solvers.

---

### T138: BLD Helper Tool

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2-3 new files |

Letter pair encoding, parity detection, buffer config, memo/exec practice modes.

---

## Phase 20 — Non-WCA Puzzles & Relays

### T139: Big Cubes (8x8-11x11 + Custom NxN)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

8x8-11x11 + custom NxN, random-move scrambles.

---

### T140: Non-WCA Puzzle Scrambles (Popular Subset)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 3-4 files |

Mirror Blocks, Gear Cube, Ivy, Redi, Kilominx, Master Pyra, FTO, cuboids.

---

### T141: Remaining Non-WCA Puzzles

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T140 |
| **Estimated scope** | 2-3 files |

Dino, Helicopter, Curvy Copter, Gigaminx, Pyraminx Crystal, Siamese, Square-2, Super SQ1, Super Floppy, UFO, Cmetrick, Crazy 3x3, bandaged, Icosamate, 8/15 puzzles.

---

### T142: Relay Scrambles

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2-3 files |

Multi-3x3, 234/2345/23456/234567, Mini Guildford. Sequential display, single time.

---

### T143: Other Event Training Variants

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | T116 |
| **Estimated scope** | 1 file |

Added training variants for Pyraminx (L4E, No Bar), Skewb (No Bar), Square-1 (CSP, PLL), Megaminx (2-gen, LSLL, PLL, LL) to training-scrambles.ts. Clock training deferred (no cstimer_module support).

---

## Phase 21 — Hardware Integration

### T144: Virtual Cube (3D Interactive)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 3-4 new files |

3D cube (cubing.js/Three.js), keyboard + mouse, adjustable speed, auto multi-phase, TPS + reconstruction.

---

### T145: Bluetooth Smart Cube Support

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 4-5 new files |

Web Bluetooth for GAN/GoCube/Giiker/Moyu. Real-time state, battery, reconstruction, CFOP segmentation.

---

### T146: Stackmat Timer Support

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2-3 files |

Microphone/audio input, signal decode, Gen 3/4/5 support.

---

## Phase 22 — Online & Social Timer Features

### T147: Online Battle Mode

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T136 |
| **Estimated scope** | 4-5 files |

Battle rooms, Supabase Realtime, shared scrambles, win/loss, spectator mode.

---

### T148: Scramble Animation

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T114 |
| **Estimated scope** | 1-2 files |

Click scramble image → animated sequence, step-through moves.

---

## Phase 23 — Timer Polish & Display Options

### T149: Hide All Elements During Timing

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1-2 files |
| **Key files** | `src/components/timer/timer-display.tsx`, `src/components/timer/timer-settings.tsx`, `src/components/timer/timer-content.tsx` |

- ✅ "Focus Mode" toggle in timer settings
- ✅ Hides top bar, scramble display, and stats sidebar while timer runs
- ✅ Timer display fills full screen in focus mode
- ✅ Everything restores when timer stops
- ✅ Setting persists to localStorage (`sch_hide_while_timing`)

---

### T150: Scramble Display Options

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus |
| **Dependencies** | None |
| **Estimated scope** | 1-2 files |
| **Key files** | `src/components/timer/scramble-display.tsx` |

Adjustable text size, mono font toggle, height limit, compact mode. Settings gear icon opens dropdown with Size (Auto/S/M/L), Font (Mono/Sans), and Compact mode toggle. All settings persisted to localStorage.

---

### T151: Multiple Solve Deletion

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Opus-B |
| **Dependencies** | None |
| **Estimated scope** | 2 files |
| **Key files** | `src/components/timer/solve-list.tsx`, `src/lib/actions/timer.ts` |

Batch select mode in solve list. "Select" button appears above solves when 2+ solves exist. Tap to toggle checkboxes, "All" to select all, "Delete" to batch delete with confirmation dialog. Added `deleteSolves()` server action using Supabase `.in()` for single-query batch delete. Works in both Normal and Comp Sim modes.

---

### T152: Auto-Backup / Auto-Export

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T132 |
| **Estimated scope** | 1-2 files |

Auto-export every N solves, configurable, keep last 10 backups.

---

### Timer Parity Dependency Graph

```
Phase 15 — Core UX (start here):

Wave 1 (all parallel, no deps):
T106 (Stats panel redesign)       — no deps
T109 (Solve detail modal)         — no deps
T111 (Keyboard shortcuts)         — no deps
T114 (2D scramble image)          — no deps
T115 (Cross solver)               — no deps

Wave 2 (after wave 1):
T107 (Custom stat indicators)     — T106
T108 (Stat detail popup)          — T106
T110 (Time list redesign)         — T109
T112 (Undo last solve)            — T111
T113 (Solve notes UI)             — T109

Phase 16: T116 (CFOP core) — no deps; T117-T123 — T116
Phase 17: All no deps, fully parallel
Phase 18: T129/T130/T133 need Phase 14 (T96-T105)
Phases 19-23: See individual task deps
```
