# CLAUDE.md — Speed Cube Hub

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Follow every rule in `.claude/Rules/` on every interaction, without exception. Rules are split into separate files and automatically loaded by Claude Code.

## Development Commands

All commands must be run from the project root (`speed-cube-hub/`).

```bash
npm run dev      # Start dev server (Next.js with Turbopack)
npm run build    # Production build — run before pushing to verify no errors
npm run lint     # ESLint
```

There are no tests configured in this project yet.

## Git & Deployment

- **Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
- **Repo:** `Brandonius813/speed-cube-hub` (private)
- **Production URL:** `https://www.speedcubehub.com`
- **`dev` branch:** All new work goes here. Push triggers Vercel preview deployment.
- **`main` branch:** Production. Push auto-deploys to speedcubehub.com.
- **Workflow:** Commit after every working feature. Push to `dev` only when asked, or in batches when a session ends (each push triggers a Vercel build that costs build minutes). When user says "go live," merge `dev` into `main` and push.

## Architecture Overview

### Public-First Pattern

Every page is publicly viewable. Admin controls are conditionally rendered using `{isAdmin && ...}`.

### Route Groups & Shared Layout

- **`(main)` route group** — All pages that share Navbar + Footer live under `src/app/(main)/`. The shared layout (`src/app/(main)/layout.tsx`) renders Navbar and Footer once, so they persist across navigations without re-mounting.
- **`loading.tsx`** — `src/app/(main)/loading.tsx` provides an instant skeleton screen during page transitions (shown while server data loads).
- **Login/Signup** — Live outside the route group (`src/app/login/`, `src/app/signup/`) and have their own centered card layout without Navbar/Footer.

### Server Components + Client Components

Each page uses a two-file pattern:

1. **`page.tsx`** (server component) — Fetches data on the server via `Promise.all`, passes results as props. No `force-dynamic` — Next.js auto-detects dynamic pages based on cookie/auth usage.
2. **`*-content.tsx`** (client component) — Receives initial data as props (no loading spinner), handles interactivity (filters, modals, admin controls). Auth check runs in a `useEffect` to determine `isAdmin` for showing edit/delete buttons.

### Timer Data Hierarchy

The timer uses a three-level data model:
- **`solve_sessions`** — Persistent, named, event-locked containers (like csTimer sessions). Each has `active_from` (reset point) and `is_tracked` (throwaway toggle).
- **`timer_sessions`** — Individual practice sittings within a solve session. Created lazily on first solve, finalized on "End Practice."
- **`sessions`** — Practice log entries for feed/stats/streaks. Created by `finalizeTimerSession` only for tracked solve sessions.

Last-used session ID is persisted in localStorage (`sch_last_solve_session_id`). New users get "Session 1" for 3x3 auto-created on first visit.

### Server Actions vs Client-Side Supabase

- **Server actions** (`src/lib/actions/*.ts`): Use `"use server"` directive. Called from server components (initial data fetch) and client components (mutations, filtered queries).
- **Client components**: Use `getSupabaseClient()` from `src/lib/supabase/client.ts` (singleton) for auth checks only.
- **Admin server client**: `createAdminClient()` from `src/lib/supabase/admin.ts` for service-role operations that bypass RLS. Never use in client-side code.

### Key Files

- `src/app/(main)/layout.tsx` — Shared layout with Navbar + Footer (persists across navigations)
- `src/app/(main)/loading.tsx` — Skeleton loading screen during page transitions
- `src/lib/utils.ts` — `cn()` (Tailwind class merge utility from Shadcn)
- `src/lib/supabase/client.ts` — Browser-side Supabase singleton
- `src/lib/supabase/server.ts` — Server-side Supabase client (uses cookies)
- `src/lib/supabase/admin.ts` — Service-role client (bypasses RLS)
- `src/lib/actions/` — Server actions directory
- `src/lib/actions/auth.ts` — Auth actions (login, signup, checkIsAdmin)
- `src/lib/actions/sessions.ts` — Session CRUD (getSessionsByUserId, createSession, createSessionsBulk, updateSession, deleteSession, getSessionStats)
- `src/lib/actions/profiles.ts` — Profile CRUD (getProfile, getProfileByHandle, searchProfiles, updateProfile, uploadAvatar, updateProfileLinks)
- `src/lib/actions/stats.ts` — Global stats (getGlobalStats for landing page)
- `src/lib/actions/wca.ts` — WCA API integration (fetch results, unlink WCA ID)
- `src/lib/actions/follows.ts` — Follow/unfollow system (followUser, unfollowUser, getFollowCounts, isFollowing, getFollowers, getFollowing)
- `src/lib/actions/feed.ts` — Activity feed (getFeed with cursor-based pagination, enriched with like/comment counts)
- `src/lib/actions/likes.ts` — Like/unlike system (likeSession, unlikeSession, getSessionLikeInfo)
- `src/lib/actions/comments.ts` — Comments system (addComment, getComments, deleteComment, getCommentCounts)
- `src/lib/actions/goals.ts` — Goals system (createGoal, getGoals, updateGoal, deleteGoal, checkGoalProgress)
- `src/lib/actions/notifications.ts` — Notifications system (getNotifications, markAsRead, markAllAsRead, getUnreadCount)
- `src/lib/actions/badges.ts` — Badges system (getBadgeDefinitions, getUserBadges, claimCompetitionBadge, claimSponsorBadge, removeBadge, approveBadge, rejectBadge, getPendingBadgeClaims)
- `src/lib/helpers/create-notification.ts` — Internal helper: createNotification (NOT a server action, not callable from browser)
- `src/lib/helpers/check-milestones.ts` — Internal helper: checkAndAwardMilestones (NOT a server action, not callable from browser)
- `src/app/(main)/admin/page.tsx` — Admin dashboard hub (no navbar link — access via /admin URL only)
- `src/components/admin/` — Admin components (badge-queue-content)
- `src/app/api/auth/callback/route.ts` — Supabase OAuth callback (Google sign-in + auto profile creation)
- `src/app/api/auth/wca/callback/route.ts` — WCA OAuth callback (verifies WCA ID ownership)
- `src/components/ui/` — Shadcn/ui components
- `src/components/shared/` — Shared app components (navbar, etc.)
- `src/components/profile/` — Profile page components (5-tab layout with sidebar)
- `src/components/profile/profile-tabs.tsx` — Tab bar with swipe detection + URL sync (?tab= param)
- `src/components/profile/profile-sidebar.tsx` — Skool-style sticky sidebar (desktop only, hidden lg:block)
- `src/components/profile/tab-overview.tsx` — Overview tab (header on mobile, stats, badges, YTD, activity)
- `src/components/profile/tab-pbs.tsx` — PBs tab (owner: full CRUD, visitor: read-only grid + progress chart)
- `src/components/profile/tab-stats.tsx` — Stats tab (heatmap, charts, session log with readOnly for visitors)
- `src/components/profile/tab-cubes.tsx` — Cubes tab (wrapper around MainCubes)
- `src/components/profile/tab-official.tsx` — Official tab (WCA results, allrounding, accomplishments)
- `src/components/feed/` — Activity feed components (feed-content, feed-item, like-button, share-button, following-sidebar)
- `src/lib/timer/scrambles.ts` — Client-side scramble generation using cstimer_module (random-state for 3x3, 2x2, pyraminx, skewb, clock, sq1; random-move for big cubes + megaminx)
- `src/app/api/og/route.tsx` — OG image generation API (share cards for sessions/PBs, uses @vercel/og)
- `src/lib/actions/leaderboards.ts` — Leaderboards system (getLeaderboard with category/event/friends-only filtering)
- `src/components/discover/` — Discover/search cubers components
- `src/components/leaderboards/` — Leaderboard components (leaderboards-content)
- `src/lib/actions/wrapped.ts` — Year in Review stats (getWrappedStats)
- `src/components/wrapped/` — Year in Review (Wrapped) components (wrapped-content)
- `src/lib/actions/challenges.ts` — Challenges system (getChallenges, joinChallenge, leaveChallenge, getChallengeProgress, createChallenge)
- `src/components/challenges/` — Challenge components (challenges-content, challenge-card, create-challenge-modal)
- `src/components/notifications/` — Notifications components (notifications-content with mark-as-read, unread badge in navbar)
- `src/lib/actions/clubs.ts` — Clubs queries (getClubs, getClub, getClubMembers, getClubFeed, getUserClubs)
- `src/lib/actions/club-mutations.ts` — Clubs mutations (createClub, joinClub, leaveClub, updateClub, deleteClub)
- `src/components/clubs/` — Club components (clubs-content, club-detail-content, create-club-modal, edit-club-modal)
- `src/lib/actions/personal-bests.ts` — Personal Bests system (getCurrentPBs, logNewPB, updatePB, getPBHistory, deletePB)
- `src/components/pbs/` — PBs page components (pbs-content, log-pb-modal, edit-pb-modal, pb-history-modal)
- `src/lib/actions/sor-kinch.ts` — SOR/Kinch server actions (getSorKinchLeaderboard, findUserInSorKinch, getUserSorKinchStats, getWcaCountries, getWcaContinents)
- `src/components/leaderboards/leaderboard-shared.tsx` — Shared leaderboard presentational components (tables, cards, rank display)
- `src/components/leaderboards/leaderboard-controls.tsx` — Leaderboard filter controls (category tabs, region filter, single/average toggle, Find Me)
- `src/components/leaderboards/region-filter.tsx` — Reusable region filter dropdown (world/continent/country)
- `src/lib/actions/feedback.ts` — Feedback submission (submitFeedback — saves to feedback table, requires auth)
- `src/components/shared/feedback-modal.tsx` — Feedback modal (category picker + message, shown in footer)
- `src/components/shared/notification-popup.tsx` — Notification popup dropdown (replaces bell link in navbar, shows recent notifications)
- `src/components/shared/time-distribution-chart.tsx` — Solve time distribution histogram (adaptive buckets, frequency/cumulative toggle)
- `src/components/shared/time-trend-chart.tsx` — Solve time trend chart (individual times as bars, Ao5/Ao200 rolling average lines)
- `src/components/dashboard/solve-analytics.tsx` — Solve analytics wrapper for practice stats page (event selector + both charts)
- `src/lib/cstimer/parse-cstimer.ts` — csTimer CSV parser (semicolon-delimited, groups solves into per-day sessions)
- `src/lib/cubetime/parse-cubetime.ts` — CubeTime CSV parser (comma-delimited iOS timer app export, groups solves into per-day sessions)
- `src/components/log/` — Log page components (session-form, csv-import, cstimer-import, cubetime-import)
- `src/lib/actions/timer.ts` — Timer CRUD (createTimerSession, addSolve, updateSolve, deleteSolve, finalizeTimerSession, getSolvesByEvent, getSolvesBySession)
- `src/lib/actions/solve-sessions.ts` — Solve session CRUD (getUserSolveSessions, getSolveSession, createSolveSession, updateSolveSession, resetSolveSession, archiveSolveSession, deleteSolveSession, getOrCreateDefaultSession)
- `src/lib/timer/scrambles.ts` — Scramble generation wrapper (cubing.js)
- `src/lib/timer/averages.ts` — Client-side average computation (Ao5, Ao12, Mo100, BPA, WPA)
- `src/lib/timer/inspection.ts` — Inspection countdown hook (15s with voice warnings)
- `src/lib/timer/cross-solver.ts` — Optimal cross solver (BFS pruning tables for all 6 faces, client-side)
- `src/lib/timer/export.ts` — Solve export utilities (CSV, JSON, csTimer TXT, clipboard)
- `src/components/timer/` — Timer UI components (timer-content, timer-display, scramble-display, solve-list, stats-panel, timer-settings, inspection-overlay, session-summary-modal, session-selector, session-manager, cross-solver-panel)
- `src/components/share/pb-celebration.tsx` — PB celebration dialog (shown when timer detects a new personal best)
- `scripts/sync-wca-rankings.mjs` — WCA data sync script (downloads WCA export, computes SOR/Kinch, upserts to wca_rankings table)
- `.github/workflows/sync-wca.yml` — Weekly GitHub Action for WCA data sync

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json). Example: `import { cn } from "@/lib/utils"`.

## Tech Stack

- Next.js 16 (App Router) with Turbopack
- React 19 with React Compiler enabled
- TypeScript (strict mode)
- Tailwind CSS v4
- Supabase (auth + PostgreSQL + Storage) via `@supabase/ssr`
- Shadcn/ui (component library)
- Recharts (charts)
- date-fns (date utilities)
- Zod (schema validation)
- React Hook Form + @hookform/resolvers
- Lucide React (icons)
- Deployed on Vercel

## Data Conventions

- **Database stores times as decimal seconds** (e.g., `10.32`). Display with a `formatTime()` utility.
- **Timer solves store times as integer milliseconds** (e.g., `10320` = 10.32s) in the `solves` table. Convert to decimal seconds when syncing to `sessions.avg_time`.
- **Timezone:** Pacific Time (`America/Los_Angeles`), hardcoded in date helpers.

## Environment Variables

See `.env.local.example` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (ends in `.supabase.co`, NOT `.com`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- `ADMIN_USER_ID` — Admin user ID for server-side data fetches
- `WCA_CLIENT_ID` — WCA OAuth application ID (server-side)
- `WCA_CLIENT_SECRET` — WCA OAuth secret (server-side)
- `NEXT_PUBLIC_WCA_CLIENT_ID` — WCA OAuth application ID (client-side, for redirect URL)

## Design System

- **Theme:** Dark-first. See PRD "Style Guide" section for full color reference.
- **Fonts:** Inter (sans-serif, body/headings) + JetBrains Mono (monospace, numbers/stats/times)
- **Design source:** v0 repo at `Brandonius813/speed-cube-hub-visual-design`
- **Monospace for numbers:** Always use `font-mono` for solve times, stats, and numeric data.

## Routes

```
/                    → Landing page (hero, features, social proof)
/login               → Login page (email + password + Google OAuth)
/signup              → Signup page (first/last/middle name + email + password + Google OAuth)
/practice-stats      → Redirects to /profile?tab=stats [protected]
/profile             → User's own profile (header, stats, cubes, PBs, links, activity) [protected]
/profile/[handle]    → Public profile for any user (viewable by anyone) [public]
/log                 → Log a practice session (form) [protected]
/timer               → Built-in cubing timer [protected]
/tools/scrambles     → Batch scramble generator (1-999 scrambles) [public]
/feed                → Activity feed (sessions from followed users) [protected]
/discover            → Search and browse cubers [public]
/notifications       → Notification inbox (likes, comments, follows, PBs) [protected]
/leaderboards        → Public leaderboards (fastest avg, most solves, streaks, practice time) [public]
/challenges          → Community challenges (join, track progress, admin creates) [protected]
/pbs                 → Redirects to /profile?tab=pbs [protected]
/clubs               → Browse/search/create clubs, join/leave [protected]
/clubs/[id]          → Club detail page (activity feed, member list, edit/delete) [public]
/wrapped             → Year in Review [protected]
/admin               → Admin dashboard hub (links to all admin subpages) [admin only]
/admin/badges        → Admin badge approval queue [admin only]
/privacy             → Privacy Policy [public]
/terms               → Terms of Service [public]
```

Routes will be added as features are built. Keep this section updated.

## PRD Location

The product requirements document is at `.claude/SPEED_CUBE_HUB_PRD.md`. Read it at the start of every session to understand what's been built and what's remaining.

## Task List (Multi-Session)

The shared task list is at `.claude/TASKS.md`. This is a coordinated task board designed for up to 5 Claude sessions working in parallel. Each session should:

1. `git pull origin dev` before starting
2. Claim an available task by updating its status to `🏗️ In Progress`
3. Commit the claim immediately so other sessions see it
4. Build the feature, then mark it `✅ Done` and push

Always check dependencies before claiming a task — don't start work that depends on unfinished tasks.

## Agent Coordination Log

The shared agent log is at `.claude/AGENT_LOG.md`. This is an append-only log where parallel sessions record what they did, what they learned, and any warnings for other sessions.

- **Managed by:** The `/sync` skill — type `/sync` in any session to check in
- **Format:** Timestamped entries, newest at bottom, auto-trimmed to 50 entries
- **When to sync:** At session start, after completing a task, before stopping work

## Feature Status

Features will be tracked in the PRD with checkmarks. Refer to it for current progress.

## Known Security & Performance Issues (Phase 9)

A full audit was completed 2026-02-25. Tasks T41–T51 in `.claude/TASKS.md` track all fixes. Key patterns to be aware of:

### Security
- **No middleware exists** — route protection and session refresh are missing (T42)
- **`createAdminClient()` is overused** — many read queries bypass RLS unnecessarily. Use regular `createClient()` wherever possible (T46)
- **`createNotification` and `checkAndAwardMilestones`** — FIXED (T43): moved to `src/lib/helpers/` as internal helpers, no longer callable from browser
- **No input validation** on session/PB creation — add Zod schemas (T44)
- **Open redirect** in Google OAuth callback — validate `next` param (T41)

### Performance
- **Leaderboards and landing page stats do full-table scans** — must use DB-level aggregation (T47, T48)
- **Navbar fires 4-8 server calls per page navigation** — consolidate to 1 call (T49)
- **Dashboard loads all sessions twice with `select("*")`** — deduplicate and add limits (T50)
- **`select("*")` is used everywhere** — replace with explicit column lists (T51)
- **N+1 patterns** in challenge progress and goal checking — batch queries (T50)
