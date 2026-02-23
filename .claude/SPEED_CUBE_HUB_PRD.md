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

### Stats Dashboard

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

## Future Roadmap (Not MVP — Do Not Build Yet)

### Social Feed
- Auto-posted sessions when a user finishes practice (like Strava activities)
- Manual posts for sharing updates, PBs, competition recaps
- Follow/following system
- Likes and comments
- Motivation and accountability features

### Coaching Platform
- Coach role with student management
- Assign homework (e.g., "do 100 solves of 3x3 this week" or "practice F2L for 30 min daily")
- Review student practice sessions and stats
- Coaching notes per student (stored after each session/call)
- Potential integration with cubing.gg's existing coaching workflows

### Built-In Timer (Longer-Term)
- Competition simulation mode and normal mode
- Cloud save with easy sync
- Stats sync directly to the practice tracker
- Clean mobile controls
- Bluetooth timer integration (e.g., GAN timers, StackMat)
- Trainers and drills (like csTimer's extras), easy to pull up

### Algorithm Learning System (Longer-Term)
- Khan Academy-style structured learning
- Learn OLL, PLL, and other algorithm sets for all events
- Track which alg sets you know fully
- Profile badges showing mastered alg sets
- Built-in upsells for cubing.gg courses

---

## Database Schema

> Document each table here as features are built.

*(No tables created yet)*

## Routes

```
/                    → Landing page (hero, features, social proof)
/login               → Login page (email + password + Google OAuth)
/signup              → Signup page (first/last/middle name + email + password + Google OAuth)
/dashboard           → Practice stats dashboard (filters, charts, session log) [protected]
/profile             → User profile (header, stats, cubes, PBs, WCA results, activity) [protected]
/log                 → Log a practice session (form) [protected]
```

## Design Source

**v0 repo:** `Brandonius813/speed-cube-hub-visual-design` (cloned to `/tmp/speed-cube-hub-visual-design/`)

### Pages Designed

| Page | v0 File | Key Components |
|------|---------|----------------|
| **Landing** | `app/page.tsx` | Navbar, Hero, Features (3-col grid), SocialProof, Footer |
| **Dashboard** | `app/dashboard/page.tsx` | Filters (event badges + date range), StatsCards (3), EventPieChart, DailyBarChart, SessionLog (table/card) |
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
- [x] Dashboard page (filters, stats cards, event pie chart, daily bar chart, session log table/cards)
- [x] Profile page (header, stats, main cubes, PB grid, links/sponsors, recent activity timeline)
- [x] WCA API integration (fetch official results, display on profile, link/unlink WCA ID)
- [x] WCA OAuth verification (users sign in through WCA to prove they own their WCA ID)
- [x] Google sign-in (OAuth on both signup and login pages, auto profile creation)
- [x] Signup with first name / last name / middle name (optional) instead of display name
- [x] Mobile optimization (44px touch targets, no hover-only interactions, mobile nav icons, overflow protection)
- [x] Vercel deployment (production at speedcubehub.com, preview on dev pushes)

## Notes

- Speed Cube Hub replaces brandontruecubing.com (the old personal tracker)
- The founder is non-technical — all communication should be in plain English
- Designs come from v0.dev — preserve the visual intent when implementing
- **Mobile-first is critical.** An iOS app comes later — the mobile web experience must be flawless. See `.claude/Rules/mobile-first.md` for specific guidelines.
- Database stores times as decimal seconds (e.g., `10.32`)
- Timezone: Pacific Time (`America/Los_Angeles`), hardcoded in date helpers
- cubing.gg is a complementary platform (Tymon Kolasinski's coaching/courses) — not a competitor
- v0 designs are in `Brandonius813/speed-cube-hub-visual-design` — see "Design Source" section above for full style guide
