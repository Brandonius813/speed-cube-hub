# AGENTS.md — Codex Operating Guide for Speed Cube Hub

Canonical Codex coordination files are at repository root:

- `AGENTS.md`
- `TASKS.md`
- `AGENT_LOG.md`
- `SPEED_CUBE_HUB_PRD.md`

Treat `.claude/` as legacy reference material. Do not update coordination state there.

## 1) Session Startup Checklist

At the start of each new session:

1. Read `AGENTS.md`
2. Read `SPEED_CUBE_HUB_PRD.md`
3. Read `TASKS.md`
4. Skim recent entries in `AGENT_LOG.md`
5. Check what is already built vs still open
6. Tell the user what is currently built and confirm what to work on next (unless the user already gave a specific task)

## 2) Core Working Rules

- Build exactly what was asked. Do not add extra features.
- Use the smallest change possible.
- Read relevant files before editing anything.
- Do not refactor unrelated working code.
- Do not assume files, functions, tables, or DB columns exist; verify first.
- If something breaks, explain the exact error in plain English, share the likely cause, then apply one targeted fix.
- Keep moving: do not ask for permission to make ordinary code changes once requirements are clear.

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
- Do not touch files owned by another claimed task
- Log work in `AGENT_LOG.md`

## 5) Build/Test Commands

Run from project root:

```bash
npm run dev
npm run build
npm run lint
```

No formal automated test suite is configured.

For parallel agent work, prefer:

```bash
npx tsc --noEmit
```

Reason: avoid `.next/lock` conflicts from concurrent builds.

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
