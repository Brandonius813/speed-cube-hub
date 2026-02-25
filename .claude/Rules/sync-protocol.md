# Sync Protocol for Parallel Sessions

When multiple Claude Code sessions work on this project simultaneously, they coordinate through a shared log file and the `/sync` command.

## Key Files

- **`.claude/AGENT_LOG.md`** — Shared log where sessions record what they did, what they learned, and warnings for others
- **`.claude/TASKS.md`** — Task board for claiming and tracking work
- **`.claude/SPEED_CUBE_HUB_PRD.md`** — Feature completion tracking

## Rules

1. **Run `/sync` at the start and end of every work session.** Also run it after completing any task.
2. **Always `git pull origin dev` before making changes.** Other sessions may have pushed while you were working.
3. **Read the last few AGENT_LOG entries** when starting a session to see what others have been doing.
4. **Respect warnings from other sessions.** If another session says "don't touch file X, I'm refactoring it" — leave it alone.
5. **Never edit AGENT_LOG.md by hand.** Only append entries via `/sync`.
6. **If you hit a merge conflict in a coordination file,** keep both sides. For AGENT_LOG.md, keep all entries. For TASKS.md, prefer the more-progressed status (Done > In Progress > Available).
