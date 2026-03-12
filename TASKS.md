# Speed Cube Hub — Task List

## Rules for This File

- **Completed tasks get ONE line.** Format: `- ✅ T##: Task name`
- **Only open/incomplete tasks get full specs.** Once a task is done, collapse it immediately.
- **Never let this file exceed 300 lines.** If it does, archive older completed sections to git history.
- **Task specs belong in plan files** (`plans/`), not here. This file is for *tracking*, not *spec storage*.

---

## How to Use This File (Parallel Sessions)

1. `git fetch origin main` before starting
2. Create a worktree + branch from `main`: `git worktree add ../speed-cube-hub-<taskname> -b task/<taskname> origin/main`
3. Find a task that is `🔲 Available` with all dependencies `✅ Done`
4. Change status to `🏗️ In Progress`, add your identifier + branch
5. Push the claim to your task branch
6. When done, merge the task branch into `main`, then mark `✅ Done` and tell the user

**Rules:**
- Never do parallel work directly in the shared `main` worktree
- Never start a task whose dependencies aren't all done
- Use `npx tsc --noEmit` to verify TypeScript (avoids `.next/lock` conflicts)

---

## Completed Tasks (Summary)

### Phase 1–4: Bug Fixes, UI Fixes, Dashboard, Profile (T10–T20)
- ✅ T10: Fix login redirect loop
- ✅ T11: Fix WCA OAuth "Unknown Client" error
- ✅ T12: Navbar logo + footer text
- ✅ T13: Dynamic landing page stats
- ✅ T14: Practice activity heatmap
- ✅ T15: Database schema for profile customization
- ✅ T16: Profile edit mode
- ✅ T17: Notable accomplishments section
- ✅ T18: Editable main cubes
- ✅ T19: Editable social links
- ✅ T20: Upcoming competitions

### Phase 5: Social Wave 2 — Engagement (T21–T24)
- ✅ T21: Likes/Kudos on feed sessions
- ✅ T22: Comments on feed sessions
- ✅ T23: Notifications backend
- ✅ T24: Notifications page + navbar badge

### Phase 6: Social Wave 3 — Motivation & Retention (T25–T29)
- ✅ T25: Goals system
- ✅ T26: PB history / progress charts
- ✅ T27: Enhanced streaks
- ✅ T28: Weekly/monthly challenges
- ✅ T29: Badges & credentials system

### Phase 7: Social Wave 4 — Community & Discovery (T30–T33)
- ✅ T30: Public leaderboards
- ✅ T31: Clubs/groups
- ✅ T32: Year in Review / Wrapped
- ✅ T33: Share cards (OG images)

### Phase 8: Built-In Timer (T34–T40, T52)
- ✅ T34: Timer database schema
- ✅ T35: Scramble generation
- ✅ T36: Timer server actions
- ✅ T37: Timer averages + inspection utilities
- ✅ T38: Core timer UI
- ✅ T39: Inspection timer + comp sim mode
- ✅ T40: Session finalization + summary
- ✅ T52: WCA-standard random-state scrambles

### Phase 9: Security & Performance Hardening (T41–T51)
- ✅ T41: Fix open redirect in OAuth callback
- ✅ T42: Add middleware for route protection
- ✅ T43: Make createNotification/checkAndAwardMilestones internal
- ✅ T44: Add Zod input validation
- ✅ T45: Sanitize PostgREST search filter
- ✅ T46: Reduce admin client overuse / fix RLS
- ✅ T47: Fix leaderboards — DB aggregation
- ✅ T48: Fix landing page stats — DB aggregation
- ✅ T49: Fix navbar — reduce server calls
- ✅ T50: Fix dashboard — deduplicate fetches
- ✅ T51: Replace select("*") with explicit columns (reverted 3x — see PRD note)

### Phase 10: QoL Polish (T53–T56)
- ✅ T53: Navbar active tab + notification popup
- ✅ T54: Practice stats page overhaul
- ✅ T55: PB type fix — add Ao5 for 6x6/7x7
- ✅ T56: Time distribution + time trend charts

### Phase 11: Profile Rework — 6-Tab Layout (T57–T63)
- ✅ T57: Schema change — main_events (up to 3)
- ✅ T58: Server action — getPBsByUserId
- ✅ T59: SessionLog readOnly prop
- ✅ T60: Profile sidebar component
- ✅ T61: Profile tabs component
- ✅ T62: Tab content components (6 tabs including Comp Sim)
- ✅ T63: Rewrite profile content components

### Phase 12: Performance Optimization (T64–T82)
- ✅ T64: Batch like counts RPC
- ✅ T65: Batch comment counts RPC
- ✅ T66: Fix club member counting
- ✅ T67: Fix challenge participant counting
- ✅ T68: Add limit to feed follows query
- ✅ T69: Add limits to unbounded queries
- ✅ T73: Fix N+1 in personal bests
- ✅ T74: Fix N+1 in badge claims / club mutations
- ✅ T75: Parallelize leaderboards WCA query
- ✅ T76: Split import-pbs-modal.tsx
- ✅ T77: Timer memoization + split
- ✅ T78: React.memo/useMemo for feed & leaderboards
- ✅ T79: Fix session log dual DOM rendering
- ✅ T80: Add ISR revalidation to homepage
- ✅ T81: Fix count query pattern
- ✅ T82: Add Next.js image optimization config

### Phase 13: QoL Improvements (T83–T95)
- ✅ T83: Clean up streak display
- ✅ T84: Remove search notes from practice stats
- ✅ T85: Make stats cards dynamic based on filters
- ✅ T86: Add solve counts to graph tooltips
- ✅ T87: Session log pagination
- ✅ T88: Profile overview — remove stat cards, add heatmap
- ✅ T89: Stats tab — remove duplicate tracker + add filters
- ✅ T90: Tab renames + PB history
- ✅ T91: Replace location with country dropdown + US state
- ✅ T92–T95: Additional QoL fixes

### Phase 14: Named Session Management (T96–T105)
- ✅ T96–T105: Full named session system (DB, types, server actions, UI, integration)

### Phase 15: Core UX — csTimer Parity (T106–T115)
- ✅ T106–T115: Stats panel, customizable indicators, solve/stat detail modals, time list, keyboard shortcuts, undo, notes, scramble image, cross solver + orientation guidance

### Phase 16: Training Scrambles (T116–T123)
- ✅ T116–T123: CFOP/advanced/Roux/Mehta/subset/2x2/4x4+/case filtering/per-case stats

### Phase 17: Timer Modes & Advanced Input (T124–T128)
- ✅ T124–T128: Multi-phase timing, hold duration, display customization, mobile swipes, manual scramble

### Phase 18: Session Data Features (T129–T133)
- ✅ T129–T133: Session merge/split, cross-session stats, daily stats, export, import

### Phase 19: Advanced Tools (T134–T138)
- ✅ T134–T138: Batch scramble generator, metronome, shared scramble seed, additional solvers, BLD helper

### Phase 20: Non-WCA Puzzles & Relays (T139–T143)
- ✅ T139–T143: Big cubes, non-WCA puzzles, relay scrambles, event training variants

### Phase 21: Hardware Integration (T144–T146)
- ✅ T144–T146: Virtual cube, Bluetooth smart cube, Stackmat timer

### Phase 22: Online & Social Timer (T147–T148)
- ✅ T147–T148: Online battle mode, scramble animation

### Phase 23: Polish & Display (T149–T152)
- ✅ T149–T152: Hide elements during timing, scramble display options, batch delete, auto-backup

### Phase 24: Timer Multi-Pane Workspace (T153)
- ✅ T153: Replace single bottom pane with modular 4-pane workspace (desktop fixed slots: top-right/bottom-right/bottom-middle/bottom-left + mobile drawer + local/account layout sync)

### Phase 25: Dev Reliability (T154)
- ✅ T154: Persistent localhost workflow (`dev:up/dev:status/dev:down`) + development HTTPS/HSTS guardrails

### Phase 26: Timer QoL Polish (T155)
- ✅ T155: Timer shortcuts, text sizing and pane size controls, solve detail modal, session-vs-all-time stats, and pane reopen memory
- ✅ T156: Comp Sim / GAN flow hardening (exclusive mode guard, entry modal, standalone auto-save timing)

### Phase 27: Profile Comparison (T157)
- ✅ T157: Profile head-to-head comparison

### Phase 28: Import Preview Parity (T158)
- ✅ T158: Shared raw-solve import review parity for csTimer, CubeTime, and future timer parsers

### Phase 29: Social Preview Foundation (T159)
- ✅ T159: Social preview foundation (mixed feed, standalone posts, richer session/PB cards, clubs feed, unified discover tabs, favorites/mutes, preview seed + hosted preview reset flow)

### Phase 30: New User Onboarding (T160)
- ✅ T160: Checklist onboarding + guided tours
- ✅ T162: Add Comp Sim step to onboarding checklist flow

### Phase 31: Comp Sim Upgrade (T161)
- ✅ T161: Comp Sim round limits/cutoffs, real audio pack + previews, true result tracking, and Stats-tab Comp Sim sub-view

### Phase 32: Monetization (T163)
- ✅ T163: AdSense manual rollout infrastructure + homepage/feed/leaderboards/profile placements

### Phase 33: Timer Scalability Foundation (T164)
- ✅ T164: Million-solve timer analytics + recent-history loading foundation

---

## Open / Remaining Items

These items are tracked in the PRD under "Remaining Security Items (Manual)" and incomplete roadmap checkboxes. Current parallel layout is pre-claimed below.

- 🏗️ In Progress — Activate unused profile components: `UpcomingCompetitions`, `PBProgressChart` (branch: `task/activate-profile-components`, worktree: `../speed-cube-hub-agent-profile`)
- 🏗️ In Progress — Rate limiting on API routes (`/api/scramble`, `/api/og`) — requires Upstash Redis or similar (branch: `task/rate-limit-api-routes`, worktree: `../speed-cube-hub-agent-ratelimit`)
- 🏗️ In Progress — Challenges RLS policy — restrict INSERT to admin users at DB level (branch: `task/challenges-rls-admin-insert`, worktree: `../speed-cube-hub-agent-rls`)

## Native Platform Program (Planning Complete)

- 🔲 Planned — Phase 0: native readiness audit, shared contract standards, schema audit, compliance audit, and release-ops plan (see `plans/native-platform-migration.md` and `plans/native-platform-agent-workstreams.md`)
- 🔲 Planned — Phase 1: extract shared backend contracts for auth/profile, practice/PBs, social/feed, timer, notifications, and purchases
- 🔲 Planned — Phase 2: migrate the website onto shared backend contracts without regressing current UX
- 🔲 Planned — Phase 3: ship native iPhone/iPad app foundations and core product flows
- 🔲 Planned — Phase 4: add app-store billing, push, moderation/reporting surfaces, and release hardening
- 🔲 Planned — Phase 5: ship native Android app using the same backend platform
- 🔲 Planned — Phase 6: add native macOS target after Apple-side architecture is stable

---
