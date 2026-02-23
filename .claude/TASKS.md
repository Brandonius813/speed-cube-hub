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
| **Status** | 🏗️ In Progress |
| **Claimed by** | Claude-E |
| **Dependencies** | None |
| **Estimated scope** | 1 file |

**Problem:** Clicking login → takes forever → "redirected too many times."

**Root cause:** The auth callback route (`src/app/api/auth/callback/route.ts`) uses `createClient()` from server.ts which sets cookies via `cookies()`. But the route returns `NextResponse.redirect()` — a separate response object that doesn't include those cookies. The session is never established.

**Fix:** Rewrite the callback route to create the Supabase client with cookies set directly on the redirect response object (Supabase's recommended pattern for route handlers).

**Acceptance criteria:**
- Google sign-in works end-to-end (login → callback → dashboard)
- Email/password login works (no redirect loop)
- `npm run build` passes

---

### T11: Fix WCA OAuth "Unknown Client" Error

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 1 file + Vercel config |

**Problem:** Clicking "Link WCA Account" on profile → WCA returns "Client authentication failed due to unknown client."

**Likely cause:** `WCA_CLIENT_ID` and `WCA_CLIENT_SECRET` env vars are missing or incorrect on Vercel.

**Fix:**
1. Verify env vars are set in Vercel
2. Apply the same cookie fix from T10 to the WCA callback route (`src/app/api/auth/wca/callback/route.ts`)
3. Test the full WCA OAuth flow on the live site

**Acceptance criteria:**
- WCA sign-in flow works end-to-end on production
- WCA ID is saved to profile after successful auth
- `npm run build` passes

---

## Phase 2 — Quick UI Fixes (No Dependencies)

### T12: Navbar Logo + Footer Text

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 4 files |

**Changes:**
1. Navbar: Change `Timer` icon to `Box` (cube icon) in navbar, login page, signup page
2. Footer: "Built by cubers, for cubers." + "Brand True" underneath

**Acceptance criteria:**
- Cube icon everywhere instead of stopwatch
- Footer updated
- `npm run build` passes

---

### T13: Dynamic Landing Page Stats

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 3 files |

**What to build:**
1. New `getGlobalStats()` server action using admin client
2. Update SocialProof component to accept real stats as props
3. Update landing page to fetch and pass stats

**Acceptance criteria:**
- Real numbers from database on landing page
- `npm run build` passes

---

## Phase 3 — Dashboard Heatmap

### T14: Practice Activity Heatmap (Skool/GitHub Style)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 2 files |

**What to build:**
GitHub/Skool-style activity grid (52 weeks × 7 days). Color intensity = practice volume. New section on dashboard after stats cards.

**Acceptance criteria:**
- Heatmap renders 365 days
- Color intensity reflects practice
- Mobile scrollable
- `npm run build` passes

---

## Phase 4 — Profile Overhaul

### T15: Database Schema Update for Profile Customization

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | SQL + 1 file |

**What to do:**
1. Add `cubes`, `links`, `accomplishments` JSONB columns to profiles table
2. Update TypeScript Profile type

**Acceptance criteria:**
- New columns exist in Supabase
- Types updated
- `npm run build` passes

---

### T16: Profile Edit Mode (Edit Bio, Name, Avatar)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T15 ✅ |
| **Estimated scope** | 3 files |

**What to build:**
1. "Edit Profile" button (owner only)
2. Edit modal for: display name, bio, avatar
3. `updateProfile()` server action

**Acceptance criteria:**
- Owner can edit and save profile
- `npm run build` passes

---

### T17: Notable Accomplishments Section

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 2 files |

**What to build:**
Editable list of cubing milestones (title + optional date). Add/edit/delete.

**Acceptance criteria:**
- CRUD for accomplishments
- Visible to all visitors
- `npm run build` passes

---

### T18: Editable Main Cubes

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 1 file |

**What to build:**
Replace hardcoded cubes with editable list from `cubes` JSONB column.

**Acceptance criteria:**
- Owner can add/edit/delete cubes
- `npm run build` passes

---

### T19: Editable Social Links

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T15 ✅, T16 ✅ |
| **Estimated scope** | 1 file |

**What to build:**
Replace hardcoded links with editable list from `links` JSONB column. Support YouTube, IG, TikTok, X, Discord, WCA, custom URL.

**Acceptance criteria:**
- Owner can add/edit/delete links
- Platform icons display
- `npm run build` passes

---

### T20: Upcoming Competitions (Stretch)

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | T15 ✅ |
| **Estimated scope** | 2 files |

**What to build:**
Fetch upcoming competitions from WCA API for users with linked WCA ID.

**Acceptance criteria:**
- Shows upcoming comps if WCA ID linked
- Hidden gracefully if none
- `npm run build` passes

---

## Dependency Graph

```
T10 (Login Fix)     — no deps
T11 (WCA Fix)       — no deps
T12 (Navbar/Footer) — no deps
T13 (Dynamic Stats) — no deps
T14 (Heatmap)       — no deps
T15 (DB Schema)     — no deps
T16 (Edit Profile)  — T15
T17 (Accomplishments) — T15, T16
T18 (Cubes)         — T15, T16
T19 (Links)         — T15, T16
T20 (Upcoming Comps) — T15
```

**Max parallelism:**
- Wave 1: T10, T11, T12, T13, T14, T15 (6 parallel)
- Wave 2: T16, T20 (after T15)
- Wave 3: T17, T18, T19 (after T16)
