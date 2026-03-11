# Speed Cube Hub — Agent Coordination Log

Shared log for parallel Claude Code sessions. Each session appends entries when running `/sync`.

**Newest entries at the bottom.** Managed by the `/sync` skill.

**HARD LIMIT: 20 entries max.** When adding a new entry, count the `### ` headings. If there are more than 20, delete the oldest entries from the TOP until there are exactly 20. Old entries are preserved in git history — do not hesitate to delete them. This file must never exceed ~200 lines.

### 2026-03-06 PT — Shared Multi-Agent Coordination Setup

**Task:** Prevent parallel Codex sessions from colliding on the same files
**Status:** Added a shared cross-worktree claims registry at `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`, a versioned helper script at `scripts/agent-claims.mjs`, and an auto-bootstrap helper at `scripts/agent-bootstrap.mjs` so new agents can create/reuse their own `codex/...` worktree automatically before coding. Wired repo commands (`agent:bootstrap`, `claims:status`, `claims:claim`, `claims:touch`, `claims:release`) and updated startup/multi-agent docs to require self-bootstrap + live file claims before editing.
**Files touched:** `AGENTS.md`, `package.json`, `README.md`, `docs/multi-agent-vscode.md`, `scripts/agent-claims.mjs`, `scripts/agent-bootstrap.mjs`, `AGENT_LOG.md`, `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`, `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/claims.mjs`
**Checks:** `npm run claims:status`, `npm run claims:claim -- --task "Self test" --files "README.md,docs/multi-agent-vscode.md"`, `npm run claims:touch`, `npm run claims:release`, and `npm run claims:status` all passed. Overlap protection also passed: a second claim on `AGENTS.md` from a different `--cwd` was rejected until the first claim was released. `npm run agent:bootstrap -- --task "auto bootstrap self test"` created a sibling worktree + `codex/auto-bootstrap-self-test` branch, then reused that worktree on a second run.

---

### 2026-03-06 09:39 AM PT — Comp Sim Accidental-Start Guard

**Task:** Reduce accidental DNF risk in Competition Simulator when solver is called
**Status:** Updated Comp Sim `ready` phase so inspection no longer starts on a single tap/keypress. Users must now hold and release (550ms threshold) to begin inspection, matching the intentional hold-to-start behavior used elsewhere in the timer. Added matching visual/text feedback on the Ready screen.
**Files touched:** `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-screens.tsx`, `AGENT_LOG.md`
**Checks:** `npx eslint src/components/timer/comp-sim-overlay.tsx src/components/timer/comp-sim-screens.tsx` passed. `npx tsc --noEmit` passed.

### 2026-03-06 11:05 AM PT — Timer History Delete + Scroll Retention

**Task:** Fix timer-history outlier deletion persistence and keep list scroll position after delete
**Status:** Confirmed the root cause of returning solves: timer deletes were only removing rows from IndexedDB, so DB-backed sync could restore them later. Built on the latest server-delete fix by updating cross-device sync to reconcile when DB saved-history counts differ in either direction while preserving unsaved local solves. Added a solve-list imperative scroll-preservation hook so deleting a time no longer jumps the list back to the top. Backed up and hard-deleted 16 suspicious 3x3 outlier/DNF rows for the admin account from Supabase (`/tmp/speed-cube-hub-brandon-outlier-solves-20260306.json`).
**Files touched:** `src/lib/timer/cross-device-sync.ts`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/lib/timer/cross-device-sync.ts src/components/timer/solve-list-panel.tsx src/components/timer/timer-content.tsx` passed. Verified no remaining `333` solves for admin user matched `time_ms < 5000` or `penalty = 'DNF'`.

---

### 2026-03-06 11:42 AM PT — Timer Session Boundary Guard + Duplicate 3x3 Cleanup

**Task:** Stop end-session flows from scooping up stale ungrouped history; remove the duplicate 3x3 block still polluting all-time charts
**Status:** Added a session-start solve-index boundary in `timer-content.tsx` so active session save/discard/end-switch logic only touches solves added after the session began, even if older ungrouped solves exist in local cache. This prevents a repeat of the March 5 duplication bug where a save bundled nearly the full 3x3 history into one new session. Cleaned the existing duplicate data in Supabase by backing up and trimming timer session `371a27bf-e9b6-486b-bc72-030b6c40b2db` from 1495 solves down to the 10 real new solves, updating its linked `sessions` row stats, and deleting the last late 6.16 outlier. Backups saved to `/tmp/speed-cube-hub-brandon-duplicate-session-371a-20260306.json` and `/tmp/speed-cube-hub-brandon-outlier-solve-76142ec7-20260306.json`.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed. Verified admin `333` total is now 1517 and there are no late (`overallIndex >= 1450`) solves with `time_ms < 8000` or `penalty = 'DNF'`.

---

### 2026-03-06 PT — Timer QoL Polish

**Task:** Add timer shortcuts, bigger text options, richer solve editing, session-vs-all-time stats, and pane reopen memory
**Status:** Added keyboard shortcuts for `+2`, `DNF`, and next scramble in the live timer. Added timer text-size controls that scale the scramble line, main readout, typing input, and left stats/history panel. Upgraded the left solve list so clicking a solve opens a richer detail modal with notes, scramble copy, PB/share, penalty toggles, and delete. Extended local timer solve persistence to keep per-solve notes/timestamps through refreshes and session save, and updated saved-solve inserts to persist solve notes/phases/timestamps. Added session-best and session-mean stats alongside the existing current/all-time values. Pane layout state now remembers each tool's last slot/options/height so reopening a tool returns it to the same place.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/solve-detail-modal.tsx`, `src/components/timer/panes/use-timer-pane-layout.ts`, `src/components/timer/panes/types.ts`, `src/lib/timer/stats.ts`, `src/lib/timer/solve-store.ts`, `src/lib/timer/cross-device-sync.ts`, `src/lib/validations.ts`, `src/components/timer/end-session-modal.tsx`, `src/lib/actions/save-timer-session.ts`, `TASKS.md`, `SPEED_CUBE_HUB_PRD.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/components/timer/solve-list-panel.tsx src/components/timer/solve-detail-modal.tsx src/components/timer/panes/use-timer-pane-layout.ts src/components/timer/end-session-modal.tsx src/lib/actions/save-timer-session.ts src/lib/timer/cross-device-sync.ts src/lib/timer/solve-store.ts src/lib/timer/stats.ts src/lib/validations.ts` passed. `./node_modules/.bin/tsc --noEmit` passed.

---

### 2026-03-06 12:33 PM PST — Timer Centisecond Truncation Fix

**Task:** Stop timer displays and saved session stats from rounding centiseconds up; truncate instead
**Status:** Added shared timer helpers for centisecond truncation and routed the timer readout, solve list, end-session summary, competition simulator, and timer-session save paths through them. The live timer now shows `59.39` for a `59.397` GAN result instead of rounding to `59.40`, and the local/fallback timing path now truncates to centiseconds before saving as well so the stored result matches the visible one.
**Files touched:** `src/lib/timer/averages.ts`, `src/components/timer/timer-content.tsx`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/end-session-modal.tsx`, `src/components/timer/comp-sim-screens.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `src/lib/timer/comp-sim-engine.ts`, `src/lib/actions/save-timer-session.ts`, `src/lib/actions/timer.ts`, `src/lib/timer/session-dividers.ts`, `AGENT_LOG.md`
**Checks:** `npx eslint src/lib/timer/averages.ts src/components/timer/timer-content.tsx src/components/timer/solve-list-panel.tsx src/components/timer/end-session-modal.tsx src/components/timer/comp-sim-screens.tsx src/components/timer/comp-sim-overlay.tsx src/lib/timer/comp-sim-engine.ts src/lib/actions/save-timer-session.ts src/lib/actions/timer.ts src/lib/timer/session-dividers.ts` passed. `npx tsc --noEmit` passed.

---

### 2026-03-10 PT — Build Prerender Fixes For Auth + Dashboard

**Task:** Fix Vercel build failures caused by auth-page search-param usage and dashboard prerendering
**Status:** Cherry-picked the auth-page prerender fix so `login` and `signup` now resolve `next` on the server and pass it into client content components instead of calling `useSearchParams()` in the page entrypoints. Also marked `/dashboard` as force-dynamic so Next.js no longer attempts static generation for a route that depends on Supabase auth cookies.
**Files touched:** `src/app/login/page.tsx`, `src/app/login/login-content.tsx`, `src/app/signup/page.tsx`, `src/app/signup/signup-content.tsx`, `src/app/(main)/dashboard/page.tsx`, `AGENT_LOG.md`
**Checks:** `npm run build`

### 2026-03-10 PT — Timer Wake Lock

**Task:** Keep laptops awake while the timer is actively in use, especially with a connected GAN timer
**Status:** Added a shared `use-screen-wake-lock` hook and wired it into the main timer plus Competition Simulator. The timer now requests a browser screen wake lock while a GAN timer is connected or while active timing/inspection is happening, releases it when inactive or hidden, and silently falls back if wake lock is unsupported or denied. Comp Sim uses the same hook for all active simulator phases except idle/results. No new UI was added; failures only emit timer telemetry.
**Files touched:** `src/components/timer/use-screen-wake-lock.ts`, `src/components/timer/timer-content.tsx`, `src/components/timer/comp-sim-overlay.tsx`, `SPEED_CUBE_HUB_PRD.md`, `AGENT_LOG.md`
**Checks:** `npx eslint src/components/timer/timer-content.tsx src/components/timer/comp-sim-overlay.tsx src/components/timer/use-screen-wake-lock.ts` passed. `npx tsc --noEmit` passed.

### 2026-03-11 10:41 AM PT — Comp Sim / GAN Flow Hardening

**Task:** Stop Competition Simulator from overlapping with the normal timer or GAN Bluetooth timer
**Status:** Added an exclusive Comp Sim mode guard in `timer-content.tsx` so the normal timer keyboard path, normal solve saves, and GAN timer callbacks all bail out while Comp Sim is active. Added a new `CompSimEntryDialog` that blocks entry when a normal session still needs to be saved/discarded, cancels empty normal sessions before entering, and recommends disconnecting the GAN timer before starting Comp Sim. Updated Comp Sim copy so users know it auto-saves and does not require a normal practice session, and moved Comp Sim save timing into `use-comp-sim.ts` so each Ao5 uses its own start time instead of depending on the normal session timer.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/use-comp-sim.ts`, `src/components/timer/comp-sim-overlay.tsx`, `src/components/timer/comp-sim-screens.tsx`, `src/components/timer/comp-sim-entry-dialog.tsx`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/components/timer/use-comp-sim.ts src/components/timer/comp-sim-overlay.tsx src/components/timer/comp-sim-screens.tsx src/components/timer/comp-sim-entry-dialog.tsx` passed.

### 2026-03-10 PT — Timer Pane Text Size Controls

**Task:** Add settings controls to enlarge pane scramble text and solve times
**Status:** Added two new settings-menu controls in `timer-content.tsx`: `Pane Scramble` and `Solve Times`. The scramble text pane now reads a pane-specific text-size preference from pane render context, and the left solve list/stats panel uses its own persisted size setting instead of sharing the main timer readout size. New settings fall back to the existing timer text-size preference so current users keep their display preference unless they change it.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/panes/pane-scramble-text.tsx`, `src/components/timer/panes/types.ts`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx src/components/timer/panes/pane-scramble-text.tsx src/components/timer/panes/types.ts` passed.

### 2026-03-10 05:38 AM PDT — Timer Settings Dropdown Scroll Fix

**Task:** Make the timer settings menu scroll when it grows taller than the viewport
**Status:** Updated the inline timer settings dropdown in `timer-content.tsx` to cap its height to the visible viewport and enable internal scrolling. This keeps the existing compact right-side menu behavior, but prevents settings near the bottom from becoming unreachable on shorter screens.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed. `./node_modules/.bin/tsc --noEmit` passed.

---

### 2026-03-10 06:06 AM PT — Timer Average Popup + Pane Memory Fix

**Task:** Open average-detail popups from the time list and make tool panes reopen in their last slot/settings
**Status:** Wired the timer time-list average cells (`stat1` / `stat2`) to open the centered stat detail modal with the exact rolling solve window for the clicked row, and kept single-solve clicks on the existing solve detail modal. Also fixed timer pane reopen memory by syncing each tool's remembered slot/options/mobile height whenever layout mutations happen, instead of only when a pane is closed, so reopening a tool uses the last location/settings the user actually saw.
**Files touched:** `src/components/timer/timer-content.tsx`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/stat-detail-modal.tsx`, `src/components/timer/panes/use-timer-pane-layout.ts`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/solve-list-panel.tsx src/components/timer/stat-detail-modal.tsx src/components/timer/timer-content.tsx src/components/timer/panes/use-timer-pane-layout.ts` passed.

### 2026-03-11 PT — Timer Settings Menu Measured Scroll Fix

**Task:** Fix the timer settings dropdown so the bottom tools remain reachable on short mobile viewports
**Status:** Replaced the static dropdown max-height in `timer-content.tsx` with a measured viewport-based cap tied to the settings button's actual screen position, and refresh that cap while the menu is open as the visual viewport changes. Also enabled touch-friendly internal scrolling so the bottom tools can be reached reliably on mobile.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed.

### 2026-03-11 PT — Move Pane Scramble Size Control

**Task:** Move the pane scramble size setting so it lives with the related tool controls instead of the general timer section
**Status:** Removed the `Pane Scramble` size control from the top timer settings block and rendered the same size buttons directly under the `Draw Scramble` tool row in the `Tools` section. This keeps the control in the same menu, but places it where users expect pane-specific settings to live.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed.

### 2026-03-11 PT — Rename Settings Label To Scramble Size

**Task:** Rename the top timer settings `Text Size` label to `Scramble Size`
**Status:** Updated the timer settings menu label from `Text Size` to `Scramble Size` in `timer-content.tsx` without changing the underlying setting behavior.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed.

### 2026-03-11 PT — Reformat Timer Summary Footer

**Task:** Make the timer solve-list summary footer cleaner and keep the labels on single lines
**Status:** Replaced the three-column footer summary in `solve-list-panel.tsx` with a centered three-line stack: `count`, `session mean`, and `all-time mean`. The count line now uses current-session solves over total solves so it reads in the `x/y` style the user asked for.
**Files touched:** `src/components/timer/solve-list-panel.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/solve-list-panel.tsx` passed.

### 2026-03-11 PT — Make Pane Scramble Setting Affect Draw Pane

**Task:** Fix the `Pane Scramble` size setting so it visibly changes the `Draw Scramble` tool it sits under
**Status:** Wired the draw pane through the existing scramble size setting by letting `ScrambleImage` accept a size variant and having `PaneDraw` pass the saved scramble-pane size into it. The `Default`, `Large`, and `XL` options now scale the rendered scramble image instead of appearing to do nothing.
**Files touched:** `src/components/timer/panes/pane-draw.tsx`, `src/components/timer/scramble-image.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/panes/pane-draw.tsx src/components/timer/scramble-image.tsx` passed.

### 2026-03-11 PT — Remove Timer Shortcuts Menu Section

**Task:** Remove the `Shortcuts` section from the timer settings menu
**Status:** Deleted the unused shortcuts list from `timer-content.tsx` and removed the no-longer-needed shortcut label constant. The settings menu now flows straight from the size controls into the `Tools` section.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `./node_modules/.bin/tsc --noEmit` passed. `./node_modules/.bin/eslint src/components/timer/timer-content.tsx` passed.

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
