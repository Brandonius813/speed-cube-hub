# Speed Cube Hub — Product Requirements Document

## The Elevator Pitch

**"Strava for Cubing."** Speed Cube Hub is a practice tracking, social, and coaching platform for speedcubers. Log your training, see your stats, compare with your WCA results, share your progress with other cubers, and (if you're a coach) manage your students — all in one place.

## Founder & Origin Story

**Brandon True** is a competitive speedcuber, coach, and community builder.

- **YouTube:** 2.8k subscribers in 5 months, highly engaged audience. Has interviewed national record holders and world champions on his podcast.
- **Coaching:** Ran a 30-person boot camp at $100/person with coaching, group accountability, and a Discord server. Wished he had software to orchestrate it.
- **brandontruecubing.com:** Built a personal practice tracker to get deeper insights into his training. Other cubers loved it and wanted to use it themselves.
- **Speed Cube Hub** is the productized evolution — replacing brandontruecubing.com with a multi-user platform that any cuber can use.

## Product Vision — Three Pillars

### Pillar 1: Practice Tracking + Stats (MVP)
Track your cubing practice with detailed session logging, rich analytics, and WCA comparison.

### Pillar 2: Social Network
A feed where cubers share their training (auto-posted sessions + manual posts), follow each other, and stay motivated. A home for cubing community discourse.

### Pillar 3: Coaching Platform
Tools for coaches to assign homework, review student practice data, and store coaching notes. Complementary to cubing.gg (Tymon Kolasinski's coaching/course platform) — not competing with it.

## Business Model

- **Bootstrapped side income** — target: a few thousand dollars per month
- **Freemium:** Almost all features free. Paid tier unlocks premium features.
- **Ads** on the free tier. Paid subscription removes ads.
- Manual AdSense placements are live on the homepage, feed, leaderboards sidebar (desktop only), and public profiles. Timer, auth, admin, and onboarding flows stay ad-free.
- **Coach seat pricing:** Coaches (or cubing.gg) pay per coach seat to use the coaching tools.
- **Potential cubing.gg partnership:** Per-coach-seat licensing, or deeper integration where Speed Cube Hub becomes part of the cubing.gg ecosystem.

## Target Users & Go-To-Market

- **First 20 users:** YouTube subscribers, cubing.gg community members, and coaching students.
- **Strategy:** Make it so good that those first 20 people can't live without it. Then grow from there.
- **Public-first:** Anyone can view profiles and stats. Accounts required for logging practice and social features.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Supabase (auth + PostgreSQL + Storage)
- Shadcn/ui, Recharts, date-fns, Zod, React Hook Form
- Deployed on Vercel

## Architecture Decisions

- **Public-first:** All pages publicly viewable. Admin controls hidden via `isAdmin` boolean.
- **Phone-web protection:** iPhone/Android phone requests to desktop-style app routes are redirected to `/mobile-unsupported`; iPad/tablets stay on the web experience, and public browse routes remain phone-accessible.
- **Server + Client component pattern:** `page.tsx` (server) fetches data, `*-content.tsx` (client) handles interactivity.
- **Server actions** for mutations and data fetching. Client Supabase for auth checks only.
- **React Compiler** enabled for automatic memoization.
- **Local dev reliability:** Use `npm run dev:up` / `npm run dev:down` for persistent localhost sessions. HSTS is production-only (not sent in local dev).

---

## Native Platform Expansion (Planned)

Speed Cube Hub is now planned as a multi-client platform, not just a website.

- **Near-term target:** native iPhone + iPad app
- **Next target:** native Android app
- **Later target:** native macOS app
- **Sync rule:** one canonical backend and database; all clients read/write the same product data
- **Architecture rule:** Next.js server actions are not the long-term backend boundary for native work; shared backend contracts must be extracted for cross-client features
- **Monetization rule:** digital purchases inside native apps must be designed around platform billing plus server-verified entitlements

Canonical implementation plans:

- `plans/native-platform-migration.md`
- `plans/native-platform-agent-workstreams.md`

---

## MVP: Practice Tracking + Stats

### Session Data Model

Each practice session captures (based on the proven model from brandontruecubing.com):

| Field | Description |
|-------|-------------|
| **Date** | When the session happened |
| **Event** | Which WCA event (see supported events below) |
| **Practice type** | What kind of practice: Solves, Drill Algs, Slow Solves, Competition |
| **Number of solves** | How many solves were completed |
| **Time invested** | Duration of the session in minutes |
| **Average solve time** | Average time per solve (decimal seconds, e.g. 10.32) |
| **Notes** | Optional free-text notes about the session |

### Practice Stats

- **Practice streaks** — current streak and longest streak (consecutive days practiced)
- **Event breakdown** — cumulative time and solve counts by puzzle type
- **Time distribution** — charts showing how practice time is split across events
- **Heatmap calendar** — visual representation of practice frequency and intensity
- **Session history** — filterable, sortable, paginated list of all sessions
- **Filters** — by event type, practice type, and date range (today, last week, last 30 days, custom)

### WCA Integration

- Pull a user's official WCA competition results via the WCA API
- Display official results alongside practice data
- **WCA OAuth verification** — users link their WCA account by signing in through the official WCA website (prevents claiming someone else's ID)
- Show how practice performance compares to competition performance over time

### Supported WCA Events (all 17)

| Category | Events |
|----------|--------|
| **NxN** | 2x2, 3x3, 4x4, 5x5, 6x6, 7x7 |
| **Blindfolded** | 3x3 BLD, 4x4 BLD, 5x5 BLD, Multi-BLD |
| **One-Handed** | 3x3 OH |
| **Other** | Megaminx, Pyraminx, Clock, Skewb, Square-1 |
| **Fewest Moves** | FMC |

## Roadmap — "Strava for Cubing"

### Social Wave 1 — Foundation (Complete)
- [x] Auto-posted sessions in activity feed at /feed
- [x] Follow/following system (follow/unfollow, follower counts on profiles, clickable follower/following lists, feed sidebar)
- [x] Public profiles at /profile/[handle]
- [x] Discover page at /discover (search and browse cubers)
- [x] Updated navbar with Feed and Discover links

### Social Wave 2 — Engagement
- [x] Likes/Kudos on feed sessions (tap to like, like count, who liked it)
- [x] Comments on feed sessions (text replies on activity items)
- [x] Notifications system (new follower, like, comment, PB alerts)
- [x] Notifications page at /notifications with unread badge in navbar

### Social Wave 3 — Motivation & Retention
- [x] Goals (set targets like "sub-20 on 3x3 by June", track progress with visual bars, auto-detect achievement)
- [x] PB History / Progress Charts (step-line chart on dashboard showing running PB progression per event)
- [x] Enhanced Streaks (prominent on profile, streak milestones, gamified feel like Duolingo)
- [x] Weekly/Monthly Challenges (community-wide, e.g. "100 solves this week" — everyone can join, progress calculated from real sessions)
- [x] New-user onboarding checklist + guided tours (first-time users land on `/profile`, see an owner-only checklist on profile overview, and launch page-specific spotlight tours for profile, cubes, bulk import, timer, Comp Sim, feed, and clubs that only complete on real successful actions)
- [ ] Badges & Credentials — REMOVED (v1 was stripped out; to be redesigned)

### Social Wave 4 — Community & Discovery
- [x] Public Leaderboards (fastest averages, most solves, longest streaks, most practice time — global + friends-only views)
- [x] Profile Head-to-Head Comparison (`/profile/[handle]/compare`) — logged-in users can compare themselves against a viewed public profile across last 7/30 day practice, all-time event practice totals, and current PBs without changing the default profile view
- [x] SOR & Kinch Rank Leaderboards (Sum of Ranks + Kinch scores for ALL WCA competitors globally, sourced from WCA database export synced weekly via GitHub Action; region filtering by world/continent/country; single/average toggle; "Find Me" for linked WCA IDs; SOR rank and Kinch score on user profiles)
- [x] Clubs/Groups (cubing teams, coaching groups, regional clubs — shared feeds and member lists)
- [x] Year in Review / Wrapped (annual stats summary a la Spotify Wrapped — total solves, hours, PB improvements, most-practiced event)
- [x] Share Cards (auto-generated shareable images when you hit a PB or finish a big session — post to Instagram/Discord/X) -- Built OG image API route using @vercel/og, share button on feed items and profile PBs with Web Share API (mobile) + clipboard fallback (desktop)
- [x] Personal Bests Page — Dedicated `/pbs` page for manually logging PB history (Single, Ao5, Ao12, etc. per event). Card grid grouped by event, "Log New PB" modal, PB history modal with Recharts progression chart, smart is_current auto-promotion, delete with next-fastest promotion. Uses `personal_bests` table with RLS.
- [x] Feedback System — "Send Feedback" button in footer opens a modal with category picker (Bug Report, Feature Request, General Feedback, Other) and message box. Requires login to submit, saves to `feedback` table. No spam risk since auth-gated.
- [ ] Social feed/discovery rework foundation — In progress on `codex/social-preview-foundation`: mixed feed entries (sessions + posts), richer session recap cards, unified Discover tabs (`All`, `People`, `Posts`, `Clubs`, `Events`), favorites/mutes, post composer, post/thread comments, preview seed script, and a localhost mock-preview fallback. Hosted dev still needs Supabase migration `026_social_preview_foundation.sql` applied before remote reseeding works.

### Security & Performance Hardening (Phase 9)
- [x] Fix open redirect in Google OAuth callback (T41)
- [x] Add middleware for route protection + session refresh (T42)
- [x] Make createNotification/checkAndAwardMilestones internal helpers (T43)
- [x] Add Zod input validation to session/PB server actions (T44)
- [x] Sanitize PostgREST search filter in searchProfiles (T45)
- [x] Reduce admin client overuse — fix RLS policies (T46)
- [x] Fix leaderboards — move aggregation to database (T47)
- [x] Fix landing page stats — use database aggregation (T48)
- [x] Fix navbar — reduce server calls from 8 to 1 (T49)
- [x] Fix dashboard — deduplicate session fetches + add limits (T50)
- [ ] Replace select("*") with explicit column lists (T51) — **Reverted 3x.** Requires a live Supabase DB schema audit first (`SELECT column_name FROM information_schema.columns WHERE table_name = '...'`) because many columns were added via SQL editor and don't match the TypeScript types. Do not re-attempt without verifying every column name against the live database.

### Profile Rework — 6-Tab Layout with Sidebar (Phase 11 + Comp Sim Expansion)

Rework the profile page from a flat vertical stack into a swipeable tab layout with a persistent Skool-style sidebar on desktop. Mobile: full-width swipeable tabs (Clash Royale-style). Desktop: clickable tabs + sticky profile card sidebar on right.

- [x] Schema: `main_events text[]` (up to 3 main events, replaces single `main_event`)
- [x] Server action: `getPBsByUserId` (public PB fetch for any user)
- [x] SessionLog `readOnly` prop (for public profile Stats tab)
- [x] Profile sidebar component (Skool-style card: avatar, name, main events, bio, meta, stats, follow, social links)
- [x] Profile tabs component (tab bar + swipe detection + URL integration)
- [x] 6 tab content components:
  - **PBs** — read-only PB grid for visitors, full CRUD for owner, PB progression chart
  - **Stats** — practice heatmap, streak, charts, session log
  - **Comp Sim** — dedicated round history, KPI cards, result trend, event/format/outcome filters, and comp-vs-practice comparison
  - **Overview** (default) — profile header (mobile), stat cards, practice streak, recent activity
  - **Cubes** — main cubes grid (existing component)
  - **Official** — WCA results (lazy-loaded), allrounding, upcoming competitions
- [x] Rewrite profile content components with grid + tabs layout
- [ ] Activate unused components: `UpcomingCompetitions`, `PBProgressChart` (on profile)

### Remaining Security Items (Manual)
- [ ] **Rate limiting** — Add rate limiting to login, signup, `/api/scramble`, and `/api/og`. Requires Upstash Redis (or similar) since Vercel serverless can't do in-memory rate limiting reliably. Supabase Auth already rate-limits login/signup natively, so the API routes are the priority.
- [ ] **Challenges RLS policy** — The `challenges` table INSERT policy allows any authenticated user. Need a SQL migration to restrict INSERT to admin users only (currently admin check is only enforced in the server action, not at the database level).

### Coaching Platform (Future)
- Coach role with student management
- Assign homework (e.g., "do 100 solves of 3x3 this week" or "practice F2L for 30 min daily")
- Review student practice sessions and stats
- Coaching notes per student (stored after each session/call)
- Potential integration with cubing.gg's existing coaching workflows

### Built-In Timer — Full csTimer Parity (In Progress)

Cloud-synced cubing timer at `/timer` — a modern, beautiful alternative to csTimer with **complete feature parity**. The time list and stats panel match csTimer's familiar layout (muscle memory for cubers), while every modal and detail view has dramatically better UI (CubeDesk-inspired: clean, dark, card-based). Deeply integrated with Speed Cube Hub profiles.

**V1 Features (Complete):**
- [x] Core timer with spacebar start/stop (desktop) and tap start/stop (mobile)
- [x] NxN scrambles (2x2–7x7) via `cubing` library, plus a dedicated TNoodle-style Square-1 core — WCA-standard random-state for supported events via server-side API route (`/api/scramble`), without the old unsafe Square-1 random-tuple fallback
- [x] Scrollable solve list with times, penalties (+2/DNF), delete, per-solve notes
- [x] Running averages: Ao5, Ao12, Ao50, Ao100, BPA, WPA, best single, best Ao5, best Ao12, session mean
- [x] WCA inspection timer: 15-second countdown with voice warnings at 8s and 12s, toggleable
- [x] Competition simulation mode: Comp Sim mode entry from the timer practice-type selector, `Mo3`/`Ao5` round formats, cumulative time limits, cutoff after solve 1 or 2, configurable wait-range bounds, real crowd-scene audio pack (5 ambiences + 20 reaction/judge clips) with setup previews, richer live event shell, and Comp Sim profile tracking nested under the Stats tab
- [x] Typing input mode (stackmat-style digit entry)
- [x] Session auto-logging: when ended, auto-creates a `sessions` row for feed/stats/leaderboards
- [x] Adaptive layout: full-screen on mobile, dashboard (timer + stats sidebar) on desktop
- [x] Event selector for all 17 WCA events
- [x] Time Distribution + Time Trend charts
- [x] Sidebar position options (right/left/bottom/hidden)
- [x] Show/hide time while solving

**Phase 14 — Named Session Management — T96-T105:** ✅ Complete
- [x] Database migration for `solve_sessions` table (T96)
- [x] Types & validation schemas (T97)
- [x] Server actions — solve session CRUD (T98)
- [x] Update timer server actions (T99)
- [x] Session selector component (T100)
- [x] Session manager modal (T101)
- [x] Timer integration — wire up named sessions (T102)
- [x] First-time defaults & auto-create (T103)
- [x] Reset & throwaway behavior (T104)
- [x] Update docs (T105)

**Phase 15 — Core UX (csTimer Parity Baseline) — T106-T115:**
- [x] csTimer-style stats panel (compact table with current/best columns, sigma, target time) (T106)
- [x] Customizable statistical indicators (user picks any aoX/moX combo, configurable trim %) (T107)
- [x] Statistics detail popup (click any average → see all solves, trimmed marked) (T108)
- [x] Solve detail modal (beautiful card: time, scramble, date, notes, penalties, delete) (T109)
- [x] Time list redesign (compact rows, click-to-detail, PB highlighting, DNF styling) (T110)
- [x] Keyboard shortcuts (Ctrl+1/2/3 penalties, Ctrl+Z undo, Alt+arrows, event quick-switch) (T111)
- [x] Undo last solve with toast notification (T112)
- [x] Solve notes/comments UI in detail modal (T113)
- [x] 2D scramble image visualization (T114) — includes a custom TNoodle-style Square-1 renderer so draw/animation match the legal Square-1 state model
- [x] Cross solver tool (T115) with fixed cube-orientation guidance per cross color (for example: Red bottom, Green front)

**Phase 16 — Training Scrambles — T116-T123:**
- [x] 3x3 CFOP core (PLL, OLL, F2L, LL, LSLL, easy cross) — scramble type selector in timer (T116)
- [x] 3x3 advanced (ZBLL, COLL, CLL, ELL, 2GLL, ZZLL, ZBLS, EOLS, WVLS, VLS, EOLine) (T117)
- [x] 3x3 Roux + Mehta training scrambles (T118)
- [x] 3x3 move subset scrambles (2-gen, 3-gen, Roux-gen, half turns, edges/corners only) (T119)
- [x] 2x2 training (EG, CLL, EG1/2, TCLL, LS, No Bar) (T120)
- [x] 4x4+ training (edges, centers, Yau/Hoya stages) + Pyra, Skewb, SQ1, Mega training (T121)
- [x] Case filtering UI (checkbox grid, probability control) (T122)
- [x] Per-case performance statistics (T123)

**Phase 17 — Timer Modes & Advanced Input — T124-T128:**
- [x] Multi-phase timing (Cross/F2L/OLL/PLL splits) (T124)
- [x] Configurable timer hold duration (T125)
- [x] Timer display customization (size, small decimals, update mode) (T126)
- [x] Mobile swipe gestures (8-direction, matching csTimer) (T127)
- [x] Manual scramble input mode (T128)

**Phase 18 — Session Data Features — T129-T133:**
- [x] Session merge & split (T129)
- [x] Cross-session statistics with filters (T130)
- [x] Daily statistics (solves per day/week/month) (T131)
- [x] Export timer data (CSV, JSON, csTimer-compatible .txt) (T132)
- [x] Import from csTimer, CubeTime, Twisty Timer, generic CSV, AI fallback (T133)

**Phase 19 — Advanced Tools — T134-T138:**
- [x] Batch scramble generator (up to 999) (T134)
- [x] Metronome tool (T135)
- [x] Shared scramble seed (race friends) (T136)
- [x] Additional solvers (EOLine, Roux S1, 2x2 face, Pyraminx V, Skewb face) (T137)
- [x] BLD helper tool (T138)

**Phase 20 — Non-WCA Puzzles & Relays — T139-T143:**
- [x] Big cubes 8x8-11x11 + custom NxN (T139)
- [x] Popular non-WCA puzzles (Mirror, Gear, Ivy, Redi, Kilominx, FTO, cuboids) (T140)
- [x] Remaining non-WCA puzzles (~20 more types) (T141)
- [x] Relay scrambles (234, 2345, 234567, Mini Guildford) (T142)
- [x] Other event training variants (Mega, Pyra, Skewb, SQ1 — Clock deferred) (T143)

**Phase 21 — Hardware Integration — T144-T146:**
- [x] Virtual cube (3D interactive with keyboard/mouse controls) (T144)
- [x] Bluetooth smart cube (GAN, GoCube, Giiker, Moyu) (T145)
- [x] Stackmat timer support (T146)

**Phase 22 — Online & Social Timer — T147-T148:**
- [x] Online battle mode (rooms, real-time, shared scrambles) (T147)
- [x] Scramble animation (step-through 3D) (T148)

**Phase 23 — Polish & Display — T149-T152:**
- [x] Hide all elements during timing (T149)
- [x] Scramble display options (size, font, alignment) (T150)
- [x] Multiple solve deletion (batch select) (T151)
- [x] Auto-backup / auto-export (T152)

**Phase 24 — Timer Multi-Pane Workspace — T153:**
- [x] Modular pane workspace (up to 4 tools) with fixed desktop slots (top-right, bottom-right, bottom-middle, bottom-left) + mobile stacked drawer
- [x] Mobile stacked pane drawer with add/remove/reorder and per-pane height presets
- [x] Tool registry architecture + new Scramble Text pane + split chart tools (Time Distribution, Time Trend)
- [x] Local-first layout persistence with account sync (`timer_pane_layouts`) and latest-write-wins merge
- [x] User controls: edit/lock mode, auto-hide panes during solve toggle, reset layout

**Phase 26 — Timer QoL Polish — T155:**
- [x] Quick timer shortcuts for `+2`, `DNF`, and next scramble
- [x] Reopening a tool pane restores its last slot/settings instead of jumping back to defaults
- [x] Timer text sizing controls for larger scramble/readout/list text, plus separate pane scramble/solve-time sizing in settings
- [x] Session-vs-all-time stats in the left timer panel (session best + session mean alongside current/all-time)
- [x] Click a solve on the left to open a richer detail modal with notes, scramble, PB/share, penalty changes, and delete
- [x] Screen wake lock keeps laptops awake while GAN timer or active timer/Comp Sim flows are in use
- [x] Comp Sim / GAN flow hardening: Comp Sim is now an exclusive mode with guarded entry, clearer copy, standalone auto-save timing, and ignored GAN input while the simulator is active
- [x] Shared solve-import review for timer exports: csTimer, CubeTime, and future raw-solve parsers now use the same pre-import summary cards and suspicious-solve review flow (best single, current/best Ao5, Ao12, Ao100, plus outlier toggles)

**Phase 33 — Timer Scalability Foundation — T164:**
- [x] Added timer analytics summary/rollup tables (`event_summaries`, `solve_session_summaries`, `solve_daily_rollups`) plus a histogram RPC so all-time timer/profile/dashboard charts no longer require raw solve downloads
- [x] `saveTimerSession`, timer imports, manual solve updates/deletes, and solve-session merge/split now refresh the affected timer analytics summaries after solve mutations
- [x] Timer daily stats now read from daily rollups/event summaries instead of selecting raw solve timestamps and grouping them in JavaScript
- [x] Dashboard/profile/timer all-time solve analytics now use aggregated server payloads (distribution buckets + date buckets) instead of `getSolvesByEvent()`
- [x] Timer local solve cache moved to a fresh v2 IndexedDB store and cross-device sync now hydrates only a recent event window instead of mirroring the entire event history on first load
- [x] Timer open now loads only a recent saved-history window plus the active unsaved block, older saved solves page in on demand, and exact solve/stat detail windows fetch from the server instead of requiring full event hydration
- [x] Timer all-time pane charts now use aggregated server trend/distribution data in all-time mode instead of rendering from the loaded client window

### Algorithm Learning System (Future)
- Khan Academy-style structured learning
- Learn OLL, PLL, and other algorithm sets for all events
- Track which alg sets you know fully
- Profile badges showing mastered alg sets
- Built-in upsells for cubing.gg courses

---

## Database Schema

### Existing Tables

**profiles** — User profile data
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | FK to auth.users |
| display_name | text | Required |
| handle | text (unique) | URL-safe username |
| bio | text | Optional |
| avatar_url | text | Supabase Storage URL |
| wca_id | text | WCA account ID (OAuth verified) |
| location | text | User location (nullable) |
| sponsor | text | Sponsor name (nullable) |
| country_id | text | WCA country ID (set via WCA OAuth callback, nullable) |
| events | text[] | WCA events the user practices |
| main_event | text | Primary/main WCA event (nullable, deprecated — use main_events) |
| main_events | text[] | Up to 3 main WCA events (default '{}') |
| wca_event_order | text[] | Custom event display ordering on profile (nullable) |
| pb_visible_types | text[] | Which PB types to show on profile (nullable) |
| cubes | jsonb | Array of {name, setup, event} |
| links | jsonb | Array of {platform, url, label} |
| accomplishments | jsonb | Array of {title, date} |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto (trigger) |

**sessions** — Practice session logs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | References profiles(id) |
| session_date | date | When practice happened |
| event | text | WCA event code |
| practice_type | text | Solves, Drill Algs, etc. |
| num_solves | integer | Solve count |
| duration_minutes | integer | Session length |
| avg_time | numeric | Average solve time (decimal seconds) |
| best_time | numeric | Best single solve time (decimal seconds) |
| title | text | Session title (nullable, used for bulk import summaries) |
| notes | text | Optional |
| feed_visible | boolean | Whether to show in feed (default true, false for bulk-imported sessions) |
| created_at | timestamptz | Auto (used for feed ordering) |

**user_onboarding** — Private first-time onboarding progress
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid (PK/FK) | References profiles(id), CASCADE |
| auto_launch_pending | boolean | Whether the first profile overview tour should auto-open |
| profile_viewed_at | timestamptz | First owner overview visit completion |
| main_cube_added_at | timestamptz | First successful main cube save |
| bulk_imported_at | timestamptz | First successful bulk import |
| first_timer_solve_at | timestamptz | First successful persisted timer solve |
| feed_visited_at | timestamptz | Feed checklist step completion via onboarding route |
| clubs_searched_at | timestamptz | First non-empty clubs search completion |
| dismissed_at | timestamptz | When auto-launch was dismissed |
| finished_at | timestamptz | Set once all onboarding steps are complete |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto (trigger) |

**follows** — Social follow relationships
| Column | Type | Notes |
|--------|------|-------|
| follower_id | uuid (FK) | User doing the following |
| following_id | uuid (FK) | User being followed |
| created_at | timestamptz | Auto |
| Unique constraint on (follower_id, following_id) |

### Feature Tables

**likes** — Kudos on feed sessions (Wave 2)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| session_id | uuid (FK) | Session being liked |
| user_id | uuid (FK) | User who liked |
| created_at | timestamptz | Auto |
| Unique constraint on (session_id, user_id) |

**comments** — Comments on feed sessions (Wave 2)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| session_id | uuid (FK) | Session being commented on |
| user_id | uuid (FK) | Commenter |
| content | text | Comment text |
| created_at | timestamptz | Auto |

**notifications** — In-app notifications (Wave 2)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | Who receives the notification |
| type | text | "like", "comment", "follow", "pb", "badge" |
| actor_id | uuid (FK) | Who triggered it (nullable for system notifications) |
| reference_id | uuid | ID of the related session/comment/etc. |
| read | boolean | Default false |
| created_at | timestamptz | Auto |

**goals** — User-set practice goals (Wave 3)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | Goal owner |
| event | text | WCA event code |
| target_avg | numeric | Target average time in seconds |
| target_date | date | Deadline |
| status | text | "active", "achieved", "expired" |
| achieved_at | timestamptz | When goal was achieved (nullable) |
| created_at | timestamptz | Auto |

**challenges** — Community challenges (Wave 3)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| title | text | e.g. "100 Solves This Week" |
| description | text | Details |
| type | text | "solves", "time", "streak", "events" |
| target_value | integer | Number to reach |
| start_date | date | When it starts |
| end_date | date | When it ends |
| created_at | timestamptz | Auto |

**challenge_participants** — Who joined a challenge (Wave 3)
| Column | Type | Notes |
|--------|------|-------|
| challenge_id | uuid (FK) | The challenge |
| user_id | uuid (FK) | The participant |
| progress | integer | Current count toward target |
| joined_at | timestamptz | Auto |

**badges** — Badge/credential definitions (Wave 3)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| name | text | e.g. "World Record Holder", "First 1,000 Solves", "Sponsored Athlete" |
| description | text | What it means |
| icon | text | Icon identifier, emoji, or image path |
| category | text | "competition", "sponsor", "milestone" |
| tier | text | Visual weight: "gold", "silver", "bronze", "standard" |
| criteria_type | text | For auto-award milestones: "solves", "streak", "events", "hours" (null for manual) |
| criteria_value | integer | Threshold for auto-award (null for manual) |
| verification | text | "auto" (milestones), "self" (sponsor), "admin" (competition credentials) |

**user_badges** — Badges earned/claimed by users (Wave 3)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | Who has it |
| badge_id | uuid (FK) | Which badge |
| year | integer | Year achieved (nullable — milestones don't need a year) |
| detail | text | Extra context: sponsor name, event name, country (nullable) |
| is_current | boolean | For records: still holds it? (default false, visually distinct from former) |
| verified | boolean | Admin-approved? (default true for auto/self, false until admin approves for competition) |
| earned_at | timestamptz | When earned/claimed |

**clubs** — Cubing clubs/groups (Wave 4)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| name | text | Club name |
| description | text | About the club |
| avatar_url | text | Club image |
| created_by | uuid (FK) | Club creator |
| created_at | timestamptz | Auto |

**club_members** — Club membership (Wave 4)
| Column | Type | Notes |
|--------|------|-------|
| club_id | uuid (FK) | The club |
| user_id | uuid (FK) | The member |
| role | text | "owner", "admin", "member" |
| joined_at | timestamptz | Auto |

**feedback** — User feedback submissions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | Who submitted |
| category | text | "bug", "feature", "general", "other" |
| message | text | Max 1000 chars |
| page_url | text | Page they submitted from (nullable) |
| created_at | timestamptz | Auto |

**personal_bests** — Manually logged PB records
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | Who owns the PB |
| event | text | WCA event code |
| pb_type | text | "single", "ao5", "ao12", etc. |
| time_seconds | numeric | PB time in decimal seconds |
| date_achieved | date | When the PB was set |
| is_current | boolean | Whether this is the current PB for this event+type |
| notes | text | Optional notes |
| created_at | timestamptz | Auto |

**wca_rankings** — SOR/Kinch leaderboard data (synced weekly from WCA export)
| Column | Type | Notes |
|--------|------|-------|
| wca_id | text (PK) | WCA competitor ID |
| name | text | Competitor name |
| country_id | text | WCA country code |
| continent_id | text | WCA continent code |
| sor_single | integer | Sum of Ranks (single) |
| sor_average | integer | Sum of Ranks (average) |
| kinch_score | numeric | Kinch score |
| updated_at | timestamptz | Last sync time |

**wca_countries** — Reference table for WCA countries/continents
| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | WCA country code |
| name | text | Country name |
| continent_id | text | WCA continent code |

**timer_sessions** — Timer session (one sitting at the timer for one event)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| user_id | uuid (FK) | References profiles(id), CASCADE |
| event | text | WCA event code |
| mode | text | 'normal' or 'comp_sim', default 'normal' |
| status | text | 'active' or 'completed', default 'active' |
| started_at | timestamptz | When user opened the timer |
| ended_at | timestamptz | When session ended (null while active) |
| session_id | uuid (FK) | Links to auto-created sessions row (null until finalized) |
| created_at | timestamptz | Auto |

**solves** — Individual timed solves within a timer session
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Generated |
| timer_session_id | uuid (FK) | References timer_sessions(id), CASCADE |
| user_id | uuid (FK) | References profiles(id), CASCADE (denormalized for RLS) |
| solve_number | integer | 1-based position in session |
| time_ms | integer | Raw time in milliseconds (before penalty) |
| penalty | text | null, '+2', or 'DNF' |
| scramble | text | Scramble notation string |
| event | text | Denormalized from timer_session for query speed |
| comp_sim_group | integer | null in normal mode; group number in comp sim |
| notes | text | Optional per-solve notes |
| solved_at | timestamptz | Exact time this solve happened |
| created_at | timestamptz | Auto |

**sessions** table alteration: Added nullable `timer_session_id` FK to `timer_sessions(id)` — links auto-created session summaries back to their timer session source.

## Routes

```
/                    → Landing page (hero, features, social proof)
/login               → Login page (email + password + Google OAuth)
/signup              → Signup page (first/last/middle name + email + password + Google OAuth)
/practice-stats      → Practice stats (filters, charts, session log) [protected]
/profile             → User's own profile (header, stats, cubes, PBs, WCA results, activity) [protected]
/profile/[handle]    → Public profile for any user [public]
/profile/[handle]/compare → Logged-in head-to-head comparison against that public profile [protected]
/log                 → Log a practice session (form) [protected]
/timer               → Built-in cubing timer [protected]
/feed                → Activity feed (sessions from followed users) [protected]
/getting-started/feed → Onboarding entry route that marks the feed checklist step then redirects into `/feed?tour=feed` [protected]
/discover            → Search and browse cubers [public]
/notifications       → Notification inbox (likes, comments, follows, PBs) [protected]
/leaderboards        → Public leaderboards (fastest averages, most solves, streaks, SOR/Kinch) [public]
/pbs                 → Personal Bests management (log, view history, delete) [protected]
/challenges          → Community challenges (join, track progress, admin creates) [protected]
/clubs               → Browse/search/create clubs, join/leave [protected]
/clubs/[id]          → Club detail page (activity feed, member list, edit/delete) [public]
/wrapped             → Year in Review / annual stats summary [protected]
/admin/badges        → Admin badge approval queue [admin only]
/privacy             → Privacy Policy [public]
/terms               → Terms of Service [public]
```

## Design Source

**v0 repo:** `Brandonius813/speed-cube-hub-visual-design`

### Pages Designed

| Page | v0 File | Key Components |
|------|---------|----------------|
| **Landing** | `app/page.tsx` | Navbar, Hero, Features (3-col grid), SocialProof, Footer |
| **Practice Stats** | `app/practice-stats/page.tsx` | Filters (event badges + date range), StatsCards (3), EventPieChart, DailyBarChart, SessionLog (table/card) |
| **Profile** | `app/profile/page.tsx` | ProfileHeader, ProfileStats, MainCubes, PBGrid, LinksSponsors, RecentActivity (timeline) |
| **Log Session** | `app/log/page.tsx` | SessionForm (date, event, type, solves, time, avg, notes) |

### Style Guide

**Theme:** Dark-first. The design is dark by default with a space/gaming aesthetic.

**Fonts:**
- **Sans-serif:** Inter (body, headings) — CSS var `--font-inter`
- **Monospace:** JetBrains Mono (numbers, stats, times) — CSS var `--font-jetbrains`

**Core Colors (hex):**

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0A0A0F` | Page background (very dark blue-black) |
| `--foreground` | `#F1F1F4` | Primary text (off-white) |
| `--card` | `#141420` | Card backgrounds |
| `--primary` | `#6366F1` | Primary buttons, links, active states (indigo) |
| `--secondary` | `#1E1E2E` | Secondary backgrounds |
| `--muted-foreground` | `#8B8BA3` | Subdued text |
| `--accent` | `#22D3EE` | Highlights, special callouts (cyan) |
| `--destructive` | `#EF4444` | Error/delete states (red) |
| `--border` | `#2A2A3C` | Borders, input outlines |

**Chart Colors:**

| Token | Hex | Color |
|-------|-----|-------|
| `--chart-1` | `#EF4444` | Red |
| `--chart-2` | `#6366F1` | Indigo |
| `--chart-3` | `#F97316` | Orange |
| `--chart-4` | `#22D3EE` | Cyan |
| `--chart-5` | `#A855F7` | Purple |

**Design Patterns:**
- Cards: `border-border/50 bg-card` (subtle borders, dark backgrounds)
- Badges: colored bg at 15% opacity + matching border for event tags
- Monospace font for all numbers/times/stats (`font-mono`)
- Navbar: sticky with `backdrop-blur-xl`
- Hero: radial gradient glow behind headline (primary color, blurred)
- Container max-widths: `max-w-6xl` (dashboard), `max-w-4xl` (profile), `max-w-2xl` (form)
- Tables: desktop = HTML table, mobile = card-based layout
- Activity: timeline-style with vertical dots

**Public Assets:** Favicons (light/dark 32x32 PNGs + SVG), apple-icon.png, placeholder images

## Notes

- Speed Cube Hub replaces brandontruecubing.com (the old personal tracker)
- The founder is non-technical — all communication should be in plain English
- Designs come from v0.dev — preserve the visual intent when implementing
- **Mobile-first is critical.** An iOS app comes later — the mobile web experience must be flawless. See `Rules/mobile-first.md` for specific guidelines.
- Database stores times as decimal seconds (e.g., `10.32`)
- Timezone: Pacific Time (`America/Los_Angeles`), hardcoded in date helpers
- cubing.gg is a complementary platform (Tymon Kolasinski's coaching/courses) — not a competitor
- v0 designs are in `Brandonius813/speed-cube-hub-visual-design` — see "Design Source" section above for full style guide
