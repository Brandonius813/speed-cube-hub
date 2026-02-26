# Commit After Every Working Feature

**GitHub repo:** `Brandonius813/speed-cube-hub` (private)
**Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
**GitHub CLI:** Installed and authenticated as `Brandonius813`

**Branching workflow:**
- **`dev` branch** — All new work happens here. Commit to `dev` after every working feature.
- **Vercel preview deployments** — Every push to `dev` creates a preview URL for testing before going live. Pushes cost build minutes, so batch them.
- **`main` branch** — Production only. Pushing to `main` automatically deploys to production.
- **To go live:** When a feature is tested and approved, merge `dev` into `main` and push.

**Commit vs Push (important for build costs):**
- **Commit locally** after every working feature. Tell the user what was committed.
- **Only push to `dev`** when:
  - The user explicitly says to push (e.g., "push", "deploy", "send it", "push it up")
  - A work session is ending
  - Multiple features are batched and ready for preview testing
- After committing, say: "Committed locally. Ready to push when you want to preview."

When the user says to go live, merge `dev` into `main` and push. No need to ask — just do it and confirm.

Never push broken code. Always tell the user what is being committed.
