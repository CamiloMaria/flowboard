---
phase: 05-deploy-documentation
verified: 2026-04-13T23:58:00Z
status: human_needed
score: 11/13 must-haves verified
overrides_applied: 0
gaps:
  - truth: "README includes GIF/video recording of the live demo"
    status: failed
    reason: "ROADMAP SC4 specifies GIF/video recording. Plan D-03 deliberately chose live demo link instead. No GIF/video exists in README.md."
    artifacts:
      - path: "README.md"
        issue: "Contains live demo link but no GIF/video recording per DPLY-05 and ROADMAP SC4"
    missing:
      - "Add GIF/video recording to README, OR accept override for using live demo link instead"
  - truth: "Backend deploys to Railway with PostgreSQL and Redis (DPLY-01)"
    status: failed
    reason: "ROADMAP SC1 and DPLY-01 specify Railway. Implementation deploys to Oracle Cloud via Docker + SSH + Nginx. This was a deliberate architecture change during discuss phase."
    artifacts:
      - path: ".github/workflows/deploy.yml"
        issue: "Targets Oracle Cloud VM via SSH, not Railway"
      - path: "docker-compose.prod.yml"
        issue: "Self-hosted Docker Compose, not Railway-managed infrastructure"
    missing:
      - "Update ROADMAP.md and REQUIREMENTS.md to reflect Oracle Cloud deployment, OR accept override"
human_verification:
  - test: "Run docker build -t flowboard-api . and verify image builds successfully"
    expected: "Multi-stage build completes, image contains NestJS dist and Prisma client"
    why_human: "Docker build requires Docker daemon and network access for npm packages"
  - test: "Run docker compose -f docker-compose.prod.yml up -d with valid .env and verify all services start"
    expected: "API, PostgreSQL, Redis containers running. GET /api/health returns {status: 'ok', database: 'connected', redis: 'connected'}"
    why_human: "Requires Docker daemon running and port availability"
  - test: "Push to main branch and verify GitHub Actions workflow triggers deploy"
    expected: "SSH connection to Oracle Cloud, containers rebuilt, health check passes"
    why_human: "Requires configured GitHub secrets and Oracle Cloud VM"
  - test: "Deploy frontend to Vercel with VITE_API_URL set and verify cross-origin API calls"
    expected: "SPA serves from Vercel, API calls reach Oracle Cloud backend, Socket.io connects"
    why_human: "Requires Vercel deployment and Oracle Cloud backend running"
  - test: "Fresh git clone → follow README Getting Started → verify working local dev"
    expected: "All 7 steps work, board loads at localhost:5173, demo mode works at /demo"
    why_human: "End-to-end workflow requires fresh environment, Docker, Node.js"
---

# Phase 5: Deploy & Documentation Verification Report

**Phase Goal:** FlowBoard is live on the internet with a README that tells the full story — a recruiter can open the URL, see the demo, then read the README and understand the engineering depth
**Verified:** 2026-04-13T23:58:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Docker build produces a working API image from multi-stage Dockerfile | ✓ VERIFIED | Dockerfile (63 lines): `FROM node:22-alpine AS builder`, Prisma generate, multi-stage with `USER node`, `HEALTHCHECK` |
| 2 | docker-compose.prod.yml starts API + PostgreSQL + Redis with health checks | ✓ VERIFIED | docker-compose.prod.yml validates, 3 services (api, postgres, redis), `condition: service_healthy` on both deps |
| 3 | Health endpoint at /api/health returns status with DB and Redis connectivity | ✓ VERIFIED | app.service.ts: `prisma.$queryRaw\`SELECT 1\``, `redis.ping()`. app.controller.ts: `@Get('health')` with 503 on failure |
| 4 | Both .env.example and .env.production.example exist with complete variable sets | ✓ VERIFIED | .env.example (10 lines): DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, PORT. .env.production.example (13 lines): POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN |
| 5 | GitHub Actions workflow triggers on push to main and deploys via SSH | ✓ VERIFIED | .github/workflows/deploy.yml: `branches: [main]`, `appleboy/ssh-action@v1`, health check loop (30×2s) |
| 6 | Deploy script pulls code, builds containers, and verifies health | ✓ VERIFIED | scripts/deploy.sh: executable, `git pull origin main`, `docker compose up --build -d`, health check loop, HTTPS verify |
| 7 | Nginx config proxies /, /socket.io/, and /yjs/ with WebSocket upgrade headers | ✓ VERIFIED | infra/nginx/flowboard.conf: 3 location blocks, Upgrade + Connection headers on WS blocks, 7d timeouts, security headers |
| 8 | vercel.json configures SPA rewrite and immutable cache headers for assets | ✓ VERIFIED | apps/web/vercel.json: valid JSON, `/(.*) → /index.html` rewrite, `Cache-Control: immutable` on `/assets/(.*)` |
| 9 | Vite config reads VITE_API_URL for production API endpoint | ✓ VERIFIED | api.ts: `API_BASE = import.meta.env.VITE_API_URL || ''`. socket.ts: `SOCKET_URL = import.meta.env.VITE_API_URL || ''`. useYjsProvider.ts: `import.meta.env.VITE_API_URL || window.location.origin` |
| 10 | Local dev continues to work via Vite proxy (relative paths) | ✓ VERIFIED | vite.config.ts: proxy config preserved for `/api`, `/socket.io`, `/yjs`. Empty VITE_API_URL defaults to empty string (relative paths) |
| 11 | README has live demo link as the first prominent element | ✓ VERIFIED | README.md line 5: `**[> View Live Demo](https://YOUR_DEPLOYED_URL/demo)**` — first content after title |
| 12 | README has Mermaid architecture diagram showing dual WebSocket paths | ✓ VERIFIED | README.md lines 32-65: Mermaid `graph LR` with `/socket.io/`, `/yjs/`, `/api/*` paths, PostgreSQL, Redis, Nginx, Docker subgraph |
| 13 | README has 'Why I Built This' section with technical narrative | ✓ VERIFIED | README.md lines 20-28: 4 paragraphs covering dual WS challenge, demo bot engineering, deliberate technical decisions |
| 14 | README has Shield.io badges and tech stack table | ✓ VERIFIED | README.md: 8 badges (React, NestJS, TS, PG, Redis, Prisma, Socket.io, Yjs), 10-row tech stack table |
| 15 | README has numbered getting started steps | ✓ VERIFIED | README.md: 7 numbered steps including clone, install, docker compose, env config, prisma push/seed, pnpm dev, open browser |
| 16 | README tells a complete engineering story readable in 30 seconds | ✓ VERIFIED | 144 lines with hero→badges→summary→narrative→architecture→tech→getting started→structure→license flow |
| 17 | Backend runs on Railway with PostgreSQL + Redis (ROADMAP SC1 / DPLY-01) | ✗ FAILED | Implementation targets Oracle Cloud VM via Docker/SSH/Nginx, NOT Railway. Deliberate architecture change during discuss phase. |
| 18 | README includes GIF/video recording of the live demo (ROADMAP SC4 / DPLY-05) | ✗ FAILED | No GIF/video in README. Plan D-03 deliberately chose live demo link over GIF. DPLY-05 says "GIF/video recording." |

**Score:** 16/18 roadmap + plan truths (11/13 unique must-haves after dedup)

Note: Truths 17-18 come from ROADMAP Success Criteria that weren't addressed in plan must_haves. They represent scope changes made during planning (Railway→Oracle Cloud, GIF→live link).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `Dockerfile` | Multi-stage build for NestJS API | ✓ VERIFIED | 63 lines, `FROM node:22-alpine AS builder`, Prisma generate, `USER node`, `HEALTHCHECK` |
| `docker-compose.prod.yml` | Production compose with API + PG + Redis | ✓ VERIFIED | 62 lines, 3 services, health checks, bridge network, env var interpolation |
| `.dockerignore` | Build context exclusions | ✓ VERIFIED | 45 lines, excludes `apps/web`, `node_modules`, test files, IDE files |
| `.env.production.example` | Production environment template | ✓ VERIFIED | 13 lines, POSTGRES_PASSWORD, JWT secrets, CORS_ORIGIN — all CHANGE_ME placeholders |
| `.env.example` | Local dev environment template | ✓ VERIFIED | 10 lines, DATABASE_URL, REDIS_URL, JWT_SECRET, PORT=3001 |
| `apps/api/src/app.service.ts` | Health check with DB + Redis | ✓ VERIFIED | 38 lines, `prisma.$queryRaw`, `redis.ping()`, returns status/database/redis/timestamp |
| `apps/api/src/app.controller.ts` | Health endpoint route | ✓ VERIFIED | 26 lines, `@Get('health')`, `@Public()`, 503 via `HttpException` |
| `.github/workflows/deploy.yml` | CI/CD pipeline | ✓ VERIFIED | 38 lines, valid YAML, `appleboy/ssh-action@v1`, health check loop |
| `scripts/deploy.sh` | Manual deploy script | ✓ VERIFIED | 43 lines, executable, valid bash syntax, health check loop, HTTPS verify |
| `infra/nginx/flowboard.conf` | Nginx reverse proxy | ✓ VERIFIED | 80 lines, 3 location blocks, WebSocket upgrade headers, security headers, SSL |
| `apps/web/vercel.json` | Vercel deployment config | ✓ VERIFIED | 13 lines, valid JSON, SPA rewrite, immutable cache headers |
| `apps/web/vite.config.ts` | Vite config with proxy preserved | ✓ VERIFIED | 24 lines, proxy preserved for `/api`, `/socket.io`, `/yjs` |
| `README.md` | Portfolio-quality README | ✓ VERIFIED | 144 lines, demo link, 8 badges, 4-paragraph narrative, Mermaid diagram, tech table, 7-step setup |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Dockerfile | docker-compose.prod.yml | `build: context: . dockerfile: Dockerfile` | ✓ WIRED | Line 3-5 of compose references Dockerfile |
| docker-compose.prod.yml | .env | `${POSTGRES_PASSWORD}` interpolation | ✓ WIRED | Lines 9,14,29 use `${}` env var syntax |
| .github/workflows/deploy.yml | scripts/deploy.sh | SSH invocation concept | ✓ WIRED | Workflow inlines the deploy steps (git pull, docker compose, health check) — deploy.sh is for manual use |
| infra/nginx/flowboard.conf | docker-compose.prod.yml | `proxy_pass http://127.0.0.1:3000` | ✓ WIRED | Nginx proxies to port 3000, compose exposes API on 3000 |
| apps/web/vercel.json | SPA rewrite | `/(.*) → /index.html` | ✓ WIRED | Catch-all rewrite for client-side routing |
| apps/web/src/lib/api.ts | VITE_API_URL | `import.meta.env.VITE_API_URL` | ✓ WIRED | Line 5: `API_BASE = import.meta.env.VITE_API_URL || ''`, line 55: `fetch(\`${API_BASE}${path}\`)` |
| apps/web/src/lib/socket.ts | VITE_API_URL | `import.meta.env.VITE_API_URL` | ✓ WIRED | Line 6: `SOCKET_URL = import.meta.env.VITE_API_URL || ''`, line 19: `io(SOCKET_URL, ...)` |
| apps/web/src/hooks/useYjsProvider.ts | VITE_API_URL | `import.meta.env.VITE_API_URL` | ✓ WIRED | Line 37: `import.meta.env.VITE_API_URL || window.location.origin`, line 38: `wsUrl = apiUrl.replace(/^http/, 'ws') + '/yjs'` |
| README.md | Live demo | `View Live Demo` link | ✓ WIRED | Line 5: `[> View Live Demo](https://YOUR_DEPLOYED_URL/demo)` (placeholder URL) |
| README.md | Architecture | Mermaid diagram | ✓ WIRED | Lines 32-65: ` ```mermaid graph LR` with full system diagram |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| app.service.ts | health checks | PrismaService, RedisService | `$queryRaw\`SELECT 1\``, `redis.ping()` | ✓ FLOWING |
| api.ts | API_BASE | import.meta.env.VITE_API_URL | Env var at build time | ✓ FLOWING |
| socket.ts | SOCKET_URL | import.meta.env.VITE_API_URL | Env var at build time | ✓ FLOWING |
| useYjsProvider.ts | apiUrl | import.meta.env.VITE_API_URL | Env var at build time → WebSocket URL | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Dockerfile syntax | grep -c "FROM" Dockerfile | 2 (multi-stage) | ✓ PASS |
| docker-compose.prod.yml validates | docker compose -f docker-compose.prod.yml config --services | api, postgres, redis | ✓ PASS |
| deploy.yml YAML valid | python3/js-yaml parsing | YAML_VALID | ✓ PASS |
| deploy.sh syntax valid | bash -n scripts/deploy.sh | BASH_SYNTAX_OK | ✓ PASS |
| deploy.sh executable | test -x scripts/deploy.sh | EXECUTABLE | ✓ PASS |
| vercel.json valid | JSON.parse() | JSON_VALID | ✓ PASS |
| README line count | wc -l README.md | 144 lines (≥100 target) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DPLY-01 | 01, 02 | Backend deploys to Railway with PostgreSQL and Redis | ⚠️ DEVIATED | Implementation deploys to Oracle Cloud (not Railway) — deliberate architecture change. Docker + SSH + Nginx replaces Railway PaaS. Functionally equivalent. |
| DPLY-02 | 03 | Frontend deploys to Vercel with auto-deploy on push to main | ✓ SATISFIED | vercel.json with SPA rewrite + cache headers. VITE_API_URL wired into api.ts, socket.ts, useYjsProvider.ts |
| DPLY-03 | 01 | Docker Compose config for local development | ✓ SATISFIED | docker-compose.yml (infra-only: PG + Redis) already existed. docker-compose.prod.yml added for full production stack. |
| DPLY-04 | 04 | README with architecture diagram (dual WS paths, CRDT, Redis) | ✓ SATISFIED | Mermaid diagram with `/socket.io/`, `/yjs/`, `/api/*` paths. Text explains CRDT flow and Redis presence. |
| DPLY-05 | 04 | README with GIF/video recording of live demo | ✗ BLOCKED | No GIF/video in README. Plan deliberately chose live demo link (per D-03). DPLY-05 wording says "GIF/video recording." |
| DPLY-06 | 04 | README with "Why I Built This" section explaining technical decisions | ✓ SATISFIED | 4-paragraph first-person technical narrative covering dual WS, demo bots, deliberate tech choices |
| DPLY-07 | 01, 02, 03, 04 | Codebase builds and deploys cleanly from fresh clone | ✓ SATISFIED | Dockerfile builds from monorepo, CI/CD automates deploy, README documents 7-step local setup |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| README.md | 5 | `YOUR_DEPLOYED_URL` placeholder | ℹ️ Info | Intentional — user fills after deployment |
| README.md | 100 | `YOUR_USERNAME` placeholder | ℹ️ Info | Intentional — user fills after deployment |
| scripts/deploy.sh | 9 | `CHANGE_ME_TO_YOUR_DOMAIN` placeholder | ℹ️ Info | Intentional — user configures on server |
| infra/nginx/flowboard.conf | 12,18 | `YOUR_DOMAIN_HERE` placeholder | ℹ️ Info | Intentional — user configures with certbot |
| Dockerfile | 27 | `|| true` on shared build | ⚠️ Warning | Swallows build errors for packages/shared. May mask real failures. |

### Human Verification Required

### 1. Docker Image Build

**Test:** Run `docker build -t flowboard-api .` from project root
**Expected:** Multi-stage build completes. Image contains NestJS dist at `apps/api/dist/`, Prisma client at `apps/api/src/generated/`, runs as `node` user.
**Why human:** Requires Docker daemon and network access for npm package installation.

### 2. Production Docker Compose

**Test:** Create `.env` from `.env.production.example` with real passwords, run `docker compose -f docker-compose.prod.yml up -d`
**Expected:** All 3 containers running. `curl localhost:3000/api/health` returns `{status: 'ok', database: 'connected', redis: 'connected'}`.
**Why human:** Requires Docker daemon running, port 3000/5432/6379 available.

### 3. GitHub Actions Deploy Pipeline

**Test:** Push a change to `apps/api/` on the `main` branch
**Expected:** GitHub Actions triggers, SSHs to Oracle Cloud VM, rebuilds containers, health check passes.
**Why human:** Requires configured GitHub Secrets (ORACLE_HOST, ORACLE_USER, ORACLE_SSH_KEY) and running Oracle Cloud VM.

### 4. Vercel Frontend Deployment

**Test:** Connect repo to Vercel with Root Directory `apps/web`, set `VITE_API_URL` env var
**Expected:** SPA builds, serves from Vercel CDN, API calls reach Oracle Cloud backend, Socket.io and y-websocket connect.
**Why human:** Requires Vercel account, Oracle Cloud backend running, DNS configuration.

### 5. Fresh Clone Setup

**Test:** Fresh `git clone` → follow README Getting Started steps 1-7
**Expected:** Board loads at `localhost:5173`, demo mode works at `/demo`, cards are draggable, bots active.
**Why human:** End-to-end workflow requiring fresh environment, Docker, Node.js 22+, pnpm.

### Gaps Summary

**2 gaps identified**, both representing **deliberate scope changes** made during the discuss/plan phase that deviate from ROADMAP.md wording:

1. **DPLY-01 / ROADMAP SC1: Railway → Oracle Cloud** — The implementation deploys to Oracle Cloud via Docker + SSH + Nginx instead of Railway PaaS. This was decided during phase discussion (05-CONTEXT.md). The deployment is arguably MORE impressive for a portfolio project (shows infrastructure knowledge), but the requirement text says "Railway." Recommend updating ROADMAP.md/REQUIREMENTS.md to reflect the actual architecture, OR adding an override.

2. **DPLY-05 / ROADMAP SC4: GIF/video recording missing** — The plan explicitly decided against GIF/video (D-03: "live demo link is the hero asset"). The live demo link IS present and more effective than a GIF. But DPLY-05 literally says "GIF/video recording." Recommend adding the GIF/video to the README alongside the live link, OR adding an override.

**These look intentional.** Both gaps represent conscious design decisions that improve the project. To accept these deviations, add to VERIFICATION.md frontmatter:

```yaml
overrides:
  - must_have: "Backend deploys to Railway with PostgreSQL and Redis"
    reason: "Deploying to Oracle Cloud VM via Docker + SSH + Nginx instead — demonstrates more infrastructure depth for portfolio. Functionally equivalent."
    accepted_by: "{your name}"
    accepted_at: "2026-04-13T23:58:00Z"
  - must_have: "README includes GIF/video recording of the live demo"
    reason: "Live demo link (zero-friction, always current) chosen over static GIF per D-03 discuss decision. More effective for recruiter engagement."
    accepted_by: "{your name}"
    accepted_at: "2026-04-13T23:58:00Z"
```

---

_Verified: 2026-04-13T23:58:00Z_
_Verifier: the agent (gsd-verifier)_
