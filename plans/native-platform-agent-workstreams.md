# Native Platform Agent Workstreams

Companion to `plans/native-platform-migration.md`

This file turns the migration strategy into work that multiple Codex agents can execute in parallel without guessing.

## 1. How To Use This File

1. Read `AGENTS.md`
2. Read `plans/native-platform-migration.md`
3. Read this file
4. Check active claims before touching anything
5. Claim only one workstream at a time
6. Keep work narrowly scoped to the assigned output

## 2. Global Guardrails

- Do not start invasive extraction work in files currently claimed by another active task.
- Finish or merge current high-motion social work before deep feed/social contract extraction in overlapping files.
- Keep the website shipping while the platform boundary is rebuilt.
- Prefer adding shared contracts over duplicating logic in mobile code.
- Every workstream must end with a written handoff note in `AGENT_LOG.md`.

## 3. Sequencing Overview

```text
Wave A: Can start immediately
  N01 N02 N03 N04 N05 N06

Wave B: Starts after audit outputs exist
  N07 N08 N09 N10 N11

Wave C: Starts after first shared contracts stabilize
  N12 N13 N14 N15

Wave D: Starts after Apple foundation and core backend are real
  N16 N17 N18

Wave E: Starts after iOS and Android contract usage is proven
  N19 N20
```

## 4. Workstreams

### N01 — Native Readiness Audit

- Status: `Available now`
- Goal: produce a hard inventory of domains, tables, server actions, API routes, secrets, and external integrations that native clients will depend on.
- Depends on: none
- Can run in parallel with: N02, N03, N04, N05, N06
- Should avoid: editing active feature files unless strictly required for documentation
- Primary outputs:
  - domain inventory document
  - table/schema inventory
  - external integration list
  - "web-only logic" risk list
- Likely files:
  - `plans/`
  - `src/lib/actions/`
  - `src/app/api/`
  - `src/lib/supabase/`
  - `supabase/migrations/`
- Done when:
  - every core domain has a current owner/path
  - hidden backend assumptions are documented
  - blockers for N07-N11 are explicit

### N02 — Shared Contract Standards

- Status: `Available now`
- Goal: define how shared backend contracts are written, versioned, validated, and tested.
- Depends on: none
- Can run in parallel with: N01, N03, N04, N05, N06
- Primary outputs:
  - contract style guide
  - validation/error shape conventions
  - pagination/filter conventions
  - client auth expectations
- Likely files:
  - `plans/`
  - future `src/lib/contracts/`
  - future `docs/api/`
- Done when:
  - agents no longer need to guess whether a behavior belongs in RLS, RPC, Edge Function, or route handler
  - every new contract can follow one documented pattern

### N03 — Schema Audit and T51 Readiness

- Status: `Available now`
- Goal: perform the live Supabase schema audit required before any broad explicit-column work or native contract typing.
- Depends on: none
- Can run in parallel with: N01, N02, N04, N05, N06
- Primary outputs:
  - authoritative table/column inventory
  - mismatches between TypeScript types and live schema
  - risk notes for timer/social/profile tables
- Likely files:
  - `supabase/migrations/`
  - generated docs under `plans/` or `docs/`
- Done when:
  - T51-risk areas are documented
  - native contract typing has a trustworthy schema baseline

### N04 — Monetization and Entitlements Design

- Status: `Available now`
- Goal: define the product catalog, entitlement model, purchase event flow, and server verification architecture.
- Depends on: none
- Can run in parallel with: N01, N02, N03, N05, N06
- Primary outputs:
  - entitlement schema proposal
  - product catalog mapping
  - App Store / Play verification flow
  - renewal/refund/revocation handling plan
- Likely files:
  - `plans/`
  - future `supabase/migrations/`
  - future `src/app/api/`
  - future `supabase/functions/`
- Done when:
  - backend purchase work can be implemented without product ambiguity

### N05 — Moderation and Compliance Gap Audit

- Status: `Available now`
- Goal: inventory what is missing for native store compliance around UGC, privacy, reporting, blocking, and support contact surfaces.
- Depends on: none
- Can run in parallel with: N01, N02, N03, N04, N06
- Primary outputs:
  - moderation gap list
  - privacy/data-safety checklist
  - app review readiness checklist
  - support/contact surface requirements
- Likely files:
  - `plans/`
  - `src/components/feed/`
  - `src/components/shared/`
  - `src/app/(main)/privacy/`
  - `src/app/(main)/terms/`
- Done when:
  - future moderation implementation work is concrete and scoped

### N06 — Environment and Release Operations Plan

- Status: `Available now`
- Goal: define staging/prod separation, test users, secrets handling, release checklists, and review-account requirements.
- Depends on: none
- Can run in parallel with: N01, N02, N03, N04, N05
- Primary outputs:
  - environment matrix
  - secrets matrix
  - release checklist skeletons
  - reviewer/demo account plan
- Likely files:
  - `plans/`
  - `docs/`
  - CI/deployment config if later implemented
- Done when:
  - mobile and web releases have a defined operational path

### N07 — Auth and Account Shared Contracts

- Status: `Blocked by N01-N03`
- Goal: extract shared contracts for auth-adjacent account/profile flows that must work across web and native.
- Depends on: N01, N02, N03
- Can run in parallel with: N08, N09, N10, N11
- Should avoid while active claims exist on overlapping files:
  - `src/lib/actions/profiles.ts`
  - auth/profile files claimed by active social work
- Primary outputs:
  - profile read/update contracts
  - handle availability/uniqueness contract
  - native session/auth notes
  - Apple login integration plan
- Likely files:
  - `src/lib/actions/auth.ts`
  - `src/lib/actions/profiles.ts`
  - `src/lib/supabase/`
  - future contract modules
- Done when:
  - profile/account behaviors have one backend truth
  - web and native can implement against the same semantics

### N08 — Practice Session and PB Shared Contracts

- Status: `Blocked by N01-N03`
- Goal: extract shared CRUD and stats contracts for practice sessions and personal bests.
- Depends on: N01, N02, N03
- Can run in parallel with: N07, N09, N10, N11
- Primary outputs:
  - session CRUD contracts
  - session stats/pagination contract
  - PB CRUD/history contract
  - validation schemas usable across clients
- Likely files:
  - `src/lib/actions/sessions.ts`
  - `src/lib/actions/personal-bests.ts`
  - future contract modules
- Done when:
  - the mobile apps can build dashboard/session/PB features without re-implementing backend rules

### N09 — Social Graph and Feed Shared Contracts

- Status: `Blocked by current social branch + N01-N03`
- Goal: extract shared contracts for feed, follows, likes, comments, clubs, notifications, and related moderation hooks.
- Depends on: N01, N02, N03, current social branch merge or claim release
- Can run in parallel with: N07, N08, N10, N11
- Primary outputs:
  - feed read/write contracts
  - reaction/comment contracts
  - follow/club membership contracts
  - notification read/mark contracts
  - moderation/report entry points
- Likely files:
  - `src/lib/actions/feed.ts`
  - `src/lib/actions/follows.ts`
  - `src/lib/actions/likes.ts`
  - `src/lib/actions/comments.ts`
  - `src/lib/actions/clubs.ts`
  - `src/lib/actions/notifications.ts`
  - `src/lib/types.ts`
- Done when:
  - social behavior no longer depends on web-only action wiring

### N10 — Timer Write Path Extraction

- Status: `Blocked by N01-N03`
- Goal: separate timer write behavior into explicit shared contracts with offline-safe semantics.
- Depends on: N01, N02, N03
- Can run in parallel with: N07, N08, N09, N11
- Primary outputs:
  - create/update/delete solve contracts
  - timer session lifecycle contract
  - idempotent offline queue rules
  - error and retry model
- Likely files:
  - `src/lib/actions/timer.ts`
  - `src/lib/actions/solve-sessions.ts`
  - `src/lib/actions/save-timer-session.ts`
  - `src/lib/actions/solve-session-merge.ts`
  - `src/lib/timer/`
- Done when:
  - native timer clients can write data safely without copying hidden web assumptions

### N11 — Timer Read Path, Stats, and Scramble Service Plan

- Status: `Blocked by N01-N03`
- Goal: decide what timer logic stays client-side, what becomes shared backend contract, and where scramble generation should live per puzzle family.
- Depends on: N01, N02, N03
- Can run in parallel with: N07, N08, N09, N10
- Primary outputs:
  - timer read/stat contract map
  - scramble ownership matrix
  - hardware integration migration notes
  - import/export compatibility plan
- Likely files:
  - `src/lib/actions/timer-stats.ts`
  - `src/app/api/scramble/route.ts`
  - `src/lib/timer/`
  - `src/app/api/import/parse/route.ts`
- Done when:
  - mobile timer scope is broken into implementable chunks

### N12 — Web Migration: Account, Practice, and PB Domains

- Status: `Blocked by N07-N08`
- Goal: migrate the web app to shared contracts for the lower-risk foundational domains first.
- Depends on: N07, N08
- Can run in parallel with: N13, N14
- Primary outputs:
  - web code switched from bespoke server-action paths to shared contracts
  - regression notes
  - compatibility adapters where needed
- Likely files:
  - `src/app/`
  - `src/components/dashboard/`
  - `src/components/pbs/`
  - `src/lib/actions/`
  - future contract modules
- Done when:
  - foundational web flows run on the same backend semantics as native will

### N13 — Web Migration: Social Domains

- Status: `Blocked by N09`
- Goal: move web social features to the shared social contracts once the active social branch stabilizes.
- Depends on: N09
- Can run in parallel with: N12, N14
- Primary outputs:
  - feed/comments/likes/follows/clubs/notifications on shared contracts
  - moderation/reporting hooks wired for web
- Likely files:
  - social/feed components and actions
- Done when:
  - social behavior is no longer web-special

### N14 — Web Migration: Timer Domains

- Status: `Blocked by N10-N11`
- Goal: migrate web timer reads and writes to the shared timer contract architecture without regressing current power-user workflows.
- Depends on: N10, N11
- Can run in parallel with: N12, N13
- Primary outputs:
  - web timer using shared write path
  - stat/scramble compatibility preserved
  - migration notes for native reuse
- Likely files:
  - `src/components/timer/`
  - timer actions and APIs
  - `src/lib/timer/`
- Done when:
  - the timer’s backend behavior is not trapped inside web-only wiring

### N15 — Apple App Foundation

- Status: `Blocked by N02 + initial contract availability`
- Goal: create the Apple app shell and shared Apple-side architecture.
- Depends on: N02, at least one implemented shared contract set
- Can run in parallel with: N12, N13, N14
- Primary outputs:
  - Xcode workspace/project
  - Swift package/module structure
  - networking/auth layer
  - local persistence and queue foundation
  - navigation shell for iPhone/iPad
- Likely files:
  - future `ios/`
  - future Apple shared modules
- Done when:
  - feature teams can implement app screens on top of real foundations

### N16 — iOS/iPad Core Product Flows

- Status: `Blocked by N08, N09, N10, N15`
- Goal: implement the highest-value native flows for public beta.
- Depends on: N08, N09, N10, N15
- Can run in parallel with: N17, N18 once foundations exist
- Primary outputs:
  - auth/account
  - dashboard and session history
  - PBs and profile
  - feed/social basics
  - leaderboards
  - WCA surface
- Likely files:
  - future `ios/`
- Done when:
  - a beta user can log in, practice, socialize, and see synced data across web and app

### N17 — iOS/iPad Timer Advanced Features and Hardware

- Status: `Blocked by N11 + N15`
- Goal: bring the timer toward parity on Apple devices, including advanced timing, hardware, and resilience.
- Depends on: N11, N15
- Can run in parallel with: N16, N18
- Primary outputs:
  - advanced timer modes
  - import/export support
  - scramble parity plan
  - Bluetooth/smart cube support
  - Stackmat/audio handling if supported
- Likely files:
  - future `ios/`
  - possible backend timer/scramble work
- Done when:
  - Apple timer experience is credible for power users, not just casual use

### N18 — Purchases, Push, and Moderation Surfaces

- Status: `Blocked by N04, N05, N06, and initial app foundations`
- Goal: implement the app-store-critical systems that sit around the core product.
- Depends on: N04, N05, N06, N15
- Can run in parallel with: N16, N17
- Primary outputs:
  - purchase/entitlement UI + backend verification
  - push registration + delivery plumbing
  - report/block/contact surfaces
  - privacy/review metadata checklist
- Likely files:
  - backend webhook handlers
  - future `ios/`
  - future `android/`
  - web moderation/admin surfaces as needed
- Done when:
  - store submission blockers are actively solved, not deferred

### N19 — Android Foundation and Core Flows

- Status: `Blocked by shared contracts + N16 lessons`
- Goal: use the already-built backend platform to create the Android app without inventing a second backend.
- Depends on: N08, N09, N10, N11, N18
- Can run in parallel with: N20 once scope is firm
- Primary outputs:
  - Android app shell
  - auth/networking/local queue
  - core product flows
  - Google Play billing/push support
- Likely files:
  - future `android/`
- Done when:
  - Android reaches the same core product bar targeted for iOS

### N20 — macOS Program and Cross-Client Release Ops

- Status: `Blocked by stable Apple app architecture`
- Goal: define and implement the Mac client path plus long-term release coordination across web, iOS, Android, and macOS.
- Depends on: N15, N16, N18
- Can run in parallel with: Android hardening once Apple packages are stable
- Primary outputs:
  - macOS target decision and implementation plan
  - shared Apple package extraction where useful
  - release train process across all clients
- Likely files:
  - future `ios/`
  - future macOS target
  - release docs
- Done when:
  - macOS is a deliberate platform effort rather than an afterthought

## 5. Immediate Recommended Agent Swarm

If multiple agents need useful work **right now**, assign them in this order:

1. `N01` Native Readiness Audit
2. `N02` Shared Contract Standards
3. `N03` Schema Audit and T51 Readiness
4. `N04` Monetization and Entitlements Design
5. `N05` Moderation and Compliance Gap Audit
6. `N06` Environment and Release Operations Plan

Reason:

- those workstreams do not require invasive edits in the most actively changing product files
- they reduce guesswork for every later implementation lane
- they are safe to run while the social/feed branch is still active

## 6. Handoff Requirements Per Workstream

Every agent finishing a workstream must leave:

- what changed
- what remains
- blockers
- exact files created or edited
- checks run
- any follow-up workstream IDs affected

Write that handoff into `AGENT_LOG.md`.
