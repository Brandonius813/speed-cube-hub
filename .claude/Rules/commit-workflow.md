# Commit After Every Working Feature

**GitHub repo:** `Brandonius813/speed-cube-hub` (private)
**Git root:** `/Users/brandontrue/Documents/Coding/speed-cube-hub/`
**GitHub CLI:** Installed and authenticated as `Brandonius813`

**Branching workflow:**
- **`dev` branch** — All new work happens here. Commit and push to `dev` for testing.
- **Vercel preview deployments** — Every push to `dev` creates a preview URL for testing before going live.
- **`main` branch** — Production only. Pushing to `main` automatically deploys to production.
- **To go live:** When a feature is tested and approved, merge `dev` into `main` and push.

When a feature is complete and working, commit and push to `dev` automatically. Tell the user what was committed and that it's on the preview URL.

When the user says to go live, merge `dev` into `main` and push. No need to ask — just do it and confirm.

Never push broken code. Always tell the user what is being committed.
