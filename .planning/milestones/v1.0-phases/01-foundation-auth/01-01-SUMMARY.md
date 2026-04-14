---
phase: 01-foundation-auth
plan: 01
subsystem: infra
tags: [turborepo, pnpm, nestjs, vite, react, docker, postgresql, redis, monorepo]

# Dependency graph
requires: []
provides:
  - "Monorepo scaffold with Turborepo + pnpm workspaces"
  - "NestJS API app with health endpoint at /api"
  - "Vite React frontend with proxy config for API/WS"
  - "Shared types package (@flowboard/shared) with auth, board, WS event types"
  - "Docker Compose for PostgreSQL 16 + Redis 7 local dev"
affects: [01-foundation-auth, 02-database-websocket, 03-board-crud, 04-frontend-shell]

# Tech tracking
tech-stack:
  added: [turborepo@2.9.6, pnpm-workspaces, nestjs@11.1, vite@8.0, react@19.2, tailwindcss@4.2, socket.io@4.8, yjs@13.6, prisma@7.7, bcrypt@6.0, ioredis@5.10]
  patterns: [JIT-internal-packages, turbo-task-graph, nestjs-global-prefix-api, vite-proxy-config]

key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - turbo.json
    - docker-compose.yml
    - .env.example
    - .gitignore
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/nest-cli.json
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/src/app.controller.ts
    - apps/api/src/app.service.ts
    - apps/web/package.json
    - apps/web/vite.config.ts
    - apps/web/index.html
    - apps/web/src/main.tsx
    - apps/web/src/App.tsx
    - apps/web/src/app.css
    - packages/shared/package.json
    - packages/shared/src/index.ts
    - packages/shared/src/auth.types.ts
    - packages/shared/src/board.types.ts
    - packages/shared/src/ws-events.types.ts
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "JIT internal packages pattern for @flowboard/shared — main and types point to ./src/index.ts, no build step"
  - "NestJS global prefix 'api' with health endpoint at GET /api"
  - "Vite proxy config for /api, /socket.io, and /yjs paths to backend on port 3001"
  - "pnpm onlyBuiltDependencies whitelist for bcrypt, prisma, @prisma/engines, @nestjs/core"

patterns-established:
  - "Monorepo layout: apps/api (NestJS), apps/web (Vite React), packages/shared (types only)"
  - "Workspace protocol: @flowboard/shared linked via workspace:* in both apps"
  - "Turbo task graph: build depends on ^build, dev is persistent + no-cache"
  - "NestJS bootstrap: ValidationPipe with whitelist, CORS for localhost:5173, cookie-parser"

requirements-completed: [FNDN-01, FNDN-02]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 01 Plan 01: Monorepo Scaffold Summary

**Turborepo + pnpm monorepo with NestJS API (health endpoint), Vite React frontend (proxy config), shared types package, and Docker Compose for PostgreSQL 16 + Redis 7**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T02:48:52Z
- **Completed:** 2026-04-12T02:53:13Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments
- Monorepo scaffold with Turborepo 2.9.6 + pnpm workspaces (apps/*, packages/*)
- NestJS API with health endpoint responding at GET /api with `{"status":"ok"}`
- Vite React frontend with proxy config forwarding /api, /socket.io, /yjs to backend
- Shared types package exporting UserPayload, Board, List, Card, WsEventType interfaces
- Docker Compose with PostgreSQL 16-alpine and Redis 7-alpine for local development
- All Phase 1 dependencies installed (NestJS, Prisma, Socket.io, Yjs, bcrypt, ioredis, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo scaffold with Turborepo, pnpm workspaces, Docker Compose, and shared types package** - `588ccd4` (feat)
2. **Task 2: Create NestJS API app and Vite React frontend app with dependency installation** - `b42ee72` (feat)

## Files Created/Modified
- `package.json` — Root workspace config with turbo, pnpm build approvals
- `pnpm-workspace.yaml` — Workspace definition for apps/* and packages/*
- `turbo.json` — Task graph for build, dev, lint, test
- `docker-compose.yml` — PostgreSQL 16 + Redis 7 for local dev
- `.env.example` — Database, Redis, JWT configuration template
- `.gitignore` — Ignores node_modules, .env, dist, .turbo, generated Prisma
- `apps/api/package.json` — NestJS API with all Phase 1 backend dependencies
- `apps/api/tsconfig.json` — TypeScript config with decorator metadata
- `apps/api/nest-cli.json` — NestJS CLI configuration
- `apps/api/src/main.ts` — NestJS bootstrap with global prefix, validation, CORS
- `apps/api/src/app.module.ts` — Root module with ConfigModule
- `apps/api/src/app.controller.ts` — Health check endpoint
- `apps/api/src/app.service.ts` — Health service
- `apps/web/package.json` — Vite React with frontend dependencies
- `apps/web/vite.config.ts` — Vite with proxy for API/WebSocket paths
- `apps/web/index.html` — HTML entry point
- `apps/web/src/main.tsx` — React 19 createRoot entry
- `apps/web/src/App.tsx` — Minimal FlowBoard placeholder
- `apps/web/src/app.css` — Tailwind v4 CSS-first import
- `packages/shared/package.json` — JIT types package
- `packages/shared/src/index.ts` — Barrel export for all types
- `packages/shared/src/auth.types.ts` — UserPayload, TokenResponse, RegisterDto, LoginDto
- `packages/shared/src/board.types.ts` — Board, List, Card interfaces
- `packages/shared/src/ws-events.types.ts` — WsEventType union type

## Decisions Made
- Used JIT internal packages pattern (no build step for shared types) per Turborepo docs
- NestJS health endpoint uses plain GET /api (no guards yet since auth module is not set up)
- pnpm `onlyBuiltDependencies` configured in root package.json to whitelist native builds
- Vite proxy configured for all three backend paths: /api, /socket.io, /yjs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Approved native build scripts for pnpm**
- **Found during:** Task 2 (dependency installation)
- **Issue:** pnpm 10.33.0 blocks native build scripts by default. bcrypt, prisma, @prisma/engines, and @nestjs/core have postinstall scripts that were ignored.
- **Fix:** Added `pnpm.onlyBuiltDependencies` array to root package.json whitelisting the four packages.
- **Files modified:** package.json
- **Verification:** `pnpm install` completes with all builds running
- **Committed in:** b42ee72 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for bcrypt native compilation and Prisma engine download. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo scaffold complete with all Phase 1 dependencies installed
- Ready for Plan 02 (Prisma schema, database migrations)
- Docker Compose available for PostgreSQL + Redis when needed

## Self-Check: PASSED

All 24 created files verified on disk. Both task commits (588ccd4, b42ee72) verified in git log.

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-12*
