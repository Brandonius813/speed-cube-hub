# Speed Cube Hub — Product Requirements Document

## Overview

Speed Cube Hub is a brand new project (separate from speedcube-tracker / brandontruecubing.com). The UI designs are being created in v0.dev and will be handed off for implementation.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Supabase (auth + PostgreSQL + Storage)
- Shadcn/ui, Recharts, date-fns, Zod, React Hook Form
- Deployed on Vercel

## Architecture Decisions

- **Public-first:** All pages publicly viewable. Admin controls hidden via `isAdmin` boolean.
- **Server + Client component pattern:** `page.tsx` (server) fetches data, `*-content.tsx` (client) handles interactivity.
- **Server actions** for mutations and data fetching. Client Supabase for auth checks only.
- **React Compiler** enabled for automatic memoization.

## Database Schema

> To be defined as features are built. Document each table here.

*(No tables created yet)*

## Features

### Planned Features

> Features will be added here as v0 designs are handed off. Each feature should include:
> - Description of what it does
> - Which v0 design it corresponds to
> - Database tables/columns needed
> - Routes/pages involved
> - Status checkbox

*(Awaiting v0 designs)*

### Completed Features

- [x] Project scaffolding (Next.js, Supabase clients, Shadcn/ui, folder structure)

## Routes

```
/                    → Home page (TBD)
```

> Update this section as routes are added.

## Design Source

v0 designs will be linked/referenced here as they are handed off:

*(No designs handed off yet)*

## Notes

- This is a separate project from speedcube-tracker (brandontruecubing.com)
- The user is non-technical — all communication should be in plain English
- Designs come from v0.dev — preserve the visual intent when implementing
