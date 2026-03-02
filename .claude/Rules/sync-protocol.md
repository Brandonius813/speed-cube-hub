# Sync Protocol for Parallel Sessions

When multiple Claude Code sessions work on this project simultaneously, they coordinate through a shared task board and log file.

## Key Files

- **`.claude/AGENT_LOG.md`** — Shared log where sessions record what they did, what they learned, and warnings for others
- **`.claude/TASKS.md`** — Task board for claiming and tracking work
- **`.claude/SPEED_CUBE_HUB_PRD.md`** — Feature completion tracking

## Starting a New Session

Run `/start` at the beginning of every parallel agent session. It will:
1. Pull the latest code from `dev`
2. Read the task board and agent log
3. Claim an available task
4. Begin working immediately

## During a Session

- **Only claim one task at a time.** Do not start a task another agent has claimed.
- **Never run `npm run build` if another agent may be building.** Use `npx tsc --noEmit` instead — multiple agents cannot run the build simultaneously due to `.next/lock`.
- **Never touch files that belong to another agent's claimed task.**

## Finishing a Session

Run `/sync` when you finish a task. It will:
1. Log what you did to AGENT_LOG.md
2. Mark the task `✅ Done` in TASKS.md
3. Push the coordination files

## Handling Conflicts

- **If two agents accidentally edit the same file:** whoever pushes first wins. The second agent must pull, resolve the conflict, and push again.
- **If there are merge conflicts in AGENT_LOG.md or TASKS.md:** keep both sides. For TASKS.md, prefer the more-progressed status (Done > In Progress > Available).
- **If the push fails:** pull and retry up to 3 times. If it still fails, tell the user.
