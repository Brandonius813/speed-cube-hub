---
name: sync
description: Sync a parallel Codex session with other active sessions on Speed Cube Hub. Pull latest dev branch, review shared coordination docs, append AGENT_LOG entry, update TASKS when needed, and push.
---

# Multi-Session Check-In

Use this skill to check in work with other parallel sessions.

## Step 1: Pull latest

Run `git pull origin dev`. If there are merge conflicts in `.claude/AGENT_LOG.md` or `.claude/TASKS.md`, keep both sides.

## Step 2: Read shared state

Read:

1. `.claude/AGENT_LOG.md` for recent updates, warnings, and learnings
2. `.claude/TASKS.md` for current task ownership and status
3. `.claude/SPEED_CUBE_HUB_PRD.md` for overall feature completion context

## Step 3: Summarize this session

Reflect on:

- Task IDs worked on
- Files created or modified
- Key learnings or gotchas
- Current blockers
- Warnings for other sessions

If the user included a status message, incorporate it.

## Step 4: Append AGENT_LOG entry

Add a new entry at the bottom of `.claude/AGENT_LOG.md` using this format:

```text
---

### [DATE TIME PT] - [Brief session label]

**Task:** [Task ID and name, or "General work"]
**Status:** [Concrete accomplishments]
**Files touched:** [Key files]
**Learnings:** [Details, or "None"]
**Blockers:** [Details, or "None"]
**Warnings:** [Details, or "None"]
```

Use Pacific Time.

## Step 5: Update TASKS if status changed

- Completed task: `🏗️ In Progress` -> `✅ Done`
- Newly started task: `🔲 Available` -> `🏗️ In Progress`
- Otherwise, leave unchanged

## Step 6: Keep AGENT_LOG trimmed

If `.claude/AGENT_LOG.md` has more than 20 `### ` entries, remove oldest entries from the top until only 20 remain.

## Step 7: Commit and push

```bash
git add .claude/AGENT_LOG.md .claude/TASKS.md
git commit -m "sync: [brief summary]"
git push origin dev
```

If push fails due remote updates, pull and retry up to 3 times.

## Step 8: Report back

Return a short report to the user:

1. What other sessions have been doing (from recent log entries)
2. What this session logged
3. Task board status (available/in-progress/recently done)
4. Any warnings that affect current work
