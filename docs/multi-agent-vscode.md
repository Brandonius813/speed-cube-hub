# Multi-Agent Workflow in VS Code (Visual UI)

This project is now pre-wired for 3 parallel agents.

Shared live lock file:

- `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`

## Worktrees Created

- `../speed-cube-hub-agent-profile` on branch `task/activate-profile-components`
- `../speed-cube-hub-agent-ratelimit` on branch `task/rate-limit-api-routes`
- `../speed-cube-hub-agent-rls` on branch `task/challenges-rls-admin-insert`

## Open in VS Code (No Terminal-First Flow Required)

1. In VS Code, go to **File → Open Workspace from File...**
2. Select `speed-cube-hub-agents.code-workspace`
3. You will see all 4 folders (main + 3 agent folders) in one workspace

For best isolation with Codex UI, open each agent folder in its own VS Code window:

1. Right-click `agent-profile-components` folder → **Open in New Window**
2. Right-click `agent-rate-limit` folder → **Open in New Window**
3. Right-click `agent-challenges-rls` folder → **Open in New Window**

Then run one Codex chat tab per window and keep each tab on only its assigned task.

Before any agent edits code in its worktree, run:

```bash
npm run agent:bootstrap -- --task "Task name"
npm run claims:status
npm run claims:claim -- --task "Task name" --files "src/path-a.ts,src/path-b.ts"
```

While the task is still in progress, refresh the heartbeat occasionally:

```bash
npm run claims:touch
```

When the edit is finished, release the lock:

```bash
npm run claims:release
```

## Suggested Prompt Per Agent

Agent 1 (profile components):
"Implement only: activate `UpcomingCompetitions` and `PBProgressChart` on profile. Follow `AGENTS.md` and update docs/tasks when done."

Agent 2 (rate limiting):
"Implement only: rate limiting for `/api/scramble` and `/api/og` using production-safe storage (Upstash or equivalent). Follow existing conventions and update docs/tasks when done."

Agent 3 (challenges RLS):
"Implement only: SQL migration to restrict `challenges` INSERT to admin users at DB policy level. Update related server action/docs/tasks."

## Coordination Rules

- One task per agent
- One worktree per agent; do not run multiple Codex sessions in the shared `main` worktree
- Let the agent run `npm run agent:bootstrap -- --task "..."` itself; the user should not need to do the setup manually
- Claim exact files/directories in `ACTIVE_CLAIMS.md` before editing
- If `claims:claim` reports a conflict, stop and pick a different path or wait for the other agent
- Do not edit another agent's files unless required and coordinated
- Verify with `npx tsc --noEmit` (avoid concurrent `npm run build`)
- Record outcomes in `AGENT_LOG.md`
