# Phase 5: Deploy & Documentation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

FlowBoard is live on the internet with a README that tells the full engineering story. Covers: Oracle Cloud deployment (NestJS backend + PostgreSQL + Redis in Docker Compose, Nginx reverse proxy with Let's Encrypt SSL), Vercel deployment (React frontend with auto-deploy), GitHub Actions CI/CD (SSH deploy on push to main), Docker Compose local dev config, comprehensive README with architecture diagram, live demo link, tech stack showcase, and "Why I Built This" narrative. Does NOT cover new features, UI changes, or code refactoring — only deployment config and documentation.

</domain>

<decisions>
## Implementation Decisions

### README Structure & Content
- **D-01:** Hero-first layout — live demo link at the top with one-line description, then "Why I Built This" narrative, architecture diagram, tech stack badges + table, getting started steps. Optimized for 30-second recruiter scanning.
- **D-02:** Technical narrative tone for "Why I Built This" — first-person, concise, 3-4 paragraphs focusing on the engineering challenges solved (dual WebSockets, CRDTs, presence systems, bot choreography). Professional but shows passion.
- **D-03:** Live demo link as the hero asset — prominent "View Live Demo" button/link pointing to the deployed URL. No GIF or embedded video. Recruiter clicks and sees the real thing.
- **D-04:** Shield.io badges row at top (React, NestJS, TypeScript, PostgreSQL, Redis, Prisma, Socket.io, Yjs) plus a compact table listing each technology with a one-line "why it was chosen."

### Architecture Diagram
- **D-05:** Mermaid code block in README — renders natively on GitHub, no external image to maintain, easy to update. Single system overview diagram showing: Browser → Vercel (React SPA) → Oracle Cloud (Nginx → NestJS), with two WebSocket paths (Socket.io for board sync + y-websocket for CRDT editing), PostgreSQL, Redis — all on the same VM.
- **D-06:** One comprehensive high-level diagram — recruiter sees the full picture in one glance. No separate subsystem diagrams.

### Docker Compose (Local Dev)
- **D-07:** Infra-only approach — docker-compose.yml runs PostgreSQL + Redis only (current setup). Developer runs `pnpm dev` for NestJS + React apps. Hot reload works natively via Turborepo. README documents the two-step process: `docker compose up -d` then `pnpm dev`.
- **D-08:** README steps only for setup — clear numbered steps: clone, install, docker compose up -d, copy .env.example, pnpm dev. No setup script. Transparent — recruiter sees exactly what each step does.

### Oracle Cloud Deployment (Backend)
- **D-09:** Custom multi-stage Dockerfile following the NotifyHub pattern — Stage 1 (builder): `node:22-alpine`, corepack enable pnpm, install all deps, build shared then API, generate Prisma client. Stage 2 (production): install prod deps only, copy built artifacts, run as non-root `node` user, HEALTHCHECK on `/health`. Reference implementation: `/home/camailo/Documents/notifyhub/Dockerfile`.
- **D-10:** `docker-compose.prod.yml` for production — runs API (built from Dockerfile), PostgreSQL 16, and Redis 7 in a single bridge network. PostgreSQL and Redis have healthchecks. API `depends_on` both with `condition: service_healthy`. All services use `restart: unless-stopped`. Environment variables from `.env` file on the server. Same pattern as NotifyHub.
- **D-11:** Auto-migrate + auto-seed in Dockerfile CMD — `prisma migrate deploy && prisma db seed && node dist/main.js`. Migrations and seed run on every container start. Seed is idempotent (upserts). Ensures demo board, 3 bots, 17 cards always exist.
- **D-12:** GitHub Actions CI/CD — on push to `main`, SSH into Oracle Cloud VM via `appleboy/ssh-action`, `git pull`, `docker compose -f docker-compose.prod.yml up --build -d`, then health check. Same pattern as NotifyHub (`.github/workflows/deploy.yml`). GitHub Secrets: `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`.
- **D-13:** `scripts/deploy.sh` for manual deploys — git pull, docker compose up --build, health check loop (30 attempts × 2s), HTTPS verification. Can be run locally on the VM or via SSH.
- **D-14:** Nginx reverse proxy on the Oracle Cloud VM (not in Docker) — HTTP→HTTPS redirect, Let's Encrypt SSL via certbot. **Three location blocks**: `/` for API proxy, `/socket.io/` for Socket.io WebSocket with upgrade headers + 7d timeouts, `/yjs/` for y-websocket with upgrade headers + 7d timeouts. FlowBoard-specific addition over NotifyHub: the `/yjs/` WebSocket path. Reference: `/home/camailo/Documents/notifyhub/infra/nginx/notifyhub.conf`.
- **D-15:** `.env.production.example` with production-specific variables (POSTGRES_PASSWORD, JWT secrets, CORS_ORIGIN pointing to Vercel URL). Separate from `.env.example` (local dev). Actual `.env` on the server is not committed.

### Vercel Deployment (Frontend)
- **D-16:** Vercel with auto-deploy on push to main. Framework auto-detection for Vite React. `vercel.json` with SPA rewrite (`/(.*) → /index.html`) and immutable cache headers for `/assets/`. Same pattern as NotifyHub.
- **D-17:** `VITE_API_URL` environment variable — frontend reads at build time. Vercel sets it to the Oracle Cloud backend HTTPS URL. Local dev uses Vite proxy (relative paths). Clean separation between environments.

### Environment Variables
- **D-18:** Two env example files committed: `.env.example` (local dev with localhost defaults) and `.env.production.example` (Oracle Cloud with placeholder secrets). Actual secrets configured on the VM's `.env` and in Vercel dashboard. No real secrets committed to git.

### Agent's Discretion
- Exact Dockerfile multi-stage build commands (adapt from NotifyHub pattern for FlowBoard's `apps/` vs `packages/` structure)
- FlowBoard API domain/subdomain name (user configures DNS and certbot)
- Exact NestJS port in production (3001 locally, likely 3000 in Docker — match NotifyHub pattern)
- Vercel project configuration (root directory, build command)
- CORS configuration for Oracle Cloud backend → Vercel frontend
- Health check endpoint implementation (`/health` checking DB + Redis)
- Mermaid diagram exact syntax and layout
- README section ordering within the established hero-first structure
- Badge selection and ordering
- Getting started section exact wording
- `.dockerignore` contents (exclude `apps/web`, tests, docs, IDE files — match NotifyHub pattern)

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

### Reference Implementation (NotifyHub)
- `/home/camailo/Documents/notifyhub/Dockerfile` — Multi-stage build pattern for pnpm monorepo. Adapt `packages/` paths to FlowBoard's `apps/` + `packages/` structure.
- `/home/camailo/Documents/notifyhub/docker-compose.prod.yml` — Production Docker Compose with API + PostgreSQL + Redis in bridge network. Adapt service name and env vars for FlowBoard.
- `/home/camailo/Documents/notifyhub/scripts/deploy.sh` — Deploy script with health check loop. Adapt domain and compose file reference.
- `/home/camailo/Documents/notifyhub/.github/workflows/deploy.yml` — GitHub Actions CI/CD via SSH. Adapt repo path and branch name.
- `/home/camailo/Documents/notifyhub/infra/nginx/notifyhub.conf` — Nginx config with WebSocket proxy. **Must add `/yjs/` location block** for FlowBoard's dual WebSocket setup.
- `/home/camailo/Documents/notifyhub/packages/web/vercel.json` — Vercel SPA rewrite + cache headers.
- `/home/camailo/Documents/notifyhub/.env.production.example` — Production env template.
- `/home/camailo/Documents/notifyhub/.dockerignore` — Docker build exclusions for monorepo.

### Existing Infrastructure
- `docker-compose.yml` — Current PostgreSQL 16 + Redis 7 config for local dev. Phase 5 preserves this as-is.
- `.env.example` — Existing root env example. Needs updating with all required variables.
- `apps/api/.env` — Current API environment variables. Reference for .env.example updates.
- `turbo.json` — Turborepo task graph. Relevant for Vercel build command.
- `pnpm-workspace.yaml` — Monorepo workspace config. Relevant for Dockerfile COPY strategy.

### Phase Dependencies
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — D-03 (port config: NestJS 3001, Vite 5173, proxy paths), D-08/D-09 (dual WebSocket pattern: Socket.io + y-websocket on separate paths), D-14 (Prisma 7 generator), D-16 (seed script with demo board, bots, cards).
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
- **Dockerfile:** Must handle monorepo structure (root package.json + pnpm-workspace.yaml + apps/api + packages/shared). FlowBoard uses `apps/` not `packages/` for the API — adapt NotifyHub's COPY paths.
- **Vercel:** Must detect `apps/web` as the build target within the monorepo
- **Nginx:** Must proxy three paths: `/` (REST API), `/socket.io/` (Socket.io WebSocket), `/yjs/` (y-websocket). Both WebSocket paths need `Upgrade` + `Connection` headers and long timeouts.
- **CORS:** Backend must allow requests from the Vercel frontend URL in production
- **Prisma in Docker:** `prisma generate` must run during the build stage. The generated client must be available in the production stage.

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
