# CLAUDE.md — Speed Cube Hub

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Follow every rule in `.claude/Rules/` on every interaction, without exception. Rules are split into separate files and automatically loaded by Claude Code.

## Development Commands

All commands must be run from the project root (`speed-cube-hub/`).

```bash
npm run dev      # Start dev server (Next.js with Turbopack)
npm run build    # Production build — run before pushing to verify no errors
npm run lint     # ESLint
```

There are no tests configured in this project yet.

## Git & Deployment

- **Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
- **Repo:** `Brandonius813/speed-cube-hub` (private)
- **`dev` branch:** All new work goes here. Push triggers Vercel preview deployment.
- **`main` branch:** Production. Push auto-deploys to production domain.
- **Workflow:** Commit and push to `dev` after every working feature. When user says "go live," merge `dev` into `main` and push.

## Architecture Overview

### Public-First Pattern

Every page is publicly viewable. Admin controls are conditionally rendered using `{isAdmin && ...}`.

### Server Components + Client Components

Each page uses a two-file pattern:

1. **`page.tsx`** (server component) — Fetches data on the server via `Promise.all`, passes results as props. Marked `export const dynamic = "force-dynamic"` for fresh data on every request.
2. **`*-content.tsx`** (client component) — Receives initial data as props (no loading spinner), handles interactivity (filters, modals, admin controls). Auth check runs in a `useEffect` to determine `isAdmin` for showing edit/delete buttons.

### Server Actions vs Client-Side Supabase

- **Server actions** (`src/lib/actions/*.ts`): Use `"use server"` directive. Called from server components (initial data fetch) and client components (mutations, filtered queries).
- **Client components**: Use `getSupabaseClient()` from `src/lib/supabase/client.ts` (singleton) for auth checks only.
- **Admin server client**: `createAdminClient()` from `src/lib/supabase/admin.ts` for service-role operations that bypass RLS. Never use in client-side code.

### Key Files

- `src/lib/utils.ts` — `cn()` (Tailwind class merge utility from Shadcn)
- `src/lib/supabase/client.ts` — Browser-side Supabase singleton
- `src/lib/supabase/server.ts` — Server-side Supabase client (uses cookies)
- `src/lib/supabase/admin.ts` — Service-role client (bypasses RLS)
- `src/lib/actions/` — Server actions directory
- `src/lib/actions/wca.ts` — WCA API integration (fetch results, update WCA ID)
- `src/components/ui/` — Shadcn/ui components
- `src/components/shared/` — Shared app components (navbar, etc.)
- `src/components/profile/` — Profile page components (header, stats, WCA results, etc.)

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json). Example: `import { cn } from "@/lib/utils"`.

## Tech Stack

- Next.js 16 (App Router) with Turbopack
- React 19 with React Compiler enabled
- TypeScript (strict mode)
- Tailwind CSS v4
- Supabase (auth + PostgreSQL + Storage) via `@supabase/ssr`
- Shadcn/ui (component library)
- Recharts (charts)
- date-fns (date utilities)
- Zod (schema validation)
- React Hook Form + @hookform/resolvers
- Lucide React (icons)
- Deployed on Vercel

## Data Conventions

- **Database stores times as decimal seconds** (e.g., `10.32`). Display with a `formatTime()` utility.
- **Timezone:** Pacific Time (`America/Los_Angeles`), hardcoded in date helpers.

## Environment Variables

See `.env.local.example` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- `ADMIN_USER_ID` — Admin user ID for server-side data fetches

## Design System

- **Theme:** Dark-first. See PRD "Style Guide" section for full color reference.
- **Fonts:** Inter (sans-serif, body/headings) + JetBrains Mono (monospace, numbers/stats/times)
- **Design source:** v0 repo at `Brandonius813/speed-cube-hub-visual-design`
- **Monospace for numbers:** Always use `font-mono` for solve times, stats, and numeric data.

## Routes

```
/                    → Landing page (hero, features, social proof)
/login               → Login page (email + password)
/signup              → Signup page (email + password + display name)
/dashboard           → Practice stats dashboard (filters, charts, session log) [protected]
/profile             → User profile (header, stats, cubes, PBs, links, activity) [protected]
/log                 → Log a practice session (form) [protected]
```

Routes will be added as features are built. Keep this section updated.

## PRD Location

The product requirements document is at `.claude/SPEED_CUBE_HUB_PRD.md`. Read it at the start of every session to understand what's been built and what's remaining.

## Task List (Multi-Session)

The shared task list is at `.claude/TASKS.md`. This is a coordinated task board designed for up to 5 Claude sessions working in parallel. Each session should:

1. `git pull origin dev` before starting
2. Claim an available task by updating its status to `🏗️ In Progress`
3. Commit the claim immediately so other sessions see it
4. Build the feature, then mark it `✅ Done` and push

Always check dependencies before claiming a task — don't start work that depends on unfinished tasks.

## Feature Status

Features will be tracked in the PRD with checkmarks. Refer to it for current progress.
