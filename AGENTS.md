# AGENTS.md — Codex Operating Guide for Speed Cube Hub

Canonical Codex coordination files are at repository root:

- `AGENTS.md`
- `TASKS.md`
- `AGENT_LOG.md`
- `SPEED_CUBE_HUB_PRD.md`

Native platform planning files live under `plans/`:

- `plans/native-platform-migration.md`
- `plans/native-platform-agent-workstreams.md`

Treat `.claude/` as legacy reference material. Do not update coordination state there.

Live cross-worktree file locks live outside the repo at:

- `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`

## 1) Session Startup Checklist

At the start of each new session:

1. Read `AGENTS.md`
2. Read `SPEED_CUBE_HUB_PRD.md`
3. Read `TASKS.md`
4. Skim recent entries in `AGENT_LOG.md`
5. Read `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`
6. If the task touches native apps, backend-contract extraction, sync, purchases, push, or store release work, read `plans/native-platform-migration.md` and `plans/native-platform-agent-workstreams.md`
7. Check what is already built vs still open
8. Tell the user what is currently built and confirm what to work on next (unless the user already gave a specific task)

## 2) Core Working Rules

- Build exactly what was asked. Do not add extra features.
- Use the smallest change possible.
- Read relevant files before editing anything.
- For non-trivial feature work, create/use a dedicated worktree automatically before editing when running from the shared repo root or when multiple agents may be active.
- Do not ask the user to run normal setup commands like worktree creation, branch creation, or claims commands; do that yourself.
- Before editing, claim the exact files or directories in `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`.
- Do not edit a file or directory that is actively claimed by another agent.
- Do not refactor unrelated working code.
- Do not assume files, functions, tables, or DB columns exist; verify first.
- If something breaks, explain the exact error in plain English, share the likely cause, then apply one targeted fix.
- Keep moving: do not ask for permission to make ordinary code changes once requirements are clear.
- For native-platform migration work, do not deepen Next.js server-action lock-in if a shared backend contract already exists or the plan says one should be introduced first.

## 3) Communication Style

Use plain English for non-technical stakeholders. Always explain:

- What you changed
- Why this approach was chosen
- Which files were changed
- What should happen when it works
- How to test it step by step

Define technical terms briefly when needed.

## 4) Git and Branch Workflow

Repository facts:

- Git root: `/Users/brandontrue/Documents/Coding/speed-cube-hub`
- Repo: `Brandonius813/speed-cube-hub` (private)
- `main`: production (`https://www.speedcubehub.com`)

Default behavior:

- Commit after each working feature
- For parallel work, create a dedicated task branch from `origin/main` in its own worktree
- Push to the task branch after each working feature
- Never push broken code
- Merge task branches into `main` once ready

Parallel-session override (when coordinating multiple agents):

- Follow `TASKS.md` claiming flow (worktree + task branch)
- Claim only one task at a time
- For new feature work, run `npm run agent:bootstrap -- --task "<short task name>"` automatically, then do implementation work in that worktree
- Run `npm run claims:claim -- --task "<task>" --files "path/one,path/two"` before editing
- Run `npm run claims:touch` if the task stays active for a while
- Run `npm run claims:release` as soon as the claimed edit is finished
- Do not touch files owned by another claimed task
- Log work in `AGENT_LOG.md`
- Treat `/Users/brandontrue/Documents/Coding/speed-cube-hub` as merge/integration space only when multiple agents are active; do feature work in dedicated worktrees

## 5) Build/Test Commands

Run from project root:

```bash
npm run dev
npm run dev:up
npm run dev:status
npm run dev:down
npm run agent:bootstrap -- --task "Task name"
npm run claims:status
npm run claims:claim -- --task "Task name" --files "src/path-a.ts,src/path-b.ts"
npm run claims:touch
npm run claims:release
npm run build
npm run lint
```

Localhost stability rule:

- If you need the dev server to keep running after a terminal closes, use `npm run dev:up` and stop it with `npm run dev:down`.
- Use `http://127.0.0.1:3000` for local access (HTTP, not HTTPS).

No formal automated test suite is configured.

For parallel agent work, prefer:

```bash
npx tsc --noEmit
```

Reason: avoid `.next/lock` conflicts from concurrent builds.

## 11) Live Coordination Locks

Use the shared coordination helper from any worktree:

```bash
npm run agent:bootstrap -- --task "Task name"
npm run claims:status
npm run claims:claim -- --task "Task name" --files "src/path-a.ts,src/path-b.ts"
npm run claims:touch
npm run claims:release
```

Rules:

- `agent:bootstrap` creates or reuses a dedicated `codex/...` branch + sibling worktree automatically
- Claim exact files when possible; claim a directory only if you expect to touch several files inside it
- If `claims:claim` reports a conflict, do not edit that path until the other claim is released
- `AGENT_LOG.md` is the handoff/history log; `ACTIVE_CLAIMS.md` is only for live in-progress file locks

## 6) Product and Architecture Constraints

Product direction:

- "Strava for Cubing" (practice tracking + social + future coaching)
- Public-first: pages are publicly viewable; admin controls gated with `isAdmin`

App architecture:

- Next.js App Router
- `page.tsx` server component fetches data
- `*-content.tsx` client component handles interaction
- Server actions in `src/lib/actions/*.ts`
- Client Supabase usage for auth checks only
- Service-role admin client must stay server-side only
- Public profile compare route lives at `/profile/[handle]/compare` and stays opt-in; the base profile view remains the default experience

Timer area:

- Timer is large and performance-sensitive
- Avoid adding complexity unless explicitly requested
- Check file size before editing; split/extract if a file exceeds ~400 lines

## 7) UI/UX Constraints

- Mobile-first always
- No horizontal overflow at 375px width
- Minimum 44x44 touch targets
- No hover-only functionality
- Body text minimum 16px on mobile
- Use `font-mono` for solve times and numeric stats

Design system references:

- Dark-first theme
- Nunito + JetBrains Mono

## 8) Data and Safety Conventions

- Session/stat times in DB are decimal seconds
- Timer solves in `solves` table are integer milliseconds
- Timezone convention: `America/Los_Angeles`

Critical safety note from PRD:

- Task T51 (`select("*")` replacement) was reverted multiple times.
- Do not retry T51 without a live Supabase schema audit for every affected table/column.

## 9) Documentation Discipline

After any completed feature:

1. Update `AGENTS.md` if conventions/routes/key files changed
2. Update `SPEED_CUBE_HUB_PRD.md` feature status
3. Keep `TASKS.md` concise (completed tasks collapsed to one-line format)

## 10) Definition of Done (Per Feature)

A task is complete only when:

1. Feature behavior works
2. Code quality is acceptable with minimal blast radius
3. Any needed checks (`lint`, `build`, or `npx tsc --noEmit`) are run
4. Docs/tracking files are updated if needed
5. User receives plain-English test steps and expected results
