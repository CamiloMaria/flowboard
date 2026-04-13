# Phase 5: Deploy & Documentation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

FlowBoard is live on the internet with a README that tells the full engineering story. Covers: Railway deployment (NestJS backend + PostgreSQL + Redis), Vercel deployment (React frontend with auto-deploy), Docker Compose local dev config, comprehensive README with architecture diagram, live demo link, tech stack showcase, and "Why I Built This" narrative. Does NOT cover new features, UI changes, or code refactoring — only deployment config and documentation.

</domain>

<decisions>
## Implementation Decisions

### README Structure & Content
- **D-01:** Hero-first layout — live demo link at the top with one-line description, then "Why I Built This" narrative, architecture diagram, tech stack badges + table, getting started steps. Optimized for 30-second recruiter scanning.
- **D-02:** Technical narrative tone for "Why I Built This" — first-person, concise, 3-4 paragraphs focusing on the engineering challenges solved (dual WebSockets, CRDTs, presence systems, bot choreography). Professional but shows passion.
- **D-03:** Live demo link as the hero asset — prominent "View Live Demo" button/link pointing to the deployed URL. No GIF or embedded video. Recruiter clicks and sees the real thing.
- **D-04:** Shield.io badges row at top (React, NestJS, TypeScript, PostgreSQL, Redis, Prisma, Socket.io, Yjs) plus a compact table listing each technology with a one-line "why it was chosen."

### Architecture Diagram
- **D-05:** Mermaid code block in README — renders natively on GitHub, no external image to maintain, easy to update. Single system overview diagram showing: Browser → Vercel (React SPA) → Railway (NestJS), with two WebSocket paths (Socket.io for board sync + y-websocket for CRDT editing), PostgreSQL, Redis.
- **D-06:** One comprehensive high-level diagram — recruiter sees the full picture in one glance. No separate subsystem diagrams.

### Docker Compose (Local Dev)
- **D-07:** Infra-only approach — docker-compose.yml runs PostgreSQL + Redis only (current setup). Developer runs `pnpm dev` for NestJS + React apps. Hot reload works natively via Turborepo. README documents the two-step process: `docker compose up -d` then `pnpm dev`.
- **D-08:** README steps only for setup — clear numbered steps: clone, install, docker compose up -d, copy .env.example, pnpm dev. No setup script. Transparent — recruiter sees exactly what each step does.

### Railway Deployment (Backend)
- **D-09:** Custom multi-stage Dockerfile for the NestJS backend — build stage compiles TypeScript + generates Prisma client, production stage runs compiled JS. Railway auto-detects Dockerfile. Handles monorepo correctly (copies root + apps/api + packages/shared).
- **D-10:** Auto-migrate on deploy — Railway start command runs `prisma migrate deploy` before starting the app. Migrations apply automatically on every deploy. Safe because `migrate deploy` only applies pending migrations.
- **D-11:** Auto-seed in start command — `prisma migrate deploy && prisma db seed && node dist/main.js`. Seed runs on every deploy but is idempotent (upserts). Ensures demo board, 3 bots, 17 cards always exist without manual intervention.
- **D-12:** Auto-deploy on push to main — both Railway and Vercel watch the main branch. Standard CI/CD pattern with GitHub integration.

### Vercel Deployment (Frontend)
- **D-13:** Vercel with auto-deploy on push to main. Framework auto-detection for Vite React.
- **D-14:** `VITE_API_URL` environment variable — frontend reads at build time. Vercel sets it to the Railway backend URL. Local dev uses Vite proxy (relative paths). Clean separation between environments.

### Environment Variables
- **D-15:** Committed `.env.example` with placeholder values and comments. Actual secrets set via Railway/Vercel dashboards. README documents which env vars are needed. No .env files committed to git.

### Agent's Discretion
- Exact Dockerfile multi-stage build commands and base image (Node 22 alpine recommended)
- Railway service configuration details (region, instance size)
- Vercel project configuration (root directory, build command)
- CORS configuration for Railway backend → Vercel frontend
- Health check endpoint for Railway
- Mermaid diagram exact syntax and layout
- README section ordering within the established hero-first structure
- Badge selection and ordering
- Getting started section exact wording

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Dark-only theme constraints, component patterns. Relevant for README screenshot context and ensuring deployed app matches design spec.

### Architecture & Stack
- `design-doc.md` — Dual WebSocket architecture, demo bot architecture, CRDT scope, guest user model. Source material for the architecture diagram and "Why I Built This" narrative.
- `.planning/research/STACK.md` — Verified package versions, technology choices and rationale. Source for tech stack table in README.
- `.planning/research/ARCHITECTURE.md` — System structure, component boundaries, data flow diagrams. Source for Mermaid architecture diagram.

### Existing Infrastructure
- `docker-compose.yml` — Current PostgreSQL 16 + Redis 7 config. Phase 5 preserves this as-is.
- `.env.example` — Existing root env example. Needs updating with all required variables.
- `apps/api/.env` — Current API environment variables. Reference for .env.example updates.
- `turbo.json` — Turborepo task graph. Relevant for Vercel build command.
- `pnpm-workspace.yaml` — Monorepo workspace config. Relevant for Dockerfile COPY strategy.

### Phase Dependencies
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — D-03 (port config: NestJS 3001, Vite 5173, proxy paths), D-14 (Prisma 7 generator), D-16 (seed script with demo board, bots, cards).
- `.planning/phases/02-board-core/02-CONTEXT.md` — D-13/D-14 (Socket.io per-board rooms, full entity events).

### Requirements
- `.planning/REQUIREMENTS.md` — DPLY-01 through DPLY-07.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **docker-compose.yml:** PostgreSQL 16 + Redis 7 services already configured. No changes needed for Phase 5.
- **Seed script:** `apps/api/prisma/seed.ts` — creates demo board, 5 lists, 17 cards, 3 bot users. Already idempotent-ready (uses upsert pattern).
- **Root package.json:** `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` scripts via Turborepo.
- **Vite proxy:** `apps/web/vite.config.ts` — `/api`, `/socket.io`, `/yjs` proxied to backend. Works for local dev.
- **.env.example:** Exists at root level. Needs updating with complete variable list.

### Established Patterns
- Turborepo orchestrates build/dev/lint/test across all packages
- pnpm workspaces with `workspace:*` protocol for shared package
- Prisma migrations in `apps/api/prisma/migrations/`
- NestJS compiles to `apps/api/dist/`

### Integration Points
- **Dockerfile:** Must handle monorepo structure (root package.json + pnpm-workspace.yaml + apps/api + packages/shared)
- **Vercel:** Must detect `apps/web` as the build target within the monorepo
- **Railway:** Must configure PostgreSQL + Redis addon services alongside the NestJS app service
- **CORS:** Backend must allow requests from the Vercel frontend URL in production

</code_context>

<specifics>
## Specific Ideas

- The README is a portfolio piece first. Every section should answer: "Would this impress a technical recruiter in 10 seconds of scanning?"
- The live demo link is the most important element — it replaces the need for a GIF. If the deploy is working, the recruiter sees the real thing.
- The "Why I Built This" section should focus on engineering challenges: dual WebSocket coexistence, CRDT collaborative editing, presence systems, bot choreography — not generic "I wanted to learn React" motivation.
- The architecture diagram should make a recruiter think "this person understands system design" at a glance.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-deploy-documentation*
*Context gathered: 2026-04-13*
