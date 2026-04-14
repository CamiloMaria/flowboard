---
status: partial
phase: 05-deploy-documentation
source: [05-VERIFICATION.md]
started: 2026-04-13T19:58:00Z
updated: 2026-04-13T19:58:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Docker Image Build
expected: `docker build -t flowboard-api .` completes. Image contains NestJS dist, Prisma client, runs as `node` user.
result: [pending]

### 2. Production Docker Compose
expected: `.env` from `.env.production.example` with real passwords, `docker compose -f docker-compose.prod.yml up -d` starts all 3 containers. `curl localhost:3000/api/health` returns `{status: 'ok', database: 'connected', redis: 'connected'}`.
result: [pending]

### 3. GitHub Actions Deploy Pipeline
expected: Push to `apps/api/` on `main` triggers GitHub Actions, SSHs to Oracle Cloud VM, rebuilds containers, health check passes.
result: [pending]

### 4. Vercel Frontend Deployment
expected: Connect repo to Vercel with Root Directory `apps/web`, set `VITE_API_URL`. SPA builds, serves from CDN, API calls reach backend, WebSockets connect.
result: [pending]

### 5. Fresh Clone Setup
expected: Fresh `git clone` → follow README steps 1-7 → board loads at `localhost:5173`, demo mode works, cards draggable, bots active.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
