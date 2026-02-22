# Speed Cube Hub — MVP Task List

This is the shared task list for building the MVP (Practice Tracking + Stats). Multiple Claude sessions can work from this list in parallel.

## How to Use This File

**Before starting work:**
1. `git pull origin dev` to get the latest version of this file
2. Read through the tasks below
3. Find a task that is `🔲 Available` and has all dependencies marked `✅ Done`
4. Change its status to `🏗️ In Progress` and add your identifier (e.g., `[Claude-A]`)
5. Commit and push the claim immediately so other sessions see it

**When you finish a task:**
1. Change its status to `✅ Done`
2. Commit and push your code + this file update together
3. Look for the next available task

**Rules:**
- Never start a task whose dependencies aren't all `✅ Done`
- Always pull before claiming — another session may have claimed it
- If you hit a blocker, note it under the task and move on
- Each task should result in a working build (`npm run build` passes)
- Follow the v0 designs in `/tmp/speed-cube-hub-visual-design/` (clone `Brandonius813/speed-cube-hub-visual-design` if not present)

---

## Phase 1 — Foundation

These have no dependencies. Start here.

### T01: Shadcn Components + Shared Layout (Navbar + Footer)

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | ~5 files |

**What to build:**
1. Install the Shadcn UI components needed across the app: `button`, `card`, `badge`, `avatar`, `input`, `label`, `select`, `textarea`. Install using `npx shadcn@latest add <component>`.
2. Build the **Navbar** component from v0 design (`/tmp/speed-cube-hub-visual-design/components/navbar.tsx`). Place at `src/components/shared/navbar.tsx`.
3. Build the **Footer** component from v0 design (`/tmp/speed-cube-hub-visual-design/components/footer.tsx`). Place at `src/components/shared/footer.tsx`.
4. The navbar and footer should NOT be added to `layout.tsx` — each page includes them individually (matching the v0 pattern).

**v0 reference files:**
- `/tmp/speed-cube-hub-visual-design/components/navbar.tsx`
- `/tmp/speed-cube-hub-visual-design/components/footer.tsx`

**Acceptance criteria:**
- All listed Shadcn components install without errors
- Navbar renders with logo (Timer icon + "SpeedCubeHub"), Dashboard/Profile links (hidden on mobile), and "Log Session" button
- Footer renders with Box icon + "Speed Cube Hub" and tagline
- `npm run build` passes

---

### T02: Database Schema + TypeScript Types + Constants

| | |
|---|---|
| **Status** | ✅ Done |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | ~4 files + SQL |

**What to build:**
1. Create Supabase tables via SQL (run in Supabase dashboard or save as `.sql` file in `supabase/migrations/`):

**`profiles` table:**
```
id (uuid, PK, references auth.users)
display_name (text)
handle (text, unique)
bio (text, nullable)
avatar_url (text, nullable)
wca_id (text, nullable)
events (text[], default '{}')
created_at (timestamptz, default now())
updated_at (timestamptz, default now())
```

**`sessions` table:**
```
id (uuid, PK, default gen_random_uuid())
user_id (uuid, FK → profiles.id)
session_date (date)
event (text)
practice_type (text)
num_solves (integer)
duration_minutes (integer)
avg_time (numeric, nullable) — decimal seconds, e.g. 10.32
notes (text, nullable)
created_at (timestamptz, default now())
```

2. Enable RLS on both tables. Policies: anyone can SELECT (public-first), only authenticated owner can INSERT/UPDATE/DELETE their own rows.

3. Create TypeScript types at `src/lib/types.ts`:
   - `Profile` type matching the profiles table
   - `Session` type matching the sessions table

4. Create constants at `src/lib/constants.ts`:
   - `WCA_EVENTS` array with all 17 events (id, label, category)
   - `PRACTICE_TYPES` array: Solves, Drill Algs, Slow Solves, Comp Sim

**Acceptance criteria:**
- Tables created in Supabase with RLS enabled
- TypeScript types and constants are importable from `@/lib/types` and `@/lib/constants`
- `npm run build` passes

---

## Phase 2 — Auth + Landing

These depend on Phase 1 tasks.

### T03: Landing Page

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T01 ✅ |
| **Estimated scope** | ~5 files |

**What to build:**
1. **Hero** section from v0 design. Place at `src/components/landing/hero.tsx`.
2. **Features** section (3-column grid with visual mockups) from v0. Place at `src/components/landing/features.tsx`.
3. **SocialProof** section from v0. Place at `src/components/landing/social-proof.tsx`.
4. Update `src/app/page.tsx` to compose: Navbar → Hero → Features → SocialProof → Footer.

**v0 reference files:**
- `/tmp/speed-cube-hub-visual-design/components/landing/hero.tsx`
- `/tmp/speed-cube-hub-visual-design/components/landing/features.tsx`
- `/tmp/speed-cube-hub-visual-design/components/landing/social-proof.tsx`
- `/tmp/speed-cube-hub-visual-design/app/page.tsx`

**Acceptance criteria:**
- Landing page at `/` renders hero with gradient glow, 3 feature cards, and social proof stats
- Fully responsive (looks good at 375px and 1280px)
- `npm run build` passes

---

### T04: Auth System (Login, Signup, Logout)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T01 ✅, T02 ✅ |
| **Estimated scope** | ~8 files |

**What to build:**
1. **Login page** at `src/app/login/page.tsx` — email + password form, calls server action, redirects to `/dashboard` on success.
2. **Signup page** at `src/app/signup/page.tsx` — email + password + display name, calls server action, creates auth user + profile row, redirects to `/dashboard`.
3. **Auth server actions** at `src/lib/actions/auth.ts` — `login()`, `signup()`, `logout()` using Supabase server client.
4. **Auth middleware** at `src/middleware.ts` — refresh Supabase auth session on every request (standard `@supabase/ssr` pattern). Protect `/dashboard`, `/log`, and `/profile` routes — redirect unauthenticated users to `/login`.
5. **Update Navbar** — show Login/Sign Up buttons when logged out, show user avatar + Log Session when logged in. Use client-side auth check.

**Design note:** v0 designs don't include auth pages. Build them to match the dark theme (card-centered form on dark background, indigo primary button). Keep them simple.

**Acceptance criteria:**
- User can sign up with email/password and a display name
- User can log in and is redirected to `/dashboard`
- User can log out
- Protected routes redirect to `/login` if not authenticated
- Navbar updates based on auth state
- `npm run build` passes

---

## Phase 3 — Core Pages

These are the meat of the MVP. All 3 can be built in parallel.

### T05: Log Session Page

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T01 ✅, T02 ✅, T04 ✅ |
| **Estimated scope** | ~4 files |

**What to build:**
1. **Session form** from v0 design. Place at `src/components/log/session-form.tsx` (client component).
   - Fields: Date (date input), Event (select from `WCA_EVENTS`), Practice Type (select from `PRACTICE_TYPES`), Solves (number), Time Invested in minutes (number), Avg Time in seconds (text), Notes (textarea)
   - Validate with Zod schema + React Hook Form
   - On submit, call server action → show success state → reset form
2. **Server action** `createSession()` at `src/lib/actions/sessions.ts` — validates input, inserts into `sessions` table, returns success/error.
3. **Page** at `src/app/log/page.tsx` — server component that renders Navbar + SessionForm + Footer.

**v0 reference files:**
- `/tmp/speed-cube-hub-visual-design/components/log/session-form.tsx`
- `/tmp/speed-cube-hub-visual-design/app/log/page.tsx`

**Acceptance criteria:**
- Form renders all fields matching v0 design
- Validation works (required fields, numeric constraints)
- Successful submission inserts a row in the `sessions` table
- Success message shown, form resets
- `npm run build` passes

---

### T06: Dashboard Page

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T01 ✅, T02 ✅, T04 ✅ |
| **Estimated scope** | ~8 files |

**What to build:**
1. **Dashboard page** at `src/app/dashboard/page.tsx` (server component) — fetches user's sessions via server action, passes to client content component.
2. **Dashboard content** at `src/components/dashboard/dashboard-content.tsx` (client component) — orchestrates all dashboard sub-components, manages filter state.
3. **Filters** at `src/components/dashboard/filters.tsx` — event badges + date range buttons (7d, 30d, 90d, All time).
4. **Stats Cards** at `src/components/dashboard/stats-cards.tsx` — Sessions This Week, Total Practice Time, Current Streak.
5. **Event Pie Chart** at `src/components/dashboard/event-pie-chart.tsx` — donut chart showing time per event.
6. **Daily Bar Chart** at `src/components/dashboard/daily-bar-chart.tsx` — stacked bar chart of daily practice.
7. **Session Log** at `src/components/dashboard/session-log.tsx` — table on desktop, cards on mobile.
8. **Server actions** — `getSessions()`, `getSessionStats()` at `src/lib/actions/sessions.ts` (extend if it already exists from T05).

**v0 reference files:**
- `/tmp/speed-cube-hub-visual-design/app/dashboard/page.tsx`
- `/tmp/speed-cube-hub-visual-design/components/dashboard/*.tsx` (all 5 files)

**Important:** Install the Recharts `chart` Shadcn component if not already installed: `npx shadcn@latest add chart`.

**Acceptance criteria:**
- Dashboard shows stats, charts, and session log for the logged-in user
- Filters work (event type and date range update all dashboard data)
- Charts render correctly with Recharts
- Session log is a table on desktop, cards on mobile
- Shows empty state if user has no sessions
- `npm run build` passes

---

### T07: Profile Page

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T01 ✅, T02 ✅, T04 ✅ |
| **Estimated scope** | ~9 files |

**What to build:**
1. **Profile page** at `src/app/profile/page.tsx` (server component) — fetches profile + sessions via server actions.
2. **Profile content** at `src/components/profile/profile-content.tsx` (client component).
3. **Profile Header** at `src/components/profile/profile-header.tsx` — avatar, name, handle, bio, event badges.
4. **Profile Stats** at `src/components/profile/profile-stats.tsx` — total sessions, practice hours, current streak.
5. **Main Cubes** at `src/components/profile/main-cubes.tsx` — grid of user's cube setups (hardcoded/placeholder for now — no DB table yet).
6. **PB Grid** at `src/components/profile/pb-grid.tsx` — personal bests by event (computed from sessions data or placeholder).
7. **Links & Sponsors** at `src/components/profile/links-sponsors.tsx` — external links and sponsor logos (placeholder for now).
8. **Recent Activity** at `src/components/profile/recent-activity.tsx` — timeline of recent sessions.
9. **Server actions** — `getProfile()`, `getRecentActivity()` at `src/lib/actions/profiles.ts`.

**v0 reference files:**
- `/tmp/speed-cube-hub-visual-design/app/profile/page.tsx`
- `/tmp/speed-cube-hub-visual-design/components/profile/*.tsx` (all 6 files)

**Acceptance criteria:**
- Profile page renders all sections matching v0 design
- Shows real data from profiles and sessions tables
- Sections without backing data (cubes, links/sponsors) show reasonable placeholders
- `npm run build` passes

---

## Phase 4 — Integration + Polish

### T08: WCA API Integration

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T02 ✅, T07 ✅ |
| **Estimated scope** | ~3 files |

**What to build:**
1. **WCA API client** at `src/lib/actions/wca.ts` — fetch a user's competition results from the WCA API (`https://www.worldcubeassociation.org/api/v0/persons/{wca_id}`).
2. **Display WCA results** on the profile page — show official single/average PRs alongside practice data.
3. **Link WCA ID** — allow user to enter their WCA ID on their profile (update profiles table).

**Acceptance criteria:**
- If a user has a WCA ID set, their official results are fetched and displayed
- Handles missing/invalid WCA IDs gracefully
- `npm run build` passes

---

### T09: Mobile Optimization + Final QA + Deploy

| | |
|---|---|
| **Status** | 🔲 Available |
| **Claimed by** | — |
| **Dependencies** | T03 ✅, T05 ✅, T06 ✅, T07 ✅ |
| **Estimated scope** | All pages |

**What to do:**
1. Test every page at **375px width** (iPhone SE). Fix any horizontal overflow.
2. Verify **touch targets** are at least 44x44px on all interactive elements.
3. Verify **no hover-only interactions** — everything works on tap.
4. Run `npm run build` and fix any errors.
5. Manual end-to-end test: sign up → log a session → check dashboard → check profile.
6. Report results. DO NOT merge to `main` — Brandon will say when to go live.

**Acceptance criteria:**
- Zero horizontal overflow on any page at 375px
- All interactive elements are finger-friendly
- Full user flow works end-to-end
- Production build passes with zero errors

---

## Dependency Graph

```
T01 (Layout) ──┬── T03 (Landing) ───────────────────┐
               │                                     │
               ├── T04 (Auth) ──┬── T05 (Log) ──────┤
               │                │                     │
T02 (Database) ┘                ├── T06 (Dashboard) ──┼── T09 (QA)
                                │                     │
                                └── T07 (Profile) ──┬─┘
                                                    │
                                                    └── T08 (WCA)
```

**Max parallelism by wave:**
- Wave 1: T01, T02 (2 parallel)
- Wave 2: T03, T04 (2 parallel)
- Wave 3: T05, T06, T07 (3 parallel)
- Wave 4: T08, T09 (2 parallel)
