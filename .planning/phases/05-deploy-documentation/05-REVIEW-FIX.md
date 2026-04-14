---
phase: 05
fixed_at: 2026-04-14T00:05:00Z
review_path: .planning/phases/05-deploy-documentation/05-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-14T00:05:00Z
**Source review:** .planning/phases/05-deploy-documentation/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Prisma CLI missing in production image — `prisma migrate deploy` will fail

**Files modified:** `apps/api/package.json`
**Commit:** fb0a693
**Applied fix:** Moved `prisma` from `devDependencies` to `dependencies` in `apps/api/package.json`. The production Docker image installs only production deps (`--prod`), so the prisma CLI must be a production dependency for `npx prisma migrate deploy` to work in the container CMD.

### CR-02: `npx prisma db seed` requires `ts-node` (devDependency) — seed will fail in production

**Files modified:** `Dockerfile`
**Commit:** d19ef04
**Applied fix:** Removed `npx prisma db seed` from the production CMD in Dockerfile. Database seeding is a one-time operation that should be run manually after first deploy (e.g., `docker exec <container> sh -c "cd apps/api && npx prisma db seed"`), not on every container startup. This avoids the `ts-node` dependency issue entirely and is the correct production pattern.

### WR-01: Non-deterministic pnpm version in Docker build

**Files modified:** `Dockerfile`
**Commit:** b95f2b0
**Applied fix:** Pinned `corepack prepare pnpm@latest` to `corepack prepare pnpm@10.33.0` in both builder and production stages (lines 4 and 33). Version matches STACK.md specification. Ensures reproducible builds across different build dates.

### WR-02: Silent build failure masking with `|| true`

**Files modified:** `Dockerfile`
**Commit:** 9ef324d
**Applied fix:** Removed the `RUN pnpm --filter @flowboard/shared build || true` line entirely. Verified that `@flowboard/shared` has no build script and uses `main: ./src/index.js` (source files directly), so no build step is needed. The `|| true` was silently swallowing a guaranteed failure (no build script = non-zero exit), masking any future issues.

### WR-03: Redis without password authentication in production

**Files modified:** `docker-compose.prod.yml`, `.env.production.example`
**Commit:** 616bb7c
**Applied fix:** Added `--requirepass ${REDIS_PASSWORD}` to Redis command, updated API's `REDIS_URL` to include password (`redis://:${REDIS_PASSWORD}@redis:6379`), updated Redis healthcheck to pass `-a ${REDIS_PASSWORD}` to `redis-cli`, and added `REDIS_PASSWORD=CHANGE_ME` to `.env.production.example`. Defense-in-depth: even on internal Docker network, Redis should require authentication.

### WR-04: Dockerfile USER node may lack write permissions for Prisma operations

**Files modified:** `Dockerfile`
**Commit:** fddbe5e
**Applied fix:** Added `RUN chown -R node:node /app` before the `USER node` directive. All `COPY` commands run as root, leaving files owned by `root:root`. The `node` user needs write access for `npx` cache and `prisma migrate deploy` temporary files. The `chown` ensures the non-root user can operate correctly.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-14T00:05:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
