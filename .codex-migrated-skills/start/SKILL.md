---
name: start
description: Start a new parallel Codex session for Speed Cube Hub. Pull latest code, read coordination files, claim one available task, commit the claim, and begin implementation.
---

# Start Parallel Session

Use this skill at the beginning of a new Codex session on Speed Cube Hub.

## Step 1: Pull latest code

Run `git pull origin dev` and report the result. If merge conflicts occur in `.claude/AGENT_LOG.md` or `.claude/TASKS.md`, keep both sides.

## Step 2: Read coordination files

Read these files now:

1. `.claude/TASKS.md` and identify tasks marked `🔲 Available`. Do not touch tasks already marked `🏗️ In Progress`.
2. `.claude/AGENT_LOG.md` and skim the last 3-4 entries for warnings and constraints.
3. `.claude/SPEED_CUBE_HUB_PRD.md` to understand feature status.

## Step 3: Claim one task

If the user named a task ID (for example `T148`), claim that task. Otherwise, pick the highest-priority available task whose dependencies are all `✅ Done`.

Update `.claude/TASKS.md`: change the task status from `🔲 Available` to `🏗️ In Progress` and note `[this session]`.

Claim exactly one task.

## Step 4: Commit the claim

```bash
git add .claude/TASKS.md
git commit -m "chore: claim [TASK-ID] - [task name]"
git push origin dev
```

If push fails because another agent pushed first, pull and retry once.

## Step 5: Report and begin

Tell the user briefly:

- Which task was claimed and what it involves
- Any warnings from recent `AGENT_LOG.md` entries
- The first implementation step you are starting

Then start work immediately.

## Reminders

- Use `npx tsc --noEmit` for TypeScript checks instead of `npm run build` when `.next/lock` contention is possible
- Push to `dev` after each working feature
- Run the `sync` skill when finishing a task
- Do not edit files owned by another in-progress task
