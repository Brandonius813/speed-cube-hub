## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server (interactive terminal):

```bash
npm run dev
```

Or start it as a persistent background process (recommended when you want it to stay up until you stop it):

```bash
npm run dev:up
npm run dev:status
npm run dev:logs
```

Stop the background server:

```bash
npm run dev:down
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

Use `http://` for local development, not `https://`.

## Parallel Codex Sessions

When multiple Codex agents are running, use the shared live claims file before editing:

```bash
npm run agent:bootstrap -- --task "Task name"
npm run claims:status
npm run claims:claim -- --task "Task name" --files "src/path-a.ts,src/path-b.ts"
npm run claims:touch
npm run claims:release
```

The shared file lives at `/Users/brandontrue/Documents/Coding/speed-cube-hub-coordination/ACTIVE_CLAIMS.md`.
Use it for live file locks only. Put finished handoff notes in `AGENT_LOG.md`.
`agent:bootstrap` creates or reuses a sibling worktree and `codex/...` branch automatically so the user does not need to do that setup by hand.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with Nunito and JetBrains Mono.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
