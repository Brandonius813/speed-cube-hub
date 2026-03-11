# Product Roadmap Refresh

Date: March 11, 2026
Status: Updated to reflect the merged social preview foundation, profile comparison, shared import-review parity, native-platform planning, and the active onboarding checklist/tours branch.

## What Already Exists

These areas are no longer planning gaps:

- Social preview foundation is merged on `main`.
  - Mixed feed entries (sessions + posts)
  - Explore / Following / Clubs feed tabs
  - Club-scoped posts and pins
  - Discover tabs across people, posts, clubs, and challenges
  - Favorites and mutes
- Profile comparison is merged.
  - `/profile/[handle]/compare`
- Shared import review parity is merged.
  - csTimer, CubeTime, and Twisty Timer now share one preview/review path
- Native-platform planning exists.
  - `plans/native-platform-migration.md`
  - `plans/native-platform-agent-workstreams.md`
- Onboarding already has real implementation shape in the active branch.
  - Checklist data model in `src/lib/onboarding.ts`
  - Server actions in `src/lib/actions/onboarding.ts`
  - Checklist UI in `src/components/onboarding/getting-started-card.tsx`
  - Tour overlay in `src/components/onboarding/onboarding-tour.tsx`
  - Feed handoff route in `src/app/getting-started/feed/page.tsx`

## What Still Needs To Be Framed

The biggest remaining planning gap is not "whether onboarding exists." It is how onboarding should behave end-to-end now that the product is much larger.

### 1. Onboarding entry logic

Still needs a firm product decision:

- What happens immediately after signup?
- What happens immediately after login for a brand-new user vs returning user?
- Should onboarding always begin from `/profile`, or should it branch by user intent?

Recommended direction:

- Treat onboarding as intent-based, not one-size-fits-all.
- Support three starting paths:
  - `Import-first` for users arriving from csTimer / CubeTime
  - `Timer-first` for users who just want to solve immediately
  - `Social-first` for users exploring feed / clubs / discover

### 2. Onboarding success criteria

The active branch tracks six useful steps, but the product still needs a definition for what "activated" means.

Current checklist shape:

- view profile
- add main cube
- import data
- save first timer solve
- visit feed
- search clubs

What is still missing:

- required vs optional steps
- completion threshold for "onboarding complete"
- whether imported history should skip or auto-complete some steps
- whether social steps should include `follow someone`, `join a club`, or `create a post`

Recommended direction:

- Keep `profile viewed`, `main cube added`, and one of `bulk imported` or `first timer solve` as the activation core.
- Keep feed/clubs as discovery steps, not blockers.

### 3. Social bootstrap inside onboarding

The new social product is much richer than the old one, so onboarding should not stop at "visit the feed."

Still needs framing:

- should new users get suggested follows immediately?
- should they be nudged to favorite a few people so the Following feed is not empty?
- should club join/search be part of setup or just discovery?
- should the first post composer be part of onboarding or delayed?

Recommended direction:

- Add a lightweight social bootstrap after the activation core:
  - follow 3-5 suggested cubers
  - optionally join 1 club
  - do not require creating a first post

### 4. Recovery and resume behavior

The branch already has dismiss / replay concepts, but the product behavior still needs to be nailed down.

Still needs framing:

- where the checklist lives permanently
- when tours auto-open vs stay quiet
- what happens if a targeted UI element is hidden or moved
- how users resume if they leave mid-tour

Recommended direction:

- Keep the persistent checklist on profile.
- Auto-launch only once after signup.
- After dismissal, use a quiet checklist-only resume path.
- Tours should fail soft and fall back to a centered explainer if a selector is missing.

### 5. Product-level planning gaps beyond onboarding

These are the other meaningful planning gaps after onboarding:

- Monetization v1
  - free tier vs paid tier
  - ad placement strategy after the recent performance cleanup direction
  - subscription entitlement model across web and future native apps
- Trust and safety
  - report / block / moderation flows for posts, comments, clubs, and profiles
- Notification lifecycle
  - what is in-app only vs email vs future push
- Coaching product definition
  - still future-facing and not yet broken into an execution-ready spec

## Revised Roadmap

This replaces the older assumption that social hardening should start immediately after the feed/challenges/discover rebuild.

### Phase A — Merge low-risk platform work

Goal: land the already-scoped foundation changes that help every route.

Includes:

- performance foundation fixes from the separate Phase 1 branch
- any safe public-route caching improvements
- shell-level CLS cleanup

Why first:

- this is cross-cutting and low-churn
- it helps public pages and future onboarding entry points

### Phase B — Finalize onboarding product spec

Goal: lock the onboarding flow before more implementation drifts.

Must decide:

- entry path branching
- activation core vs optional discovery steps
- social bootstrap expectations
- skip / dismiss / replay behavior
- success metrics

Deliverable:

- one concise onboarding spec that the active onboarding branch can implement against without guessing

### Phase C — Finish and stabilize onboarding implementation

Goal: ship the onboarding branch cleanly across signup, profile, import, timer, feed, and clubs.

Success bar:

- new user can complete onboarding without confusion
- import-first users are not forced through irrelevant timer-first steps
- timer-first users are not forced through heavy social steps before first value
- the checklist is visible, resumable, and not annoying

### Phase D — Social + onboarding hardening

Goal: now that both social preview and onboarding are settled, do the deeper optimization and cleanup pass.

Includes:

- performance roadmap Phase 2, updated to cover onboarding-touched routes too
- leaner feed/discover/challenges reads
- cacheable public viewer boundaries
- cleanup of onboarding-related round trips and tour targeting fragility

Important change from the old plan:

- Do not start this phase right after social preview alone.
- Start it after onboarding merges or the same churn will happen twice.

### Phase E — Product hardening

Goal: close the highest-value product gaps before native feature expansion.

Includes:

- rate limiting
- challenges INSERT RLS fix
- activate remaining profile components
- moderation/reporting design
- notification channel strategy

### Phase F — Monetization and shared contracts

Goal: define what gets paid, what stays free, and how entitlements work across web and native.

Includes:

- paid tier definition
- no-ads entitlement
- server-verified subscription contract
- web/native compatibility for purchases

### Phase G — Native execution

Goal: begin shipping against the native-platform migration plan once the onboarding/social/web foundations are stable.

Dependency:

- onboarding, social, and monetization decisions need to be stable enough that native is not built against moving UX rules

## Recommended Immediate Order

1. Merge the performance foundation branch.
2. Write the final onboarding product spec.
3. Finish the onboarding checklist/tours branch against that spec.
4. Then run the social + onboarding hardening pass.
5. After that, handle monetization and trust/safety framing before deeper native implementation.

## What I Would Not Do Yet

- Do not start the heavy `/timer` / `/profile` / `/import` bundle-slimming pass before onboarding lands.
- Do not lock the native app UX around onboarding until the web onboarding flow is proven.
- Do not over-design coaching yet; it is still less immediate than onboarding, monetization, and moderation.

## Short Answer

If onboarding is the only major thing you feel is still under-framed, the next real planning work is:

1. finalize onboarding entry + branching
2. define activation vs optional discovery steps
3. add social bootstrap rules
4. define monetization / trust-safety next, not later

Everything else is mostly execution and hardening, not missing product framing.
