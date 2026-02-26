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
- **Server + Client component pattern:** `page.tsx` (server) fetches data, `*-content.tsx` (client) handles interactivity.
- **Server actions** for mutations and data fetching. Client Supabase for auth checks only.
- **React Compiler** enabled for automatic memoization.

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
- [x] Badges & Credentials — a dedicated section on every profile showing earned badges. Three categories:
  - **Competition credentials** (admin-verified): World Record Holder, Continental Record Holder, National Record Holder, World Champion, Continental Champion, National Champion, World Finalist, National Finalist. Each badge is dated by year. Current record holders get a prominent gold/highlighted badge; former holders get a visually distinct muted version.
  - **Sponsor badge** (self-reported): If a user is sponsored, a visually impressive badge displays their sponsor name prominently. No admin approval needed.
  - **Practice milestones** (auto-awarded): "First 1,000 Solves", "7-Day Streak", "30-Day Streak", "Practiced All 17 Events", "100 Hours Practiced", etc. Awarded automatically when thresholds are met. Future: badges for algorithm sets mastered, practice hour milestones, and more.

### Social Wave 4 — Community & Discovery
- [x] Public Leaderboards (fastest averages, most solves, longest streaks, most practice time — global + friends-only views)
- [x] SOR & Kinch Rank Leaderboards (Sum of Ranks + Kinch scores for ALL WCA competitors globally, sourced from WCA database export synced weekly via GitHub Action; region filtering by world/continent/country; single/average toggle; "Find Me" for linked WCA IDs; SOR rank and Kinch score on user profiles)
- [x] Clubs/Groups (cubing teams, coaching groups, regional clubs — shared feeds and member lists)
- [x] Year in Review / Wrapped (annual stats summary a la Spotify Wrapped — total solves, hours, PB improvements, most-practiced event)
- [x] Share Cards (auto-generated shareable images when you hit a PB or finish a big session — post to Instagram/Discord/X) -- Built OG image API route using @vercel/og, share button on feed items and profile PBs with Web Share API (mobile) + clipboard fallback (desktop)
- [x] Personal Bests Page — Dedicated `/pbs` page for manually logging PB history (Single, Ao5, Ao12, etc. per event). Card grid grouped by event, "Log New PB" modal, PB history modal with Recharts progression chart, smart is_current auto-promotion, delete with next-fastest promotion. Uses `personal_bests` table with RLS.
- [x] Feedback System — "Send Feedback" button in footer opens a modal with category picker (Bug Report, Feature Request, General Feedback, Other) and message box. Requires login to submit, saves to `feedback` table. No spam risk since auth-gated.

### Security & Performance Hardening (Phase 9)
- [x] Fix open redirect in Google OAuth callback (T41)
- [x] Add middleware for route protection + session refresh (T42)
- [x] Make createNotification/checkAndAwardMilestones internal helpers (T43)
- [x] Add Zod input validation to session/PB server actions (T44)
- [x] Sanitize PostgREST search filter in searchProfiles (T45)
- [ ] Reduce admin client overuse — fix RLS policies (T46)
- [ ] Fix leaderboards — move aggregation to database (T47)
- [ ] Fix landing page stats — use database aggregation (T48)
- [ ] Fix navbar — reduce server calls from 8 to 1 (T49)
- [ ] Fix dashboard — deduplicate session fetches + add limits (T50)
- [ ] Replace select("*") with explicit column lists (T51)

### Profile Rework — 5-Tab Layout with Sidebar (Phase 11)

Rework the profile page from a flat vertical stack into a 5-tab layout with a persistent Skool-style sidebar on desktop. Mobile: full-width swipeable tabs (Clash Royale-style). Desktop: clickable tabs + sticky profile card sidebar on right.

- [ ] Schema: `main_events text[]` (up to 3 main events, replaces single `main_event`)
- [ ] Server action: `getPBsByUserId` (public PB fetch for any user)
- [ ] SessionLog `readOnly` prop (for public profile Stats tab)
- [ ] Profile sidebar component (Skool-style card: avatar, name, main events, bio, meta, stats, follow, social links)
- [ ] Profile tabs component (tab bar + swipe detection + URL integration)
- [ ] 5 tab content components:
  - **PBs** — read-only PB grid for visitors, full CRUD for owner, PB progression chart
  - **Stats** — practice heatmap, streak, charts, session log
  - **Overview** (default) — profile header (mobile), stat cards, badges, recent activity
  - **Cubes** — main cubes grid (existing component)
  - **Official** — WCA results (lazy-loaded), allrounding, accomplishments, upcoming competitions
- [ ] Rewrite profile content components with grid + tabs layout
- [ ] Activate unused components: `UpcomingCompetitions`, `PBProgressChart` (on profile)

### Coaching Platform (Future)
- Coach role with student management
- Assign homework (e.g., "do 100 solves of 3x3 this week" or "practice F2L for 30 min daily")
- Review student practice sessions and stats
- Coaching notes per student (stored after each session/call)
- Potential integration with cubing.gg's existing coaching workflows

### Built-In Timer — V1 (In Progress)

Cloud-synced cubing timer at `/timer` — a modern, beautiful alternative to csTimer, deeply integrated with Speed Cube Hub profiles.

**V1 Features:**
- Core timer with spacebar start/stop (desktop) and tap start/stop (mobile)
- ✅ NxN scrambles (2x2–7x7) via `cubing` library — WCA-standard random-state for all events via server-side API route (`/api/scramble`), with random-move fallback
- Scrollable solve list with times, penalties (+2/DNF), delete, per-solve notes
- Running averages: Ao5, Ao12, Mo100, BPA, WPA, best single, best Ao5, session mean
- WCA inspection timer: 15-second countdown with voice warnings at 8s and 12s, toggleable
- Competition simulation mode: solves grouped in Ao5 sets (trimmed mean)
- Session auto-logging: when ended, auto-creates a `sessions` row for feed/stats/leaderboards
- Adaptive layout: full-screen on mobile, dashboard (timer + stats sidebar) on desktop
- Event selector for all 17 WCA events

**Future Timer Features (not in V1):**
- GAN Timer / Rubik's Timer Bluetooth support
- Smart cube support (Moyu, GAN) with auto-breakdown
- StackMat support on Mac
- Typed time input (enter times like a stackmat display)
- Scramble visualization / draw scramble overlay
- Reconstructions tied to scramble/solve (like cube.db)
- Streamer view (clean OBS-friendly layout with stats + scramble + timer)
- 1-click share a PB or great session (screenshot + post to feed)
- Share great sessions as visual cards (Spotify Wrapped style)
- Light mode, dark mode, custom color schemes
- Verbal inspection warnings
- Settings search
- Dope keyboard shortcuts (customizable)
- Session break/resume within a session
- Toggle between today's session vs all-time view (like csTimer)
- Stats/draw scramble overlays (like csTimer panels)

**NOT planned:** Native alg training in the timer (other tools do this better; will revisit long-term)

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
/log                 → Log a practice session (form) [protected]
/timer               → Built-in cubing timer [protected]
/feed                → Activity feed (sessions from followed users) [protected]
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

**v0 repo:** `Brandonius813/speed-cube-hub-visual-design` (cloned to `/tmp/speed-cube-hub-visual-design/`)

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

## Completed Features

- [x] Project scaffolding (Next.js, Supabase clients, Shadcn/ui, folder structure)
- [x] Shadcn UI components installed (button, card, badge, avatar, input, label, select, textarea)
- [x] Shared layout components (Navbar + Footer)
- [x] Database schema SQL migration (profiles + sessions tables with RLS)
- [x] TypeScript types (Profile, Session) and constants (WCA_EVENTS, PRACTICE_TYPES)
- [x] Landing page (Hero with gradient glow, Features with visual mockups, SocialProof stats)
- [x] Auth system (Login, Signup, Logout server actions + pages + middleware + auth-aware Navbar)
- [x] Log Session page (form with validation, createSession server action, success state)
- [x] Practice Stats page (filters, stats cards, event pie chart, daily bar chart, session log table/cards)
- [x] Profile page (header, stats, main cubes, PB grid, links/sponsors, recent activity timeline)
- [x] WCA API integration (fetch official results, display on profile, link/unlink WCA ID)
- [x] WCA OAuth verification (users sign in through WCA to prove they own their WCA ID)
- [x] Google sign-in (OAuth on both signup and login pages, auto profile creation)
- [x] Signup with first name / last name / middle name (optional) instead of display name
- [x] Mobile optimization (44px touch targets, no hover-only interactions, mobile nav icons, overflow protection)
- [x] Vercel deployment (production at speedcubehub.com, preview on dev pushes)
- [x] Login redirect loop fix (excluded auth routes from middleware, carry cookies on redirect)
- [x] Dynamic landing page stats (real user/session/hours/solves counts from database)
- [x] Practice activity heatmap on dashboard (GitHub-style 52-week grid)
- [x] Profile customization schema (cubes, links, accomplishments JSONB columns)
- [x] Profile edit mode (edit display name, bio, avatar via modal)
- [x] Editable main cubes section on profile (add/edit/delete from cubes JSONB)
- [x] Notable accomplishments section on profile (add/edit/delete milestones)
- [x] Editable social links on profile (YouTube, IG, TikTok, X, Discord, WCA, website)
- [x] Avatar file upload (replaces URL input, uploads to Supabase Storage avatars bucket)
- [x] Social Wave 1: Public profiles at /profile/[handle] (viewable by anyone, reuses existing profile components)
- [x] Social Wave 1: Follow/unfollow system (follows table, follow button, follower/following counts on profiles)
- [x] Social Wave 1: Activity feed at /feed (sessions from followed users, cursor-based pagination)
- [x] Social Wave 1: Discover page at /discover (search cubers by name/handle, browse all users)
- [x] Social Wave 1: Updated navbar with Feed and Discover links
- [x] Social Wave 1: Middleware updated (public profiles accessible to everyone, feed protected)
- [x] Social Wave 2: Likes/Kudos on feed sessions (like button with optimistic UI, like count per session)
- [x] Social Wave 2: Comments on feed sessions (expandable comment section, add/delete comments, lazy-loaded)
- [x] Social Wave 3: Goals system on dashboard (create/edit/delete goals, progress bars, auto-achievement, auto-expiry)
- [x] Social Wave 4: Public Leaderboards at /leaderboards (4 categories: fastest avg, most solves, longest streak, most practice time; event selector for fastest avg; friends-only toggle; top-3 medal styling; mobile cards + desktop table)
- [x] Social Wave 3: Weekly/Monthly Challenges at /challenges (admin creates challenges, users join/leave, real-time progress from sessions, progress bars, active/past sections)
- [x] Social Wave 3: Badges & Credentials on profiles (competition credentials with admin approval, sponsor badges self-reported, practice milestones auto-awarded after session creation)
- [x] Social Wave 2: Notifications page at /notifications (notification cards with actor avatar, type-specific messages, relative timestamps, mark-as-read, mark-all-as-read, unread badge in navbar bell icon)
- [x] SOR & Kinch Rank Leaderboards: WCA data import via weekly GitHub Action sync script (`scripts/sync-wca-rankings.mjs`), `wca_rankings` table (~200k rows), `wca_countries` reference table, SOR/Kinch tabs on /leaderboards with region filter (world/continent/country) + single/average toggle, "Find Me" for WCA-linked users, SOR rank + Kinch score on profile stats. WCA callback also saves `country_id` to profiles.

## Notes

- Speed Cube Hub replaces brandontruecubing.com (the old personal tracker)
- The founder is non-technical — all communication should be in plain English
- Designs come from v0.dev — preserve the visual intent when implementing
- **Mobile-first is critical.** An iOS app comes later — the mobile web experience must be flawless. See `.claude/Rules/mobile-first.md` for specific guidelines.
- Database stores times as decimal seconds (e.g., `10.32`)
- Timezone: Pacific Time (`America/Los_Angeles`), hardcoded in date helpers
- cubing.gg is a complementary platform (Tymon Kolasinski's coaching/courses) — not a competitor
- v0 designs are in `Brandonius813/speed-cube-hub-visual-design` — see "Design Source" section above for full style guide
