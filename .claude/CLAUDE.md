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
- **Workflow:** Commit and push to `dev` after every working feature. When user says "go live," merge `dev` into `main` and push.

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
- `src/lib/actions/wca.ts` — WCA API integration (fetch results, unlink WCA ID)
- `src/lib/actions/follows.ts` — Follow/unfollow system (followUser, unfollowUser, getFollowCounts, isFollowing, getFollowers, getFollowing)
- `src/lib/actions/feed.ts` — Activity feed (getFeed with cursor-based pagination, enriched with like/comment counts)
- `src/lib/actions/likes.ts` — Like/unlike system (likeSession, unlikeSession, getSessionLikeInfo)
- `src/lib/actions/comments.ts` — Comments system (addComment, getComments, deleteComment, getCommentCounts)
- `src/lib/actions/goals.ts` — Goals system (createGoal, getGoals, updateGoal, deleteGoal, checkGoalProgress)
- `src/lib/actions/notifications.ts` — Notifications system (createNotification, getNotifications, markAsRead, markAllAsRead, getUnreadCount)
- `src/app/api/auth/callback/route.ts` — Supabase OAuth callback (Google sign-in + auto profile creation)
- `src/app/api/auth/wca/callback/route.ts` — WCA OAuth callback (verifies WCA ID ownership)
- `src/components/ui/` — Shadcn/ui components
- `src/components/shared/` — Shared app components (navbar, etc.)
- `src/components/profile/` — Profile page components (header, stats, WCA results, follow button, follow list modal, etc.)
- `src/components/feed/` — Activity feed components (feed-content, feed-item, like-button, following-sidebar)
- `src/lib/actions/leaderboards.ts` — Leaderboards system (getLeaderboard with category/event/friends-only filtering)
- `src/components/discover/` — Discover/search cubers components
- `src/components/leaderboards/` — Leaderboard components (leaderboards-content)
- `src/lib/actions/wrapped.ts` — Year in Review stats (getWrappedStats)
- `src/components/wrapped/` — Year in Review (Wrapped) components (wrapped-content)
- `src/lib/actions/challenges.ts` — Challenges system (getChallenges, joinChallenge, leaveChallenge, getChallengeProgress, createChallenge)
- `src/components/challenges/` — Challenge components (challenges-content, challenge-card, create-challenge-modal)

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
/dashboard           → Practice stats dashboard (filters, charts, session log) [protected]
/profile             → User's own profile (header, stats, cubes, PBs, links, activity) [protected]
/profile/[handle]    → Public profile for any user (viewable by anyone) [public]
/log                 → Log a practice session (form) [protected]
/feed                → Activity feed (sessions from followed users) [protected]
/discover            → Search and browse cubers [public]
/notifications       → Notification inbox [protected] — planned (Wave 2)
/leaderboards        → Public leaderboards (fastest avg, most solves, streaks, practice time) [public]
/challenges          → Community challenges (join, track progress, admin creates) [protected]
/clubs               → Browse/manage clubs [protected] — planned (Wave 4)
/clubs/[id]          → Individual club page [public] — planned (Wave 4)
/wrapped             → Year in Review [protected]
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

## Feature Status

Features will be tracked in the PRD with checkmarks. Refer to it for current progress.
