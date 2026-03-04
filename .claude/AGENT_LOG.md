# Speed Cube Hub — Agent Coordination Log

Shared log for parallel Claude Code sessions. Each session appends entries when running `/sync`.

**Newest entries at the bottom.** Managed by the `/sync` skill.

**HARD LIMIT: 20 entries max.** When adding a new entry, count the `### ` headings. If there are more than 20, delete the oldest entries from the TOP until there are exactly 20. Old entries are preserved in git history — do not hesitate to delete them. This file must never exceed ~200 lines.

---

### 2026-03-02 PT — Typing Mode Input Fix Session

**Task:** General work — Fix typing mode input on timer page
**Status:** Fixed two issues with the typing mode input:
1. **Input not working at all:** Replaced hidden input + fake div approach with a single real visible `<input>` element.
2. **UX polish:** Removed placeholder text, instruction text, bumped font size.
**Files touched:** src/components/timer/time-input.tsx

---

### 2026-03-02 PT — Timer Scramble UI Simplification Session

**Task:** General work — Timer scramble toolbar simplification (user-driven)
**Status:** Removed custom scramble editing, animator button, copy button (replaced with click-to-copy on text), scramble settings gear. Scramble Size moved to main TimerSettings.
**Files touched:** scramble-display.tsx, timer-top-bar.tsx, timer-content.tsx, timer-settings.tsx, use-timer-scramble.ts

---

### 2026-03-02 PT — FloatingPanel + Session Manager Simplification

**Task:** T153 (FloatingPanel component) + T159 (Simplify Manage Sessions)
**Status:** Created floating-panel.tsx. Simplified session-manager.tsx from 7 buttons to 3 (Edit, Archive, X-delete). Added collapsible archived section.
**Files touched:** floating-panel.tsx (new), session-manager.tsx, solve-sessions.ts, timer-content.tsx

---

### 2026-03-02 PT — T154 Timer Core Changes Session

**Task:** T154 (Timer Core Changes — timer-content.tsx owner)
**Status:** Hold duration options changed to [100, 200, 550]. Inspection voice toggle. Settings cleanup. Top bar: Normal/Comp Sim pill, session clock, Pause/Play. PB toast queue. Active tool state. Various migrations and cleanup.
**Files touched:** timer-display.tsx, inspection.ts, timer-settings.tsx, timer-top-bar.tsx, timer-content.tsx

---

### 2026-03-02 PT — T156 + T157 Session (Analyzer Panels + PB Toast)

**Task:** T156 (Scramble Type & Analyzer Tool Placement) + T157 (PB Popup → Subtle Toast)
**Status:** Analyzer tools moved to FloatingPanel. PB celebration rewritten as compact toast.
**Files touched:** scramble-display.tsx, timer-top-bar.tsx, timer-content.tsx, pb-celebration.tsx

---

### 2026-03-02 PT — T162 Session (csTimer Import Bulk Solve Insert)

**Task:** T162 (CSTimer Import → Bulk Solve Insert)
**Status:** Parser now retains individual solve data (scramble, isPlus2). Import uses `bulkImportSolves` with solve session picker.
**Files touched:** parse-cstimer.ts, cstimer-import.tsx

---

### 2026-03-02 11:54 AM PT — Timer Rebuild Session (timer-rebuild branch)

**Task:** Timer Rebuild — initiated by user, separate feature branch
**Status:** Deleted all 32 old timer components + 14 unused lib files. Replaced with single 298-line timer-content.tsx. Added cstimer-style left sidebar with stats table + scrollable solve list.
**Files touched:** timer-content.tsx (only file), lib/timer/ (kept scrambles.ts, averages.ts, inspection.ts)
**Learnings:** `phaseRef` + `heldRef` pattern prevents stale closures in event handlers.

---

### 2026-03-02 PT — Timer Scramble Top Bar Session

**Task:** Move scramble into top bar of timer
**Status:** Scramble text moved to top bar between event dropdown and settings. Linter changed `HOLD_MS` from 200→550.
**Files touched:** timer-content.tsx

---

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
