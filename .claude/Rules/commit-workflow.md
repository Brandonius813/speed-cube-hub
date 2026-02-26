# Commit After Every Working Feature

**GitHub repo:** `Brandonius813/speed-cube-hub` (private)
**Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
**GitHub CLI:** Installed and authenticated as `Brandonius813`

**Branching workflow:**
- **`dev` branch** — All new work happens here. Commit to `dev` after every working feature.
- **Vercel preview deployments** — Every push to `dev` creates a preview URL for testing before going live. Pushes cost build minutes, so batch them.
- **`main` branch** — Production only. Pushing to `main` automatically deploys to production.
- **To go live:** When a feature is tested and approved, merge `dev` into `main` and push.

**Commit and Push:**
- **Commit and push to `dev`** after every working feature. Tell the user what was committed and pushed.
- Do not wait for permission to push — just push to `dev` automatically when the feature is done.

When the user says to go live, merge `dev` into `main` and push. No need to ask — just do it and confirm.

Never push broken code. Always tell the user what is being committed.
