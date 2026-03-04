# Timer Hardening Handoff (2026-03-03)

## Scope
Implemented the requested timer hardening work directly in the active timer path (`src/components/timer/timer-content.tsx`) to address freeze risks and improve reliability at high solve counts.

This handoff summarizes what changed, how it works, and what remains.

## What Was Implemented

### 1) Isolated real-time timer loop from heavy UI
- Added `TimerReadout` subcomponent inside `timer-content.tsx`.
- Running elapsed updates now happen in `TimerReadout` instead of parent-wide state.
- Added RAF stall watchdog (`delta > 250ms`) that emits telemetry.

### 2) Reducer-style timer engine
- Added new module: `src/lib/timer/engine.ts`.
- Provides:
  - `dispatch(event)`
  - `getSnapshot()`
  - `subscribe(listener)`
- Encodes timer/BT/scramble readiness/optional-UI-suppression state transitions in one place.

### 3) Worker-only scramble generation with timeout + retry
- Updated `src/lib/timer/scramble-worker.ts` protocol:
  - request: `{ requestId, eventId }`
  - response: `{ requestId, eventId, scramble, error? }`
- `timer-content.tsx` now:
  - tracks pending scramble requests
  - validates `requestId` + `eventId`
  - retries on timeout/error
  - does not sync-generate scrambles on the main thread
  - shows "Preparing scramble..." while waiting

### 4) Long task monitoring and telemetry
- Added `src/lib/timer/telemetry.ts`.
- Emits:
  - `timer_stall_detected`
  - `longtask_while_running`
  - `scramble_worker_timeout`
  - `stats_worker_latency_ms`
  - `timer_error`
- `PerformanceObserver` longtask monitoring added during active solves.

### 5) IndexedDB-backed solve store + migration
- Added `src/lib/timer/solve-store.ts`.
- Store API implemented:
  - `appendSolve`
  - `updatePenalty`
  - `deleteSolve`
  - `listWindow`
  - `count`
  - `loadSession`
  - `replaceSession`
  - `clearSession`
- Includes memory fallback when IndexedDB is unavailable.
- Added one-time migration path from legacy `localStorage["timer-solves"]`.

### 6) Off-main-thread stats computation
- Added:
  - `src/lib/timer/stats-worker.ts`
  - `src/lib/timer/stats-worker-types.ts`
- Worker message types implemented:
  - `init`, `append`, `update`, `delete`, `recompute`
- `timer-content.tsx` now uses worker snapshots for stats updates (with sync fallback).

### 7) Virtualized solve list panel
- Replaced solve list rendering with windowed rendering in:
  - `src/components/timer/solve-list-panel.tsx`
- Uses range callbacks, overscan, spacer rows, and frozen updates while running/under suppression.

## Primary Files Changed
- Modified:
  - `src/components/timer/timer-content.tsx`
  - `src/components/timer/solve-list-panel.tsx`
  - `src/lib/timer/scramble-worker.ts`
- Added:
  - `src/lib/timer/engine.ts`
  - `src/lib/timer/solve-store.ts`
  - `src/lib/timer/stats-worker.ts`
  - `src/lib/timer/stats-worker-types.ts`
  - `src/lib/timer/telemetry.ts`

## Validation Run
- `npx tsc --noEmit` passed.
- `npm run lint -- <touched timer files>` passed.
- `npm run build` was blocked by an existing Next lock (`.next/lock`) from another running build process.

## Current Feature Flag Behavior
- `TIMER_V2_ENGINE_ENABLED` is controlled by:
  - `NEXT_PUBLIC_TIMER_V2_ENGINE !== "false"`
- Default behavior is enabled unless explicitly set to `"false"`.

## Known Follow-Ups
- Stats worker currently recomputes summary/rolling arrays from current solve state; not yet optimized to true incremental O(1)-style rolling updates.
- No automated test suite was added in this pass (project currently has no timer tests configured).
- If desired, add benchmark harnesses for 1k/5k/10k solve datasets and regression thresholds.

