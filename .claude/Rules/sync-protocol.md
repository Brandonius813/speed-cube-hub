# Sync Protocol for Parallel Sessions

When multiple Claude Code sessions work on this project simultaneously, they coordinate through isolated git worktrees, task branches, and a shared log file.

## The Core Problem This Solves

Without isolation, parallel agents share the same folder — causing `.next/lock` conflicts, duplicate files (e.g., `filename 2.tsx`), and race conditions on task claiming. The worktree + branch-per-agent model makes conflicts technically impossible during work; they only surface at merge time, where they can be reviewed.

## Key Files

- **`.claude/AGENT_LOG.md`** — Shared log where sessions record what they did, what they learned, and warnings for others
- **`.claude/TASKS.md`** — Task board for claiming and tracking work
- **`.claude/SPEED_CUBE_HUB_PRD.md`** — Feature completion tracking

## Per-Agent Setup (Do This Before Starting Work)

Each parallel agent session must have its own isolated environment:

### Step 1 — Create a worktree + branch

In the VS Code integrated terminal (opened from the main repo folder):

```bash
git pull origin dev
git worktree add ../speed-cube-hub-<taskname> -b task/<taskname>
# Example: git worktree add ../speed-cube-hub-t148 -b task/t148-scramble-api
```

### Step 2 — Open the worktree as a VS Code window

In VS Code: **File → Open Folder** → select the new `../speed-cube-hub-<taskname>` folder.

Each VS Code window = one agent = one isolated branch. Claude Code in that window can only affect files in its worktree.

### Step 3 — Claim the task

Inside the worktree session, update `TASKS.md`:
- Change status to `🏗️ In Progress`
- Note which branch you're on (e.g., `[Claude-A | branch: task/t148-scramble-api]`)
- Commit and push the claim: `git push -u origin task/t148-scramble-api`

## During Work

- **Never push to `dev` directly.** Push only to your task branch.
- **Never run `npm run build` if another agent is building.** Use `npx tsc --noEmit` to verify TypeScript instead.
- **Run `/sync` at start and end of each session** to log what you did.
- **Read the last few AGENT_LOG entries** at session start to see what others have done.

## When a Task Is Done

1. Push your final commit to your task branch
2. Mark the task `✅ Done` in TASKS.md and push that too
3. Notify the user (or a coordinator session) that the branch is ready to merge
4. The user (or coordinator) merges: `git merge task/<taskname>` into `dev`
5. Clean up the worktree: `git worktree remove ../speed-cube-hub-<taskname>`

## Merging Order

Merge branches into `dev` one at a time, not all at once. This keeps conflicts small and isolated — one merge problem to solve at a time.

## Rules

1. **One worktree per agent.** Never share a worktree between two agents.
2. **Task branches only push to their branch, never to `dev`.**
3. **If you hit a merge conflict in a coordination file** (AGENT_LOG.md, TASKS.md), keep both sides. For AGENT_LOG.md, keep all entries. For TASKS.md, prefer the more-progressed status (Done > In Progress > Available).
4. **Never edit AGENT_LOG.md by hand.** Only append entries via `/sync`.
5. **Respect warnings from other sessions.** If another session says "don't touch file X" — leave it alone.

## Worktree Cleanup

```bash
# List all active worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../speed-cube-hub-<taskname>

# Remove a worktree that has uncommitted changes (discard them)
git worktree remove --force ../speed-cube-hub-<taskname>

# After removal, optionally delete the task branch
git branch -d task/<taskname>
```

Worktree directories are in `.gitignore` (`.claude/worktrees/`) if using Claude's built-in worktree command — or one level up from the repo if created manually as above.
