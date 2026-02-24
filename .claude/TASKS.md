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
| **Status** | 🔲 Available |
| **Dependencies** | T23 ✅ |
| **Estimated scope** | 1 page + 1 content component + navbar update |

Build `/notifications` page showing a list of notifications (icon + "Brandon liked your session" + timestamp). Mark as read on view. Add unread count badge (red dot or number) to the navbar bell icon. Mobile-friendly card layout.

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
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 1 server action file + 1 page + 2 components |

Create `challenges` and `challenge_participants` tables. Build server actions: `getChallenges()`, `joinChallenge()`, `getChallengeProgress()`. Build `/challenges` page listing active challenges (e.g., "Log 100 solves this week"). Each shows a progress bar. Users tap to join. Progress auto-calculated from their sessions during the challenge period. Admin can create challenges.

---

### T29: Badges & Credentials System

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 2 server action files + 3 components + profile update |

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
| **Status** | 🏗️ In Progress |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | 1 server action file + 1 page + 2 components |

Build `/leaderboards` page with category tabs: Fastest Average (by event), Most Solves (all-time), Longest Streak, Most Practice Time. Each leaderboard shows rank, user avatar/name, stat value. Tap a user to visit their profile. Optional "Friends Only" toggle to filter to people you follow.

---

### T31: Clubs / Groups

| | |
|---|---|
| **Status** | 🏗️ In Progress |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | SQL migrations (2 tables) + 1 server action file + 2 pages + 3 components |

Create `clubs` and `club_members` tables. Build server actions: `createClub()`, `getClubs()`, `joinClub()`, `leaveClub()`, `getClubMembers()`, `getClubFeed()`. Build `/clubs` page (browse/search clubs) and `/clubs/[id]` page (club detail with member list + shared activity feed from members). Owner/admin can edit club details.

---

### T32: Year in Review / Wrapped

| | |
|---|---|
| **Status** | 🔲 Available |
| **Dependencies** | None |
| **Estimated scope** | 1 server action + 1 page + 2 components |

Build `/wrapped` page showing annual stats summary for the logged-in user. Sections: total solves, total practice hours, number of sessions, most-practiced event, biggest PB improvement, longest streak, events practiced, month-by-month breakdown. Fun visual design inspired by Spotify Wrapped. Shareable (ties into T33).

---

### T33: Share Cards

| | |
|---|---|
| **Status** | 🏗️ In Progress |
| **Claimed by** | Claude-Main |
| **Dependencies** | None |
| **Estimated scope** | 1 API route + 1 component + feed-item update |

Generate shareable images (OG-image style) when a user hits a PB or completes a notable session. Use `@vercel/og` or HTML canvas to render a branded card with the user's name, event, time, and Speed Cube Hub branding. "Share" button on feed items and profile PBs that copies the image or opens share sheet on mobile.

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

**Max parallelism:**
- Phase 5 Wave A: T21, T22 (2 parallel)
- Phase 5 Wave B: T23 (after T21 + T22) → T24 (after T23)
- Phase 6: T25, T26, T27, T28, T29 (all 5 parallel — no deps on each other)
- Phase 7: T30, T31, T32, T33 (all 4 parallel — no deps on each other)
