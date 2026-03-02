# Commit After Every Working Feature

**GitHub repo:** `Brandonius813/speed-cube-hub` (private)
**Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
**GitHub CLI:** Installed and authenticated as `Brandonius813`

## Single-Agent Sessions (default)

When working alone (one Claude session, no parallel agents):

- **Commit to `dev`** after every working feature
- **Push to `dev`** automatically when done — no need to ask permission
- Pushes cost Vercel build minutes, so batch them when possible

## Parallel-Agent Sessions (worktree mode)

When working as one of multiple parallel agents, **never push to `dev` directly.**

Each agent has its own task branch (e.g., `task/t148-scramble-api`):

- **Commit to your task branch** after every working feature
- **Push to your task branch** when done: `git push origin task/<taskname>`
- **Tell the user** the branch name and that it's ready to merge into `dev`
- The user (or a coordinator session) handles merging into `dev` — not you

## Branch Structure

- **`main`** — Production. Auto-deploys to speedcubehub.com on push. Never push broken code.
- **`dev`** — Staging. Every push creates a Vercel preview. Merge task branches here.
- **`task/<taskname>`** — Per-agent work branches. Created with worktrees, merged into `dev` when done.

## Going Live

When the user says "go live": merge `dev` into `main` and push. Confirm when done.

Never skip hooks (`--no-verify`). Never force-push to `main` or `dev`.
