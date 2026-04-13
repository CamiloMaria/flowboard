---
phase: 05-deploy-documentation
plan: 02
subsystem: infra
tags: [github-actions, ci-cd, nginx, deploy, websocket, oracle-cloud, ssh, docker]

# Dependency graph
requires:
  - phase: 05-deploy-documentation-01
    provides: Dockerfile, docker-compose.prod.yml, .env.production.example
provides:
  - GitHub Actions CI/CD workflow deploying on push to main via SSH
  - Manual deploy script with health check loop
  - Nginx reverse proxy config with dual WebSocket paths (Socket.io + y-websocket)
affects: [05-deploy-documentation-03, 05-deploy-documentation-04]

# Tech tracking
tech-stack:
  added: [appleboy/ssh-action, nginx, certbot]
  patterns: [SSH-based deploy via GitHub Actions, Nginx WebSocket proxy with upgrade headers, health check loop pattern]

key-files:
  created:
    - .github/workflows/deploy.yml
    - scripts/deploy.sh
    - infra/nginx/flowboard.conf
  modified: []

key-decisions:
  - "Inline health check in GitHub Actions (30x2s loop) instead of simple sleep — fail-fast with container logs on failure"
  - "Placeholder domains (CHANGE_ME / YOUR_DOMAIN_HERE) instead of hardcoded — user configures on server"
  - "Three Nginx location blocks (/, /socket.io/, /yjs/) — FlowBoard-specific dual WebSocket requirement"

patterns-established:
  - "SSH deploy pattern: git pull → docker compose up --build → health check loop → HTTPS verify"
  - "Nginx dual WebSocket proxy: separate location blocks with upgrade headers and 7d timeouts"

requirements-completed: [DPLY-01, DPLY-07]

# Metrics
duration: 2min
completed: 2026-04-13
---

# Phase 05 Plan 02: CI/CD Pipeline, Deploy Script, Nginx Config Summary

**GitHub Actions CI/CD pipeline, manual deploy script, and Nginx reverse proxy with three proxy locations (REST, Socket.io WebSocket, y-websocket CRDT) for Oracle Cloud deployment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-13T23:39:48Z
- **Completed:** 2026-04-13T23:41:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GitHub Actions workflow deploys FlowBoard to Oracle Cloud via SSH on every push to main that touches API code, Docker config, or lockfile
- Deploy script automates git pull → docker build → health check → HTTPS verification for manual deploys
- Nginx config proxies all three paths (REST API at `/`, Socket.io at `/socket.io/`, y-websocket at `/yjs/`) with proper WebSocket upgrade headers and 7-day persistent connection timeouts

## Task Commits

Each task was committed atomically:

1. **Task 1: GitHub Actions CI/CD workflow** - `28721df` (feat)
2. **Task 2: Deploy script + Nginx reverse proxy config** - `59e9d7e` (feat)

## Files Created/Modified
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD pipeline: SSH deploy on push to main, health check loop, triggers on API/shared/Docker/lockfile changes
- `scripts/deploy.sh` - Manual deploy script: git pull, docker compose build, 30-attempt health check, HTTPS endpoint verification
- `infra/nginx/flowboard.conf` - Nginx reverse proxy: HTTP→HTTPS redirect, SSL via certbot, 3 location blocks with security headers, dual WebSocket upgrade support

## Decisions Made
- Inline health check loop in GitHub Actions script (30 attempts x 2s) rather than simple sleep — provides fail-fast behavior with container log output on failure
- Placeholder domain names (CHANGE_ME / YOUR_DOMAIN_HERE) — user configures actual domain on server with certbot
- Both WebSocket location blocks (`/socket.io/` and `/yjs/`) get identical proxy configuration with 7d timeouts — consistent handling for persistent connections
- Security headers added to Nginx: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Domain and SSH keys are configured on the Oracle Cloud server per existing patterns.

## Next Phase Readiness
- CI/CD pipeline ready — push to main triggers automated deploy
- Manual deploy script available for ad-hoc server updates
- Nginx config template ready for server installation with certbot SSL
- Plans 03 (Vercel + README) and 04 depend on this infrastructure being in place

## Self-Check: PASSED

All files exist, all commits verified, deploy.sh is executable.

---
*Phase: 05-deploy-documentation*
*Completed: 2026-04-13*
