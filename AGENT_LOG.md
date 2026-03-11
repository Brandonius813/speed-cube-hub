# Speed Cube Hub — Agent Coordination Log

Shared log for parallel Claude Code sessions. Each session appends entries when running `/sync`.

**Newest entries at the bottom.** Managed by the `/sync` skill.

**HARD LIMIT: 20 entries max.** When adding a new entry, count the `### ` headings. If there are more than 20, delete the oldest entries from the TOP until there are exactly 20. Old entries are preserved in git history — do not hesitate to delete them. This file must never exceed ~200 lines.

### 2026-03-02 PT — Timer Typing Mode Bug Fix Session

**Task:** Bug fix — colon-separated time parsing
**Status:** Fixed `parseTime()` — "8:20" was being read as "820" = 8.20s. Added `M:SS[.cc]` parsing branch.
**Files touched:** timer-content.tsx

---

### 2026-03-02 PT — Timer Typing Mode Alignment Fix Session

**Task:** UI polish — timer display vs typing input alignment
**Status:** Fixed size mismatch (text-8xl + font-light). Preview text absolutely positioned to prevent layout shift.
**Files touched:** timer-content.tsx

---

### 2026-03-02 PT — Timer Scramble & Display Fixes

**Task:** Timer scramble fixes
**Status:** Removed line-clamp-2 from scramble display. Added custom `generateFallbackScramble()` for 5x5, 6x6, 7x7, Megaminx (cstimer_module returns "" for these).
**Files touched:** scrambles.ts, timer-content.tsx
**Learnings:** `cstimer_module` does NOT support: 555wca, 666wca, 777wca, mgmp. WCA uses random-move for 6x6/7x7 anyway.

---

### 2026-03-02 PT — GAN Halo Bluetooth Timer Session

**Task:** GAN Halo physical timer BLE connectivity
**Status:** Complete. Built `bluetooth.ts` (BLE protocol handler), `use-bluetooth-timer.ts` (React hook), extracted `solve-list-panel.tsx`. BT connect in settings gear dropdown. Inspection works with BT.
**Files touched:** bluetooth.ts (new), use-bluetooth-timer.ts (new), solve-list-panel.tsx (new), timer-content.tsx
**Learnings:** GAN Halo Timer (timing pad) is completely different from GAN smart cube (puzzle) — different protocol, different device. Web Bluetooth is Chrome-only.

---

### 2026-03-02 PT — Timer UI Polish Session

**Task:** Timer top bar reorganization + scramble history cap
**Status:** Moved Typing Mode, Inspection, GAN Smart Timer toggles into settings gear dropdown. Scramble history capped at 2 entries.
**Files touched:** timer-content.tsx

---

### 2026-03-02 — Bluetooth Timer Inspection Overhaul Session

**Task:** User-reported Bluetooth + inspection bugs
**Status:** Fixed stale phase race, orphan inspection intervals, BT reset button behavior, two-press reset flow, color feedback. All verified by user.
**Files touched:** timer-content.tsx
**Learnings:** GAN Halo sends HANDS_ON → GET_SET → RUNNING rapidly — always call cleanup unconditionally, not gated on stale refs.

---

### 2026-03-02 PT — Timer Session Logging Session

**Task:** Timer → Session Logging flow
**Status:** Created `save-timer-session.ts` (atomic DB save), `end-session-modal.tsx` (stats summary + title/notes). Session controls as floating widget with clock, solve count, Pause/Resume, End.
**Files touched:** save-timer-session.ts (new), end-session-modal.tsx (new), timer-content.tsx
**Learnings:** `createSessionSchema` validates `duration_minutes` as `z.number().int()` — use `Math.round()`. Timer stores ms; sessions table expects decimal seconds.

---

### 2026-03-02 PT — Daily/Weekly Leaderboards Session

**Task:** Daily and Weekly leaderboards for Solves and Practice Time
**Status:** 8 new DB RPC functions, shared types in `leaderboard-types.ts`, time period toggle on leaderboard controls. Live on production.
**Files touched:** leaderboard-types.ts (new), leaderboards.ts, leaderboard-controls.tsx, leaderboards-content.tsx
**Learnings:** `"use server"` files in Next.js 16 cannot export non-async-function values — extract types/constants to plain files.

---

### 2026-03-03 PT — Timer Bulletproofing Session

**Task:** Timer performance hardening on top of Codex changes
**Status:** Integrated Codex's timer hardening (Web Workers, IndexedDB, engine, telemetry) + 9 additional fixes: stats worker session ID bug, IndexedDB fallback warning, 10s timeout, direct DOM mutation for RAF timer, incremental O(1) stats, React error boundary, worker error handlers, deleted dead hook.
**Files touched:** timer-content.tsx, solve-list-panel.tsx, scramble-worker.ts, timer/page.tsx, timer-error-boundary.tsx (new)
**Learnings:** ~30 untracked Codex-generated files exist in working directory (dead code, not imported). Clean up if desired.

---

### 2026-03-04 PT — Visual Polish Session (Font + Timer Size)

**Task:** General work — Site-wide font swap + timer display size increase
**Status:** Switched site-wide font from Inter → Nunito. Made center timer display 2.5-3x larger (large: text-[9rem]→text-[15rem]). Bumped solve list times text-sm→text-base, stats panel text-xs→text-sm. Updated CLAUDE.md font reference.
**Files touched:** src/app/layout.tsx, src/app/globals.css, src/components/timer/timer-display.tsx, src/components/timer/solve-list.tsx, src/components/timer/stats-panel.tsx, .claude/CLAUDE.md
**Learnings:** font-mono (JetBrains Mono) left unchanged — all numeric/time values still use it. Nunito variable is --font-nunito.
**Blockers:** None
**Warnings:** git pull/push hanging during this session (other agents holding connections). Commit these files when git frees up.
**Learnings:** ~30 untracked Codex-generated files exist in working directory (dead code, not imported). Clean up if desired.

---

### 2026-03-04 PT — Multi-Agent Layout Setup (VS Code UI)

**Task:** Parallel workflow setup for remaining open items
**Status:** Created 3 dedicated worktrees/branches and pre-mapped each open task. Added a VS Code multi-root workspace file + visual runbook.
**Worktrees:** `../speed-cube-hub-agent-profile`, `../speed-cube-hub-agent-ratelimit`, `../speed-cube-hub-agent-rls`
**Branches:** `task/activate-profile-components`, `task/rate-limit-api-routes`, `task/challenges-rls-admin-insert`
**Files touched:** `.claude/TASKS.md`, `docs/multi-agent-vscode.md`, `speed-cube-hub-agents.code-workspace`

---

### 2026-03-04 08:53 AM PT — Strip Badges & Accomplishments Session

**Task:** General work — Remove badges, accomplishments, and milestone features entirely
**Status:** Stripped all badge/accomplishment/milestone code from the site. Deleted 7 files (1,460 lines), cleaned 14 files. -1,642 lines net. Build passes cleanly.
**Files touched:** Deleted: badges.ts, check-milestones.ts, badges-section.tsx, claim-badge-modal.tsx, accomplishments.tsx, badge-queue-content.tsx, admin/badges/page.tsx. Edited: profile pages, profile components, notifications, types.ts, profiles.ts, sessions.ts, save-timer-session.ts, admin/page.tsx, CLAUDE.md, PRD.
**Learnings:** DB tables (`badges`, `user_badges`) still exist but are no longer referenced. Can be dropped or repurposed for redesign.
**Blockers:** None
**Warnings:** T29 (Badges & credentials) is now marked as incomplete in PRD — will be redesigned. If other sessions touch profile tabs or notifications, badge references are fully gone.

---

### 2026-03-04 10:15 AM PT — Comp Sim + Font/Sizing Fix Session

**Task:** Competition Simulator mode + fix font/sizing regression on dev
**Status:** Built the full Competition Simulator feature (6 new files, 2 modified). Then fixed two styling regressions where main had changes that were lost on dev: (1) `--font-mono` reverted to JetBrains Mono instead of Nunito, (2) timer readout responsive sizing (`sm:text-[10rem] md:text-[12rem]`) was missing.
**Files touched:** NEW: comp-sim-engine.ts, comp-sim-audio.ts, use-comp-sim.ts, comp-sim-overlay.tsx, comp-sim-screens.tsx, public/audio/crowd-noise.mp3. MODIFIED: timer-content.tsx, save-timer-session.ts, globals.css, check-milestones.ts (stub).
**Learnings:** Commits made directly on main (cf24596 sizing, a5d1efb font) don't automatically appear on dev — must cherry-pick or merge. The `practice-mode-selector.tsx` already had "Comp Sim" in COMMON_TYPES, so selecting it triggers the overlay via `practiceType === "Comp Sim"` check in timer-content.
**Blockers:** None
**Warnings:** timer-content.tsx is now ~1740 lines (well over 400 limit but was already that way). Comp sim overlay uses keyboard capture (`{ capture: true }`) on spacebar — if other features add global keyboard handlers, they may conflict.

---

### 2026-03-04 PT — Timer Multi-Pane Workspace Session

**Task:** Replace single timer bottom pane with modular multi-pane workspace (up to 4 tools)
**Status:** Completed. Added pane registry + pane layout state engine + desktop snap-grid workspace + mobile stacked drawer. Integrated into timer settings (edit mode, tool toggles, auto-hide while solving, reset layout). Added server persistence (`timer-layout` actions), Zod validation, and DB migration (`timer_pane_layouts`) for local-first + account sync.
**Files touched:** NEW: `src/components/timer/panes/*`, `src/lib/actions/timer-layout.ts`, `supabase/migrations/024_create_timer_pane_layouts.sql`. MODIFIED: `src/components/timer/timer-content.tsx`, `src/lib/validations.ts`, `src/components/shared/time-distribution-chart.tsx`, `src/components/shared/time-trend-chart.tsx`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`.
**Learnings:** Best UX came from keeping panes as fixed overlays (`pointer-events-none` shell + interactive pane cards) so timer layout never shifts. Last-write-wins using `updatedAtMs` is simple and reliable for cross-device sync in v1.
**Checks:** `npx tsc --noEmit` passed; `npm run lint` passed with existing repo-wide warnings.

---

### 2026-03-05 PT — Timer Fixed Slot Refinement Session

**Task:** Refine desktop pane positions to 4 exact slots: top-right, bottom-right, bottom-middle, bottom-left
**Status:** Completed. Reworked desktop pane slot model + migration to the new 4-slot layout and updated workspace geometry so all four positions render at the same card size. Existing legacy slot values (`top/left/right/bottom`) are migrated into the new positions on load. Timer settings position controls now target the new slot names. Mobile drawer behavior unchanged.
**Files touched:** `src/components/timer/panes/types.ts`, `src/components/timer/panes/pane-registry.tsx`, `src/components/timer/panes/use-timer-pane-layout.ts`, `src/components/timer/panes/desktop-pane-workspace.tsx`, `src/components/timer/timer-content.tsx`, `src/lib/validations.ts`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `npx tsc --noEmit` failed due pre-existing missing module (`cstimer_module` import resolution). `npm run lint` failed with existing repo-wide lint errors; targeted lint on changed files passed.

---

### 2026-03-05 08:39 AM PT - Timer Pane Desktop Polish + Toggle Reliability

**Task:** General work (post-T153 desktop pane usability polish)
**Status:** Completed multiple desktop pane refinements: removed pane header strips, capped max pane growth on large monitors, spread fixed slots outward on ultrawide layouts, and added slight 2xl scaling for scramble text + left stats readout. Also fixed pane tool toggle to be state-atomic so close/open flows read latest layout state.
**Files touched:** `src/components/timer/panes/desktop-pane-workspace.tsx`, `src/components/timer/panes/use-timer-pane-layout.ts`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/timer-content.tsx`
**Learnings:** Fixed-slot panes need separate controls for max-size and slot spacing; capping width without edge-spreading can look centered/clustered on large displays.
**Blockers:** `npx tsc --noEmit` still fails on pre-existing missing module `cstimer_module` in `src/components/timer/scramble-animator.tsx`.
**Warnings:** `timer-content.tsx` and pane UI files are active hot spots across recent sessions; rebase carefully before making adjacent settings/pane edits.

---

### 2026-03-05 08:56 AM PT - Build Fix + Localhost Stability Session

**Task:** General work — Vercel build failure + localhost/dev server recovery
**Status:** Reproduced production build failure (`Cannot find module 'cstimer_module'`), added the missing dependency, verified `npm run build` passes, pushed to `main`, and confirmed production deployment is `Ready`. Investigated localhost instability and confirmed detached background launches were dropping; relaunched dev server in a persistent session and verified sustained HTTP 200 on `http://localhost:3000`.
**Files touched:** `package.json`, `package-lock.json`, `AGENT_LOG.md`
**Learnings:** A direct import in `scramble-animator.tsx` required `cstimer_module` in dependencies. Detached/background dev-server launch in this environment can die silently after startup; persistent session launch is stable.
**Blockers:** None
**Warnings:** This worktree has pre-existing unstaged timer pane edits (`desktop-pane-workspace.tsx`, `solve-list-panel.tsx`, `timer-content.tsx`) unrelated to this sync/build fix; avoid including them in unrelated commits.

---

### 2026-03-05 09:01 AM PT - Timer Pane Open Reliability + Sync Check-In

**Task:** General work — timer pane open/show button reliability
**Status:** Implemented two targeted fixes for pane-open actions: (1) hardened initial layout merge to keep newest state and preserve in-flight local clicks, (2) switched settings tool rows from generic toggle to explicit add/remove flow. Verified `npx eslint` and `npx tsc --noEmit` pass locally on changed files. User reports localhost/dev still showing the same symptom and that the dev server is down again.
**Files touched:** `src/components/timer/panes/use-timer-pane-layout.ts`, `src/components/timer/timer-content.tsx`, `src/components/timer/solve-list-panel.tsx`, `src/components/timer/panes/desktop-pane-workspace.tsx`, `AGENT_LOG.md`
**Learnings:** Timer pane state is sensitive to startup hydration/sync races; explicit add/remove intent is safer than abstract toggle calls for settings-driven UI actions.
**Blockers:** Dev server reported down again by user; runtime verification in browser is blocked until server is stable.
**Warnings:** Timer pane files are active merge hot spots (`timer-content.tsx`, `use-timer-pane-layout.ts`, `desktop-pane-workspace.tsx`, `solve-list-panel.tsx`); rebase carefully before touching adjacent logic.

---

### 2026-03-05 09:34 AM PT - Localhost Stability Hardening Session

**Task:** Root-cause and fix repeated localhost dev shutdowns
**Status:** Identified two causes: (1) `npm run dev` launched as a background job was not reliably persistent, and (2) dev responses sent HSTS headers, creating HTTPS confusion on localhost. Implemented a PID-tracked detached starter (`dev:up/dev:status/dev:down/dev:logs`), made HSTS production-only, and updated docs/tracking files.
**Files touched:** `scripts/dev-server.mjs`, `package.json`, `.gitignore`, `next.config.ts`, `README.md`, `AGENTS.md`, `SPEED_CUBE_HUB_PRD.md`, `TASKS.md`, `AGENT_LOG.md`
**Checks:** `npx tsc --noEmit` passed. Verified `npm run dev:up` → `dev:status` → HTTP 200 on `http://127.0.0.1:3000` → `dev:down`.

---

### 2026-03-06 09:18 AM PT — Timer Event Switch Session Guard

**Task:** Prevent active timer session from being silently reset when changing puzzle/event
**Status:** Added guarded event-switch flow in `timer-content.tsx`. If an active session has unsaved solves, switching events now prompts the user to end/save the session first (opens End Session flow), then switches automatically after save. If an active session is empty, user gets a cancel-and-switch confirmation instead of silent reset. Also blocks event switching mid-solve/inspection.
**Files touched:** `src/components/timer/timer-content.tsx`, `AGENT_LOG.md`
**Checks:** `npx eslint src/components/timer/timer-content.tsx` passed. `npx tsc --noEmit` passed after removing duplicate generated `.next/types/* 2.ts` artifacts from local workspace.

---

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

### 2026-03-11 PT — Fix Profile Daily Charts Hidden Event Series

**Task:** Stop profile daily charts from silently dropping smaller events like 6x6 and make profile stats fetch complete history
**Status:** Replaced the duplicated top-3 chart bucketing logic with shared helpers so the profile `Daily Practice` and `Daily Solves` charts now render every event present in the filtered session set, with centralized label/color fallbacks and zero-free tooltips. Also moved session pagination into a reusable helper and updated `getSessionsByUserId` to fetch all pages instead of capping profile stats at 200 sessions. Added Vitest with helper-level unit coverage for chart grouping/series visibility and multi-page fetch behavior.
**Files touched:** `src/components/dashboard/daily-bar-chart.tsx`, `src/components/dashboard/daily-solves-chart.tsx`, `src/lib/actions/sessions.ts`, `src/lib/helpers/fetch-all-pages.ts`, `src/lib/helpers/session-chart-data.ts`, `src/lib/helpers/fetch-all-pages.test.ts`, `src/lib/helpers/session-chart-data.test.ts`, `package.json`, `package-lock.json`, `vitest.config.ts`, `AGENT_LOG.md`
**Checks:** `npm test` passed. `npx tsc --noEmit` passed. `npx eslint src/components/dashboard/daily-bar-chart.tsx src/components/dashboard/daily-solves-chart.tsx src/lib/actions/sessions.ts src/lib/helpers/fetch-all-pages.ts src/lib/helpers/fetch-all-pages.test.ts src/lib/helpers/session-chart-data.ts src/lib/helpers/session-chart-data.test.ts vitest.config.ts` passed. `npm run lint` still fails due pre-existing unrelated errors in other files.
