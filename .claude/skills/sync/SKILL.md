---
name: sync
description: Check in with other parallel Claude Code sessions. Pulls latest code, reads shared logs, records what you did, and pushes updates.
disable-model-invocation: true
argument-hint: "[optional: status message like 'finished the feed refactor']"
---

# /sync — Multi-Session Check-In

You are syncing this session with other parallel Claude Code sessions working on this project.

## Current git state
- Branch: !`git branch --show-current`
- Last commit: !`git log --oneline -1`

## Step 1: Pull latest

Run `git pull origin dev` to get the latest code and coordination files. If there are merge conflicts in AGENT_LOG.md or TASKS.md, keep both sides (both entries matter).

## Step 2: Read shared state

Read these three files to understand what's happening across all sessions:

1. `.claude/AGENT_LOG.md` — Recent updates from other sessions. Pay attention to **Warnings** and **Learnings**.
2. `.claude/TASKS.md` — Which tasks are available, in progress, or done.
3. `.claude/SPEED_CUBE_HUB_PRD.md` — Overall feature completion status.

## Step 3: Think about what you did

Reflect on what this session has accomplished. Consider:

- What task(s) did you work on? Use TASKS.md task IDs if applicable.
- What files did you create or modify?
- Did you discover anything surprising — gotchas, bugs, patterns?
- Are you blocked on anything?
- Is there anything other sessions should be careful about? (e.g., "I'm refactoring file X, don't touch it" or "the Y table schema changed")

If the user provided a message with `/sync` ($ARGUMENTS), incorporate it into your update.

## Step 4: Write your log entry

Append a new entry to the **bottom** of `.claude/AGENT_LOG.md` using this format:

```
---

### [DATE TIME PT] — [Brief identifier for this session]

**Task:** [Task ID and name, or "General work"]
**Status:** [What you accomplished — be specific]
**Files touched:** [Key files created or modified]
**Learnings:** [Anything future agents should know, or "None"]
**Blockers:** [Anything blocking progress, or "None"]
**Warnings:** [Things other sessions should watch out for, or "None"]
```

Use the current date and time in Pacific Time. For the session identifier, use a short descriptive label based on what you're working on (e.g., "Feed Refactor Session" or "Dashboard Build").

## Step 5: Update TASKS.md if needed

- If you **completed** a task: change its status from `🏗️ In Progress` to `✅ Done`
- If you're **starting** a new task: change from `🔲 Available` to `🏗️ In Progress`
- If nothing changed, skip this step

## Step 6: Keep the log tidy

Count the `### ` headings in AGENT_LOG.md. If there are more than 20 entries, delete the oldest ones from the **top** to bring it down to 20. The newest entries at the bottom are always kept. Old entries are preserved in git history. This is a hard rule — never let the file exceed ~200 lines.

## Step 7: Commit and push

```bash
git add .claude/AGENT_LOG.md .claude/TASKS.md
git commit -m "sync: [brief summary of what this session did]"
git push origin dev
```

If the push fails because another session pushed first, run `git pull origin dev` and try again. Retry up to 3 times. If it still fails, tell the user.

## Step 8: Report back

Tell the user (keep it short, use bullet points):

1. **What other sessions have been up to** — summarize the last few AGENT_LOG entries
2. **What you logged** — your entry summary
3. **Task board status** — what's available, in progress, and recently completed
4. **Any warnings** from other sessions that affect your current work
