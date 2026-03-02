---
name: start
description: Start a new parallel agent session. Pulls latest code, reads the task board, claims an available task, and begins work. Run this at the beginning of every new Claude Code session.
disable-model-invocation: true
argument-hint: "[optional: task ID to claim, e.g. T148]"
---

# /start — Parallel Agent Session Startup

You are a parallel Claude Code agent starting a new work session on Speed Cube Hub.

## Step 1: Get the latest code

Run `git pull origin dev` and report the result. If there are merge conflicts, resolve them — for AGENT_LOG.md and TASKS.md, keep both sides.

## Step 2: Read the coordination files

Read all three of these now:

1. `.claude/TASKS.md` — Find which tasks are `🔲 Available`. Note which are `🏗️ In Progress` (claimed by another agent — do NOT touch those).
2. `.claude/AGENT_LOG.md` — Skim the last 3-4 entries. Note any **Warnings** that affect your work.
3. `.claude/SPEED_CUBE_HUB_PRD.md` — Understand overall feature status.

## Step 3: Claim a task

If the user specified a task ID in `$ARGUMENTS`, claim that one. Otherwise, pick the highest-priority available task whose dependencies are all `✅ Done`.

Update `TASKS.md`: change the task status from `🔲 Available` to `🏗️ In Progress` and note `[this session]`.

**Critical rule: only claim one task. Do not claim multiple tasks at once.**

## Step 4: Commit the claim

```bash
git add .claude/TASKS.md
git commit -m "chore: claim [TASK-ID] — [task name]"
git push origin dev
```

If the push fails because another agent pushed first, pull and retry once.

## Step 5: Report to the user

Tell the user (brief, no fluff):

- **What task you claimed** and what it involves
- **Any warnings** from recent AGENT_LOG entries they should know about
- **What you're about to do** (first step of the task)

Then immediately start working on the task. Do not wait for confirmation — per the rules, just go.

## Important reminders

- Use `npx tsc --noEmit` to check TypeScript instead of `npm run build` — multiple agents cannot run the build at the same time due to `.next/lock`
- Push to `dev` after every working feature
- Run `/sync` when you finish the task
- Never touch files that are part of another agent's claimed task
