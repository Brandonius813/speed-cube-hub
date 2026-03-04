# Multi-Agent Workflow in VS Code (Visual UI)

This project is now pre-wired for 3 parallel agents.

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

## Suggested Prompt Per Agent

Agent 1 (profile components):
"Implement only: activate `UpcomingCompetitions` and `PBProgressChart` on profile. Follow `.claude/CLAUDE.md`, `.claude/Rules/*`, and update docs/tasks when done."

Agent 2 (rate limiting):
"Implement only: rate limiting for `/api/scramble` and `/api/og` using production-safe storage (Upstash or equivalent). Follow existing conventions and update docs/tasks when done."

Agent 3 (challenges RLS):
"Implement only: SQL migration to restrict `challenges` INSERT to admin users at DB policy level. Update related server action/docs/tasks."

## Coordination Rules

- One task per agent
- Do not edit another agent's files unless required and coordinated
- Verify with `npx tsc --noEmit` (avoid concurrent `npm run build`)
- Record outcomes in `.claude/AGENT_LOG.md`
