# Speed Cube Hub — Agent Coordination Log

Shared log for parallel Claude Code sessions. Each session appends entries when running `/sync`.

**Newest entries at the bottom.** Managed by the `/sync` skill.

**HARD LIMIT: 20 entries max.** When adding a new entry, count the `### ` headings. If there are more than 20, delete the oldest entries from the TOP until there are exactly 20. Old entries are preserved in git history — do not hesitate to delete them. This file must never exceed ~200 lines.

### 2026-03-11 PT — Split Scramble And Timer Size Settings

**Task:** Separate the shared scramble/timer size control into independent settings
**Status:** Split the old shared `timer-text-size` behavior in `timer-content.tsx` into separate persisted settings for the main scramble text and the main timer readout. The settings menu now shows both `Scramble Size` and `Timer Size`, while the typing input and live timer readout follow the timer size setting. Existing users still fall back to the legacy combined key so their current preference carries over.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed.

### 2026-03-11 PT — Remove Draw Scramble Size Setting

**Task:** Remove the draw-scramble pane size setting and keep the tool at the largest size
**Status:** Deleted the draw-pane size control from the timer settings menu and removed the unused pane scramble size state from `timer-content.tsx`. The draw scramble pane and the legacy scramble-text pane now render at `xl` size by default, so the draw tool always uses the largest rendering without exposing a setting that makes it look worse.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/panes/pane-draw.tsx`, `src/components/timer/panes/pane-scramble-text.tsx`, `src/components/timer/panes/types.ts`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/components/timer/panes/pane-draw.tsx src/components/timer/panes/pane-scramble-text.tsx src/components/timer/panes/types.ts` passed.

### 2026-03-11 01:30 PM EDT — Cross Trainer Orientation Guidance

**Task:** Make the cross trainer tell users how to hold the cube, not just which cross color to solve
**Status:** Extended the shared cross-solver output with canonical bottom/front orientation metadata for every cross color, then updated the shared cross panel to show compact `Bottom` and `Front` chips above the masked move sequence. The same orientation guidance now appears in both the inline scramble cross view and the dedicated Cross Trainer pane without changing timer settings or pane wiring.
**Files touched:** `src/lib/timer/cross-solver.ts`, `src/components/timer/cross-solver-panel.tsx`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/timer/cross-solver.ts src/components/timer/cross-solver-panel.tsx` passed.

---

### 2026-03-11 PT — Fix Profile Daily Charts Hidden Event Series

**Task:** Stop profile daily charts from silently dropping smaller events like 6x6 and make profile stats fetch complete history
**Status:** Replaced the duplicated top-3 chart bucketing logic with shared helpers so the profile `Daily Practice` and `Daily Solves` charts now render every event present in the filtered session set, with centralized label/color fallbacks and zero-free tooltips. Also moved session pagination into a reusable helper and updated `getSessionsByUserId` to fetch all pages instead of capping profile stats at 200 sessions. Added Vitest with helper-level unit coverage for chart grouping/series visibility and multi-page fetch behavior.
**Files touched:** `src/components/dashboard/daily-bar-chart.tsx`, `src/components/dashboard/daily-solves-chart.tsx`, `src/lib/actions/sessions.ts`, `src/lib/helpers/fetch-all-pages.ts`, `src/lib/helpers/session-chart-data.ts`, `src/lib/helpers/fetch-all-pages.test.ts`, `src/lib/helpers/session-chart-data.test.ts`, `package.json`, `package-lock.json`, `vitest.config.ts`, `AGENT_LOG.md`
**Checks:** `npm test` passed. `npx tsc --noEmit` passed. `npx eslint src/components/dashboard/daily-bar-chart.tsx src/components/dashboard/daily-solves-chart.tsx src/lib/actions/sessions.ts src/lib/helpers/fetch-all-pages.ts src/lib/helpers/fetch-all-pages.test.ts src/lib/helpers/session-chart-data.ts src/lib/helpers/session-chart-data.test.ts vitest.config.ts` passed. `npm run lint` still fails due pre-existing unrelated errors in other files.

### 2026-03-11 PT — Timer Average Share Cards

**Task:** Add share-card support for timer averages and means
**Status:** Added a shared stat-window summary helper so average/mean windows reuse one source of truth for trim logic, `DNF` handling, sigma, and distribution bins. Upgraded the timer stat detail modal with richer summary pills, a `Share` action, and a `Distribution` tab for `25+` windows. Extended the existing share modal/card system with a new `average` variant: smaller windows render times-focused cards, `ao25/mo25` can toggle between times and distribution, and `50+` exports stay distribution-only. To avoid the live `timer-content.tsx` claim, the stat detail modal now opens its own average share modal using the current timer event from local storage and the same profile lookup used elsewhere in the timer.
**Files touched:** `src/lib/timer/stat-window-summary.ts`, `src/components/timer/stat-detail-modal.tsx`, `src/components/share/share-card.tsx`, `src/components/share/share-modal.tsx`, `AGENT_LOG.md`
**Checks:** `npx eslint src/lib/timer/stat-window-summary.ts src/components/timer/stat-detail-modal.tsx src/components/share/share-card.tsx src/components/share/share-modal.tsx` passed. `npx tsc --noEmit --pretty false` passed.

### 2026-03-11 10:54 AM PT — Release Preview Branches To Main

**Task:** Promote the six latest preview branches onto `main`
**Status:** Merged `codex/fix-solves-phases-save-failure`, `codex/robust-time-distribution-histogram`, `codex/cross-trainer-orientation-guidance`, `codex/fix-profile-daily-charts`, `codex/comp-sim-gan-hardening`, and `codex/timer-average-share-flow` into one integration branch, resolved the shared `AGENT_LOG.md` merge conflicts, and prepared the result for fast-forwarding onto `main`. Deliberately left `codex/square1-tnoodle-port` out because its files are still actively claimed in another worktree.
**Files touched:** `AGENT_LOG.md`
**Checks:** `npm test` passed. `npx tsc --noEmit --pretty false` passed. `npm run build` passed.

### 2026-03-11 PT — Square-1 TNoodle Port

**Task:** Replace the unsafe Square-1 fallback generator and split renderer path with a single TNoodle-style Square-1 core
**Status:** Ported the Square-1 search/state tables into `src/lib/timer/square1/` and switched normal WCA `sq1` generation to that core everywhere the app uses the shared scramble utilities. The timer worker and `/api/scramble` now generate legal Square-1 random-state scrambles from the same port, and the 2D scramble draw plus scramble animator now render Square-1 from the same legality-checked state model instead of `cubing/twisty` / `cstimer_module` mismatch paths. Verified the reported bad sample throws as invalid, generated and applied 200 new Square-1 scrambles successfully, and confirmed seeded Square-1 sequences remain deterministic for shared-scramble flows.
**Files touched:** `src/lib/timer/square1/index.ts`, `src/lib/timer/square1/search.ts`, `src/lib/timer/square1/state.ts`, `src/lib/timer/square1/tables.ts`, `src/lib/timer/scrambles.ts`, `src/lib/timer/scramble-worker.ts`, `src/app/api/scramble/route.ts`, `src/components/timer/scramble-image.tsx`, `src/components/timer/scramble-animator.tsx`, `AGENT_LOG.md`, `SPEED_CUBE_HUB_PRD.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/timer/square1/tables.ts src/lib/timer/square1/search.ts src/lib/timer/square1/state.ts src/lib/timer/square1/index.ts src/lib/timer/scrambles.ts src/lib/timer/scramble-worker.ts src/app/api/scramble/route.ts src/components/timer/scramble-image.tsx src/components/timer/scramble-animator.tsx` passed. Additional smoke test compiled the Square-1 core to `/tmp`, rejected the reported invalid scramble, applied 200 generated scrambles successfully, confirmed deterministic seeded sequences, and verified SVG output.

---

### 2026-03-11 02:08 PM EDT — Revert Start Session Button Copy

**Task:** Remove the helper message under the timer `Start Session` control and restore the previous button copy
**Status:** Reverted the inactive session CTA in `timer-content.tsx` to the prior single-button state: removed the explanatory line under the button, changed the idle label back to `Start Session`, and restored the saved-state copy to `Session saved! Start another`. Active session controls and Comp Sim behavior were left unchanged.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed. `./node_modules/.bin/tsc --noEmit` passed.

### 2026-03-11 02:25 PM EDT — Phone Web Protection

**Task:** Block phones from desktop-style app routes while leaving public browse pages accessible
**Status:** Added phone-only request gating in the shared Supabase proxy so iPhone/Android phone UAs are redirected to `/mobile-unsupported` before auth checks on blocked routes. Reused the existing protected-route/public-exception logic for app pages, added public tool routes (`/tools/*`, `/battle`) to the phone block list, excluded tablets/crawlers, and created a standalone blocker page with `Go Home` and `View Leaderboards` CTAs plus an optional `from` hint.
**Files touched:** `src/lib/supabase/proxy.ts`, `src/app/mobile-unsupported/page.tsx`, `SPEED_CUBE_HUB_PRD.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/supabase/proxy.ts src/app/mobile-unsupported/page.tsx` passed. UA verification passed: iPhone requests to `/feed`, `/timer`, `/profile`, `/tools/scrambles`, and `/battle` redirect to `/mobile-unsupported`; iPad still follows normal web behavior; blocker screenshots at 390px and 375px showed no horizontal overflow.

---

### 2026-03-11 12:03 PM PT — CubeTime Import Hardening Recovery

**Task:** Recover the stuck `codex/cubetime-import-hardening` branch, fix the solve-review PB regression, and prepare it for release
**Status:** Took over the dirty hardening worktree, kept the existing CubeTime/csTimer precision-preservation changes, and fixed the new import-review bug where unchecked solves still left their derived PB import behind. Parser-provided PBs are now tracked separately from solve-derived PBs, and the solve-derived single PB is rebuilt whenever the included solve set changes so preview counts and imported PBs stay aligned. Added unit coverage for that regression and updated Vitest path alias resolution so import-layer tests can load `@/` modules directly.
**Files touched:** `src/components/import/use-import-chat.ts`, `src/lib/import/normalize.ts`, `src/lib/import/normalize.test.ts`, `src/lib/import/preview.ts`, `src/lib/import/preview.test.ts`, `src/lib/cubetime/parse-cubetime.ts`, `src/lib/cstimer/parse-cstimer.ts`, `src/lib/utils.ts`, `vitest.config.ts`, `AGENT_LOG.md`
**Learnings:** The raw-solve preview already rebuilt session summaries correctly; the stale state was only in the PB list passed to `bulkImportPBs`. The claims helper replaces the task's file list on each call rather than appending to it.
**Blockers:** None.
**Warnings:** `npm run build` still panics inside this worktree because Turbopack rejects the symlinked `node_modules` path outside the worktree root. Use the shared repo root for the final production build verification.

---

### 2026-03-11 03:25 PM EDT — Native Platform Migration Planning Package

**Task:** Create a comprehensive native-platform migration plan that parallel agents can execute against while the current web product keeps shipping
**Status:** Added two canonical planning docs under `plans/`: a master migration strategy (`native-platform-migration.md`) and a parallel execution backlog (`native-platform-agent-workstreams.md`). The plan defines the target platform architecture, sync model, phased delivery order, monetization/entitlement strategy, moderation/compliance requirements, testing/release operations, and a 20-workstream breakdown that agents can claim independently. Updated `AGENTS.md`, `SPEED_CUBE_HUB_PRD.md`, and `TASKS.md` so future sessions automatically discover the native-platform plan.
**Files touched:** `plans/native-platform-migration.md`, `plans/native-platform-agent-workstreams.md`, `AGENTS.md`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `git diff --check` passed.

### 2026-03-11 04:15 PM EDT — Profile Head-to-Head Comparison

**Task:** Add a logged-in compare view so users can stack themselves up against a viewed public profile
**Status:** Added a new `/profile/[handle]/compare` route that requires login and redirects through `/login?next=...` when opened directly while logged out. Public profiles now show a `Compare With Me` button next to follow controls, and the compare view renders side-by-side last-7-day and last-30-day practice windows, all-time event practice totals, current PB head-to-head cards, and faster/slower summaries derived only from mutually logged PBs. Comparison shaping lives in a dedicated `src/lib/profile-comparison.ts` helper with unit coverage so the page stays server-rendered and thin.
**Files touched:** `src/app/(main)/profile/[handle]/compare/page.tsx`, `src/components/profile/compare-profile-button.tsx`, `src/components/profile/profile-comparison-content.tsx`, `src/components/profile/public-profile-content.tsx`, `src/lib/profile-comparison.ts`, `src/lib/profile-comparison.test.ts`, `AGENTS.md`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/app/'(main)'/profile/'[handle]'/compare/page.tsx src/components/profile/compare-profile-button.tsx src/components/profile/profile-comparison-content.tsx src/components/profile/public-profile-content.tsx src/lib/profile-comparison.ts src/lib/profile-comparison.test.ts` passed. `./node_modules/.bin/vitest run src/lib/profile-comparison.test.ts` passed.

### 2026-03-11 04:36 PM EDT — Shared Timer Import Review Parity

**Task:** Make csTimer imports get the same suspicious-solve review and rolling preview stats as CubeTime, and make that shared path apply to future timer parsers
**Status:** Promoted raw-solve preview metadata into the shared import parser contract so solve-based timers now feed one live importer path instead of parser-specific branches. The `/import` chat flow now reads preview data uniformly for csTimer, CubeTime, and Twisty Timer, which means csTimer gets the same pre-import summary cards and solve review flow as CubeTime: best single, current/best Ao5, Ao12, Ao100, plus flagged outlier toggles that immediately rebuild the session summaries. Added parser coverage to prove csTimer/CubeTime/Twisty Timer all expose the shared preview payload and that the existing preview stats/outlier tests still pass.
**Files touched:** `src/lib/import/types.ts`, `src/lib/import/parsers.ts`, `src/components/import/use-import-chat.ts`, `src/lib/import/parsers.test.ts`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/vitest run src/lib/import/parsers.test.ts src/lib/import/preview.test.ts` passed. `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/import/types.ts src/lib/import/parsers.ts src/components/import/use-import-chat.ts src/lib/import/parsers.test.ts src/lib/import/preview.test.ts` passed.

### 2026-03-11 03:34 PM EDT — Social Preview Foundation

**Task:** Build the feed/discovery rework foundation and make it previewable locally and on the hosted dev project
**Status:** Added the new social data/model foundation for mixed feed entries: first-class posts, post media, favorite follows, muted users, one-level threaded comments, challenge scope, club visibility, club pinning, club-scoped posts, and post-image storage migrations. Reworked the feed into `Explore`, `Following`, and `Clubs`, moved compose into a top-right action, upgraded session recap and PB cards, added drag-and-drop image upload, added club posting/pinning flows, and removed the old events surface from Discover. The hosted Supabase preview project was repaired by applying migrations `027`-`029` directly, reseeding preview data successfully, and wiring shell access so future agent sessions inherit both `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`.
**Files touched:** `scripts/seed-social-preview.mjs`, `supabase/migrations/026_social_preview_foundation.sql`, `supabase/migrations/027_club_feed_pins.sql`, `supabase/migrations/028_post_images_storage.sql`, `supabase/migrations/029_club_scoped_posts.sql`, `src/app/(main)/discover/page.tsx`, `src/app/(main)/feed/page.tsx`, `src/app/(main)/clubs/[id]/page.tsx`, `src/components/discover/discover-content.tsx`, `src/components/feed/feed-composer.tsx`, `src/components/feed/feed-content.tsx`, `src/components/feed/feed-entry-card.tsx`, `src/components/clubs/club-detail-content.tsx`, `src/components/clubs/create-club-modal.tsx`, `src/components/clubs/edit-club-modal.tsx`, `src/components/shared/navbar.tsx`, `src/lib/actions/clubs.ts`, `src/lib/actions/club-mutations.ts`, `src/lib/actions/feed.ts`, `src/lib/actions/posts.ts`, `src/lib/social-preview/mock-data.ts`, `src/lib/types.ts`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. Remote verification passed for preview users, club-scoped posts, pinned clubs, and `post-images` bucket creation. `npm run preview:reseed` completed successfully against the hosted preview project.

### 2026-03-11 05:42 PM EDT — New User Onboarding Checklist + Guided Tours

**Task:** Build the first-time onboarding system so new accounts land on profile overview, see a calm checklist, and only get guided tours when they choose the related feature area
**Status:** Added a private `user_onboarding` table with user-only RLS, signup provisioning, shared onboarding helpers/actions, and a reusable spotlight tour overlay. New users now default to `/profile`, get an owner-only Getting Started checklist on profile overview, and can launch guided walkthroughs for profile overview, main cubes, bulk import, timer basics, clubs search, and feed discovery. Checklist steps only complete on real successful actions: saving cubes, finishing a bulk import, persisting a solve, entering feed through the onboarding route, and running a non-empty clubs search. Also fixed the profile tab/import tab state to follow the URL so same-route onboarding links cannot desync the visible UI from the tour target.
**Files touched:** `supabase/migrations/030_create_user_onboarding.sql`, `src/app/(main)/profile/page.tsx`, `src/app/getting-started/feed/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/components/clubs/clubs-content.tsx`, `src/components/feed/feed-content.tsx`, `src/components/import/import-drop-zone.tsx`, `src/components/import/import-page-content.tsx`, `src/components/import/use-import-chat.ts`, `src/components/onboarding/onboarding-tour.tsx`, `src/components/onboarding/getting-started-card.tsx`, `src/components/profile/main-cubes.tsx`, `src/components/profile/profile-content.tsx`, `src/components/profile/profile-tabs.tsx`, `src/components/profile/public-profile-content.tsx`, `src/components/profile/tab-overview.tsx`, `src/components/timer/timer-content.tsx`, `src/lib/actions/auth.ts`, `src/lib/actions/onboarding.ts`, `src/lib/actions/profiles.ts`, `src/lib/actions/timer.ts`, `src/lib/auth/next-path.ts`, `src/lib/auth/next-path.test.ts`, `src/lib/onboarding.ts`, `src/lib/onboarding.test.ts`, `src/lib/types.ts`, `AGENTS.md`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `npm test` passed. `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/onboarding/onboarding-tour.tsx src/components/import/import-page-content.tsx src/components/profile/main-cubes.tsx src/components/profile/profile-content.tsx src/components/profile/public-profile-content.tsx src/components/profile/profile-tabs.tsx src/components/clubs/clubs-content.tsx src/components/feed/feed-content.tsx src/components/timer/timer-content.tsx` passed.

### 2026-03-12 06:59 AM EDT — Comp Sim Upgrade

**Task:** Turn Competition Simulator into a first-class timer flow with dedicated profile tracking
**Status:** Rebuilt Comp Sim around a shared round-config model so the timer now supports `Single`, `Mo3`, and `Ao5` formats plus cumulative time limits and cutoff after solve 1 or 2. Added a dedicated Comp Sim hero panel on `/timer`, a richer live event shell with pressure warnings and result comparisons, and a procedural crowd mixer with 5 ambience scenes plus a 20-variant reaction library. Session saves now persist true Comp Sim metadata on `sessions`, including format/result/scene/intensity/time-limit/cutoff outcome fields, with a Supabase migration that also backfills legacy Ao5 rows. Profiles now expose a public `Comp Sim` tab with KPI cards, result trend, filters, comparison against normal solve sessions, and separate attempt history instead of burying Comp Sim inside general stats.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/comp-sim-hero.tsx`, `src/components/timer/comp-sim-settings-panel.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-screens.tsx`, `src/components/timer/use-comp-sim.ts`, `src/components/profile/profile-tabs.tsx`, `src/components/profile/profile-content.tsx`, `src/components/profile/public-profile-content.tsx`, `src/components/profile/tab-stats.tsx`, `src/components/profile/tab-comp-sim.tsx`, `src/lib/timer/comp-sim-round.ts`, `src/lib/timer/comp-sim-engine.ts`, `src/lib/timer/comp-sim-audio.ts`, `src/lib/actions/save-timer-session.ts`, `src/lib/actions/sessions.ts`, `src/lib/types.ts`, `supabase/migrations/031_add_comp_sim_session_metadata.sql`, `src/lib/timer/comp-sim.test.ts`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `npm exec eslint -- src/lib/timer/comp-sim.test.ts src/components/timer/use-comp-sim.ts src/components/timer/comp-sim-overlay.tsx src/components/timer/comp-sim-screens.tsx src/components/timer/comp-sim-settings-panel.tsx src/components/timer/comp-sim-hero.tsx src/components/timer/timer-content.tsx src/components/profile/tab-comp-sim.tsx src/components/profile/tab-stats.tsx src/components/profile/profile-content.tsx src/components/profile/public-profile-content.tsx src/components/profile/profile-tabs.tsx src/lib/timer/comp-sim-round.ts src/lib/timer/comp-sim-engine.ts src/lib/timer/comp-sim-audio.ts src/lib/actions/save-timer-session.ts src/lib/actions/sessions.ts src/lib/types.ts` passed. `npm exec tsc -- --noEmit --pretty false` passed. `npm exec vitest run src/lib/timer/comp-sim.test.ts` passed.

### 2026-03-12 07:46 AM EDT — Route Bundle Slimming Pass

**Task:** Keep pushing speed optimization on the heaviest non-social routes after the shared-shell pass
**Status:** Split the bulk import assistant out of the default `/import` and `/log` paths so manual entry no longer ships importer UI on first load, moved profile tab parsing into a shared server/client helper, and changed both owner/public profile pages to fetch full `sessions` data only for `overview` and `stats`. Added lightweight total-practice-minute fetches for non-session tabs, gated PB and official-result reads by active tab, lazy-loaded profile tab bodies and PB modals, and lazy-loaded optional timer overlays/modals so they no longer sit in the timer's initial client entry. Manifest-level build checks showed route entry reductions from `226,201` to `152,826` bytes on `/import`, `214,003` to `140,580` on `/log`, `1,034,357` to `271,142` on `/profile`, and `901,203` to `781,060` on `/timer`.
**Files touched:** `src/lib/profile-tabs.ts`, `src/lib/actions/sessions.ts`, `src/app/(main)/profile/page.tsx`, `src/app/(main)/profile/[handle]/page.tsx`, `src/components/import/import-page-content.tsx`, `src/components/log/log-page-content.tsx`, `src/components/profile/profile-tabs.tsx`, `src/components/profile/profile-content.tsx`, `src/components/profile/public-profile-content.tsx`, `src/components/profile/tab-pbs.tsx`, `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/lib/profile-tabs.ts src/components/profile/profile-tabs.tsx src/components/import/import-page-content.tsx src/components/log/log-page-content.tsx src/lib/actions/sessions.ts src/app/'(main)'/profile/page.tsx src/app/'(main)'/profile/'[handle]'/page.tsx src/components/profile/profile-content.tsx src/components/profile/public-profile-content.tsx src/components/profile/tab-pbs.tsx` passed. `npm run build -- --webpack` passed.

### 2026-03-12 07:47 AM EDT — Comp Sim Real Audio Pack

**Task:** Replace synthetic Comp Sim crowd audio with real sourced sound files and document the asset pack
**Status:** Replaced the procedural Web Audio crowd generator with a real Mixkit-sourced audio pack under `public/audio/comp-sim`, including 5 ambient scene loops, 17 crowd reaction one-shots, and 3 judge/cue clips. The Comp Sim setup preview buttons now audition actual assets, in-round ambient playback uses real loop files, and random reactions/judge cues use layered audio clips instead of browser speech synthesis. Added a source manifest documenting each shipped file, its Mixkit title/ID, source page, asset URL, and license reference. Also updated project tracking text so Comp Sim is described as living under the Stats tab instead of a separate top-level profile tab.
**Files touched:** `public/audio/comp-sim/*`, `src/lib/timer/comp-sim-audio.ts`, `docs/comp-sim-audio-sources.md`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `npm exec eslint -- src/lib/timer/comp-sim-audio.ts src/components/timer/comp-sim-settings-panel.tsx src/components/timer/comp-sim-overlay.tsx src/components/timer/use-comp-sim.ts` passed after linking the worktree to the existing `node_modules`. `npm exec tsc -- --noEmit --pretty false` passed. `npm exec vitest run src/lib/timer/comp-sim.test.ts` passed.

### 2026-03-12 07:54 AM EDT — Comp Sim Audio Autoplay Fix

**Task:** Fix real Comp Sim audio not starting when a round begins
**Status:** Root-caused the silence to browser autoplay gating: the real ambient loop was being started only after async scramble generation, outside the original click gesture. Added an explicit audio-primer path that runs on the Comp Sim preview/start buttons so browsers unlock media playback before the sim initialization completes.
**Files touched:** `src/lib/timer/comp-sim-audio.ts`, `src/components/timer/comp-sim-settings-panel.tsx`, `AGENT_LOG.md`
**Checks:** `npm exec eslint -- src/lib/timer/comp-sim-audio.ts src/components/timer/comp-sim-settings-panel.tsx` passed. `npm exec tsc -- --noEmit --pretty false` passed. `npm exec vitest run src/lib/timer/comp-sim.test.ts` passed.
### 2026-03-12 08:14 AM EDT — Comp Sim Onboarding Checklist Step

**Task:** Add Competition Simulator to the new-user onboarding checklist flow
**Status:** Added a seventh onboarding step and dedicated `comp-sim` spotlight tour so the profile checklist can send users straight into the Comp Sim timer experience. The timer now auto-switches into Comp Sim mode when opened from that onboarding link, the Comp Sim hero exposes stable onboarding targets for the tour, and successful Comp Sim session saves now mark both the regular first-timer step and the new Comp Sim step complete. Added migration `032_add_comp_sim_onboarding_step.sql` to persist/backfill the new onboarding timestamp from existing Comp Sim sessions and keep fully completed rows finished.
**Files touched:** `src/lib/onboarding.ts`, `src/lib/actions/onboarding.ts`, `src/lib/actions/save-timer-session.ts`, `src/lib/types.ts`, `src/lib/onboarding.test.ts`, `src/components/timer/timer-content.tsx`, `src/components/timer/comp-sim-hero.tsx`, `src/components/timer/comp-sim-settings-panel.tsx`, `supabase/migrations/032_add_comp_sim_onboarding_step.sql`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/onboarding.ts src/lib/actions/onboarding.ts src/lib/actions/save-timer-session.ts src/lib/onboarding.test.ts src/lib/types.ts src/components/timer/timer-content.tsx src/components/timer/comp-sim-hero.tsx src/components/timer/comp-sim-settings-panel.tsx` passed. `./node_modules/.bin/vitest run src/lib/onboarding.test.ts` passed.

### 2026-03-12 08:21 AM EDT — Comp Sim Audio Preview/Live Handoff Fix

**Task:** Stop the Comp Sim setup screen from killing live round audio when it unmounts
**Status:** Root-caused the remaining fade-out bug to a shared teardown path: the settings panel unmount called `stopSoundscapePreview()`, and that helper still routed through `stopAllNoise()`, which shut down the live ambient loop as soon as the scramble screen replaced the setup screen. Split the audio runtime into explicit `preview` vs `live` playback ownership so preview cleanup only stops preview-owned playback, while live rounds remain active until cancel/exit/round-complete. Added focused mocked-audio Vitest coverage to lock the handoff behavior in place.
**Files touched:** `src/lib/timer/comp-sim-audio.ts`, `src/lib/timer/comp-sim-audio.test.ts`, `AGENT_LOG.md`
**Checks:** `npm exec vitest run src/lib/timer/comp-sim-audio.test.ts src/lib/timer/comp-sim.test.ts` passed. `npm exec eslint -- src/lib/timer/comp-sim-audio.ts src/lib/timer/comp-sim-audio.test.ts` passed. `npm exec tsc -- --noEmit --pretty false` passed.

### 2026-03-12 08:26 AM EDT — Comp Sim Reaction Cadence Tuning

**Task:** Make live Comp Sim crowd reactions rare and much more disruptive when they happen
**Status:** Tuned the live crowd-reaction loop so random cheering now fires roughly once every 6-7 minutes instead of every few seconds, which keeps the room mostly ambient. Increased the live random-reaction mix level substantially so the rare applause/cheer bursts feel like a genuine record reaction you have to solve through, while leaving the judge cues and ambient bed behavior unchanged. Added mocked-audio tests to lock in the new minimum cadence and louder reaction-vs-ambient balance.
**Files touched:** `src/lib/timer/comp-sim-audio.ts`, `src/lib/timer/comp-sim-audio.test.ts`, `AGENT_LOG.md`
**Checks:** `npm exec vitest run src/lib/timer/comp-sim-audio.test.ts src/lib/timer/comp-sim.test.ts` passed. `npm exec eslint -- src/lib/timer/comp-sim-audio.ts src/lib/timer/comp-sim-audio.test.ts` passed. `npm exec tsc -- --noEmit --pretty false` passed.

### 2026-03-12 08:29 AM EDT — Remove Comp Sim Judge Calls

**Task:** Remove the Comp Sim judge/MC call feature entirely
**Status:** Removed judge/MC calls from the live Comp Sim flow, deleted the settings toggle and summary copy that referenced them, and simplified the round config so the feature no longer exists as an active option. The setup and live round language now describe a neutral waiting period instead of a judge cue, while ambient crowd noise and rare reaction bursts continue to work as before.
**Files touched:** `src/lib/timer/comp-sim-round.ts`, `src/lib/timer/comp-sim-audio.ts`, `src/components/timer/comp-sim-settings-panel.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-hero.tsx`, `src/components/timer/comp-sim-screens.tsx`, `AGENT_LOG.md`
**Checks:** `npm exec vitest run src/lib/timer/comp-sim-audio.test.ts src/lib/timer/comp-sim.test.ts` passed. `npm exec eslint -- src/lib/timer/comp-sim-audio.ts src/lib/timer/comp-sim-audio.test.ts src/components/timer/comp-sim-settings-panel.tsx src/components/timer/comp-sim-overlay.tsx src/lib/timer/comp-sim-round.ts src/components/timer/comp-sim-hero.tsx src/components/timer/comp-sim-screens.tsx` passed. `npm exec tsc -- --noEmit --pretty false` passed.

### 2026-03-12 08:53 AM EDT — Manual AdSense Rollout

**Task:** Restore AdSense support with conservative manual placements on high-traffic pages
**Status:** Re-added the global AdSense account script in the root layout, published `public/ads.txt`, and introduced a reusable client-side `AdSlot` component wired to the existing publisher ID. Added env-driven manual placements for the homepage, feed, leaderboards desktop sidebar, and public profile (desktop sidebar plus mobile inline after tabs), while skipping timer/auth/admin/onboarding surfaces and suppressing ads for the admin account on the already-dynamic feed/profile pages. Updated the privacy policy to reflect advertising cookies and Google AdSense usage, and documented the required slot env vars in `.env.local.example`.
**Files touched:** `src/components/ads/ad-slot.tsx`, `public/ads.txt`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(main)/feed/page.tsx`, `src/components/feed/feed-content.tsx`, `src/app/(main)/leaderboards/page.tsx`, `src/app/(main)/profile/[handle]/page.tsx`, `src/components/profile/public-profile-content.tsx`, `src/app/(main)/privacy/page.tsx`, `.env.local.example`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/eslint src/components/ads/ad-slot.tsx src/app/layout.tsx src/app/page.tsx src/app/(main)/feed/page.tsx src/components/feed/feed-content.tsx src/app/(main)/leaderboards/page.tsx src/app/(main)/profile/[handle]/page.tsx src/components/profile/public-profile-content.tsx src/app/(main)/privacy/page.tsx` passed. `./node_modules/.bin/tsc --noEmit` passed. `npm run build -- --webpack` passed. Note: the default Turbopack build still fails in this worktree because the shared `node_modules` symlink points outside the worktree root.

### 2026-03-12 08:56 AM EDT — Wire Real AdSense Slot IDs

**Task:** Replace placeholder/manual-env-only ad slots with the real AdSense unit IDs
**Status:** Added a shared `src/lib/ads.ts` config with the real slot IDs provided from AdSense and switched the homepage, feed, leaderboards sidebar, and public profile placements to use those defaults directly. The env vars still work as optional overrides, but these four placements no longer depend on extra Vercel configuration just to render the correct units.
**Files touched:** `src/lib/ads.ts`, `src/app/page.tsx`, `src/app/(main)/feed/page.tsx`, `src/app/(main)/leaderboards/page.tsx`, `src/app/(main)/profile/[handle]/page.tsx`, `.env.local.example`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/eslint src/lib/ads.ts src/app/page.tsx src/app/(main)/feed/page.tsx src/app/(main)/leaderboards/page.tsx src/app/(main)/profile/[handle]/page.tsx` passed. `./node_modules/.bin/tsc --noEmit` passed. `npm run build -- --webpack` passed.

### 2026-03-12 08:38 AM EDT — Comp Sim False DNF Fix

**Task:** Stop Comp Sim from issuing an immediate DNF when releasing into the solve
**Status:** Root-caused the false DNF to the Comp Sim inspection overlay: manual inspection release was calling `finishInspection()`, which set inspection state to `done`, and a separate timeout effect was misreading that same `done` state as an inspection timeout and auto-submitting a DNF. Added an explicit manual-finish guard so only real inspection timeouts auto-submit DNFs, while intentional release cleanly transitions into the solve. Also handled manual post-timeout releases through the same DNF submission path and added a focused regression test for the guard logic.
**Files touched:** `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-overlay.test.ts`, `AGENT_LOG.md`
**Checks:** `npm exec vitest run src/components/timer/comp-sim-overlay.test.ts src/lib/timer/comp-sim.test.ts` passed. `npm exec eslint -- src/components/timer/comp-sim-overlay.tsx src/components/timer/comp-sim-overlay.test.ts` passed. `npm exec tsc -- --noEmit --pretty false` passed.

### 2026-03-12 11:24 AM EDT — Comp Sim Timer Parity + Structural DNF Fix

**Task:** Make Comp Sim use the same timer feel as the main timer and remove the release-to-DNF architecture bug
**Status:** Replaced the custom Comp Sim ready/inspection/solving widget with a shared timer surface and a shared hold/inspection/start controller modeled on the main timer flow. Comp Sim now starts inspection synchronously inside the same release transition instead of through a later effect, uses the same timer font/readout sizing/update-mode behavior as the main timer, respects the normal inspection toggle, and submits inspection-timeout DNFs through a dedicated Comp Sim engine path instead of forcing a fake `startSolve -> complete DNF` transition. Also moved the main timer readout into a shared component so both timer experiences render from the same source of truth, and expanded engine regression coverage for direct inspection DNFs and cutoff handling.
**Files touched:** `src/components/timer/shared-timer-surface.tsx`, `src/components/timer/use-shared-timer-controller.ts`, `src/components/timer/timer-content.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-screens.tsx`, `src/components/timer/use-comp-sim.ts`, `src/lib/timer/comp-sim-engine.ts`, `src/lib/timer/comp-sim.test.ts`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/components/timer/comp-sim-overlay.tsx src/components/timer/comp-sim-screens.tsx src/components/timer/shared-timer-surface.tsx src/components/timer/use-shared-timer-controller.ts src/components/timer/use-comp-sim.ts src/lib/timer/comp-sim-engine.ts src/lib/timer/comp-sim.test.ts` passed. `./node_modules/.bin/vitest run src/lib/timer/comp-sim.test.ts` passed.

### 2026-03-12 11:37 AM EDT — Comp Sim Timer Cleanup

**Task:** Fix the merged Comp Sim timer cleanup regressions so inspection counts normally and recorded solves keep the main timer look
**Status:** Tightened the shared timer controller so it no longer depends on the whole `useInspection()` return object for cleanup, which was causing inspection to be cancelled and reset on normal rerenders. The controller now depends only on stable inspection callbacks/state slices, so the inspection timer can tick normally instead of appearing stuck at `0`. Also switched the Comp Sim `solve_recorded` screen to render through the shared `TimerReadout` with the same light-weight monospace classes as the main timer, eliminating the fallback to the older thick custom number styling. Added Node-safe regression tests for inspection/stopped readout output and solve-recorded markup parity.
**Files touched:** `src/components/timer/use-shared-timer-controller.ts`, `src/components/timer/comp-sim-screens.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/shared-timer-surface.test.tsx`, `src/components/timer/comp-sim-screens.test.tsx`, `AGENT_LOG.md`
**Checks:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/node_modules/.bin/vitest run src/components/timer/shared-timer-surface.test.tsx src/components/timer/comp-sim-screens.test.tsx src/lib/timer/comp-sim.test.ts` passed. `/Users/brandontrue/Documents/Coding/speed-cube-hub/node_modules/.bin/eslint src/components/timer/use-shared-timer-controller.ts src/components/timer/comp-sim-screens.tsx src/components/timer/comp-sim-overlay.tsx src/components/timer/shared-timer-surface.tsx src/components/timer/shared-timer-surface.test.tsx src/components/timer/comp-sim-screens.test.tsx src/lib/timer/comp-sim.test.ts` passed. `/Users/brandontrue/Documents/Coding/speed-cube-hub/node_modules/.bin/tsc --noEmit` passed.
