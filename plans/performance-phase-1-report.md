# Phase 1 Performance Report

Date: March 11, 2026
Branch: `codex/performance-foundation-phase-1`
Scope: Foundation fixes only

## Goal

Remove the cross-cutting platform issues that were making public pages request-bound and causing layout instability before the feed/challenges/discover rebuild is hardened.

## Files Changed

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/(main)/layout.tsx`
- `src/app/(main)/leaderboards/page.tsx`
- `src/components/leaderboards/leaderboards-content.tsx`
- `src/components/shared/navbar.tsx`
- `src/lib/actions/leaderboards.ts`
- `src/lib/actions/sor-kinch.ts`
- `src/lib/actions/stats.ts`
- `src/lib/supabase/public.ts`
- `src/proxy.ts`

## Before Baseline

Measured against production on March 11, 2026.

### Homepage `/`

- Response header:
  - `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`
- Initial HTML shape:
  - the page rendered a Suspense placeholder before the main content:
    - `<!--$?--><template id="B:0"></template><!--/$-->`
  - the navbar markup arrived later in a hidden streamed payload:
    - `<div hidden id="S:0"><header ...`
- Extra script cost:
  - global AdSense script present in the root document:
    - `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?...`

### Leaderboards `/leaderboards`

- Response header:
  - `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`

## Changes Implemented

### 1. Removed global AdSense from the app shell

- Deleted the root-level AdSense script from `src/app/layout.tsx`.

### 2. Removed the CLS-prone streamed navbar pattern

- Removed page-level `Suspense fallback={null}` wrappers around `Navbar` on:
  - `src/app/page.tsx`
  - `src/app/(main)/layout.tsx`
- Kept the only query-param-dependent navbar logic behind a narrow local Suspense boundary inside `src/components/shared/navbar.tsx`.

### 3. Added a cookie-free public Supabase helper

- Added `src/lib/supabase/public.ts` with `createPublicClient()`.
- This helper does not call `cookies()`, so it does not bind public reads to the request.

### 4. Moved safe public reads onto the public helper

- `src/lib/actions/stats.ts`
  - homepage global stats now use the public Supabase client
  - wrapped in `unstable_cache(..., { revalidate: 300 })`
- `src/lib/actions/leaderboards.ts`
  - public leaderboard fetches now use the public client
  - friends-only reads still use the authenticated server helper
- `src/lib/actions/sor-kinch.ts`
  - public WCA/SOR/Kinch reads now use the shared public client
  - latest sync timestamp now has explicit caching

### 5. Restored cacheability on public leaderboards

- `src/app/(main)/leaderboards/page.tsx`
  - removed server-side `auth.getUser()`
  - removed forced dynamic rendering
  - added `revalidate = 300`
- `src/components/leaderboards/leaderboards-content.tsx`
  - viewer-specific WCA lookup now happens client-side after hydration

### 6. Narrowed proxy scope

- `src/proxy.ts` no longer matches all public pages.
- Public routes like `/` and `/leaderboards` no longer pay auth refresh/session middleware cost.

## After State

Measured against the local production build from this branch on March 11, 2026.

### Build output

- `npm run build -- --webpack` completed successfully.
- Next.js route output:
  - `/` -> `○ /  Revalidate 5m`
  - `/leaderboards` -> `○ /leaderboards  Revalidate 5m`

### Homepage `/`

- Response headers:
  - `Cache-Control: s-maxage=300, stale-while-revalidate=31535700`
  - `x-nextjs-prerender: 1`
  - `x-nextjs-cache: HIT`
- Initial HTML shape:
  - the `<header ...>` markup is present directly in the first document before `<main>`
- Removed shell script:
  - no `googleads` / `adsbygoogle` script appears in the homepage HTML

### Leaderboards `/leaderboards`

- Response headers:
  - `Cache-Control: s-maxage=300, stale-while-revalidate=31535700`
  - `x-nextjs-prerender: 1`
  - `x-nextjs-cache: HIT`

## Bundle Snapshot

This phase was not intended to materially shrink app JS. The build snapshot is recorded here as the handoff baseline for later phases.

### Homepage script payload from built HTML

- Total script bytes referenced by the built homepage response:
  - `914,940` bytes

Largest homepage script assets in the built response:

- `/_next/static/chunks/5325-1d70d5f62ee05ccc.js` -> `202,761` bytes
- `/_next/static/chunks/2df9c3f6-6c27431ba4816299.js` -> `198,489` bytes
- `/_next/static/chunks/4178-5ca378ec9ae9a622.js` -> `188,634` bytes
- `/_next/static/chunks/polyfills-42372ed130431b0a.js` -> `112,594` bytes

## Verification Commands

- `./node_modules/.bin/tsc --noEmit`
- `./node_modules/.bin/eslint src/app/layout.tsx src/app/page.tsx src/app/(main)/layout.tsx src/app/(main)/leaderboards/page.tsx src/components/shared/navbar.tsx src/components/leaderboards/leaderboards-content.tsx src/lib/actions/stats.ts src/lib/actions/leaderboards.ts src/lib/actions/sor-kinch.ts src/lib/supabase/public.ts src/proxy.ts`
- `npm run build -- --webpack`
- `curl -I http://127.0.0.1:3101/`
- `curl -I http://127.0.0.1:3101/leaderboards`

## Remaining Risks

- The navbar is still a client component, so this phase fixes first-HTML shell stability but not the broader shared-shell JS cost.
- Only the audited public reads were moved in this phase. Other public pages still need the same treatment later if they remain request-bound.
- The worktree uses a symlinked `node_modules`, which breaks Turbopack builds in this isolated worktree. Webpack build validation succeeded; a normal install in the worktree would remove that limitation.
