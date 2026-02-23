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
