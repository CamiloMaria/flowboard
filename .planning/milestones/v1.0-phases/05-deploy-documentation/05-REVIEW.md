---
phase: 05-deploy-documentation
reviewed: 2026-04-13T23:54:11Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - Dockerfile
  - .dockerignore
  - docker-compose.prod.yml
  - .env.production.example
  - .env.example
  - .gitignore
  - apps/api/src/app.service.ts
  - apps/api/src/app.controller.ts
  - apps/api/src/app.service.spec.ts
  - .github/workflows/deploy.yml
  - scripts/deploy.sh
  - infra/nginx/flowboard.conf
  - apps/web/vercel.json
  - apps/web/src/lib/api.ts
  - apps/web/src/lib/socket.ts
  - apps/web/src/hooks/useYjsProvider.ts
  - README.md
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-13T23:54:11Z
**Depth:** standard
**Files Reviewed:** 14 source files + 3 support files (README, env examples, gitignore)
**Status:** issues_found

## Summary

Phase 05 delivers Docker infrastructure (Dockerfile, docker-compose.prod.yml), CI/CD (GitHub Actions), Nginx reverse proxy, Vercel frontend config, and a portfolio README. The infrastructure is well-structured overall — health checks, multi-stage builds, security headers in Nginx, and proper `.gitignore` entries are all solid.

However, the Dockerfile has two critical bugs that will cause the production container to crash on startup: the `prisma` CLI and `ts-node` are both devDependencies and won't be present in the production image, but the CMD invokes both via `prisma migrate deploy` and `prisma db seed`. There are also four warnings related to build reproducibility, silent failure masking, missing Redis authentication, and a Dockerfile permission issue.

## Critical Issues

### CR-01: Prisma CLI missing in production image — `prisma migrate deploy` will fail

**File:** `Dockerfile:63`
**Issue:** The CMD runs `npx prisma migrate deploy` but `prisma` is listed in `devDependencies` (apps/api/package.json:58). The production stage installs only production dependencies (`pnpm install --frozen-lockfile --prod` at line 43), so the `prisma` CLI binary won't exist. The container will crash immediately on startup with `npx: command not found` or `prisma: not found`.
**Fix:**
Move `prisma` from `devDependencies` to `dependencies` in `apps/api/package.json`, OR restructure the Dockerfile to run migrations in the builder stage or a separate init container:

Option A — Move prisma to dependencies (simplest):
```json
// apps/api/package.json
"dependencies": {
  // ... existing deps
  "prisma": "^7.7.0"
}
```

Option B — Run migrations in a separate entrypoint script before starting the app:
```dockerfile
# In builder stage, copy prisma binary to a known location
# Or use a multi-step CMD that installs prisma globally
```

### CR-02: `npx prisma db seed` requires `ts-node` (devDependency) — seed will fail in production

**File:** `Dockerfile:63`
**Issue:** The CMD runs `npx prisma db seed` which invokes `ts-node prisma/seed.ts` (configured in `apps/api/package.json:41`). `ts-node` is a devDependency (line 62) and won't be installed in the production image. Even if CR-01 is fixed, this will fail with `Cannot find module 'ts-node'`.
**Fix:**
Either pre-compile the seed script during the build stage and adjust the prisma seed command, or compile seed.ts as part of the NestJS build and change the seed config:

Option A — Compile seed separately in builder stage:
```dockerfile
# In builder stage, after API build:
RUN cd apps/api && npx tsc prisma/seed.ts --outDir prisma/dist --esModuleInterop --resolveJsonModules

# Copy compiled seed to production stage:
COPY --from=builder /app/apps/api/prisma/dist apps/api/prisma/dist
```
Then update `package.json`:
```json
"prisma": {
  "seed": "node prisma/dist/seed.js"
}
```

Option B — Run seed only in the builder stage (if DB is accessible at build time, e.g., via docker-compose build args).

Option C — Remove seed from the production CMD entirely and run it as a one-time manual step after first deploy:
```dockerfile
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && cd ../.. && node apps/api/dist/main.js"]
```

## Warnings

### WR-01: Non-deterministic pnpm version in Docker build

**File:** `Dockerfile:4` and `Dockerfile:33`
**Issue:** `corepack prepare pnpm@latest --activate` uses `@latest` which resolves to whatever version is current at build time. Two builds on different days may get different pnpm versions, causing non-reproducible builds. If a new pnpm version introduces a breaking change or lockfile format change, builds will silently break.
**Fix:**
Pin to a specific pnpm version matching the project's current version (10.33.x per STACK.md):
```dockerfile
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
```

### WR-02: Silent build failure masking with `|| true`

**File:** `Dockerfile:27`
**Issue:** `RUN pnpm --filter @flowboard/shared build || true` silently swallows any build failure of the shared package. If `@flowboard/shared` fails to build, the API build on the next line may succeed but produce incorrect output or runtime errors (missing types, broken imports). This is a silent correctness bug.
**Fix:**
If the shared package build is expected to sometimes fail (e.g., no build script), check for that explicitly:
```dockerfile
# If shared has no build step (uses src directly), remove this line entirely.
# If shared does have a build step, let it fail loudly:
RUN pnpm --filter @flowboard/shared build
```
Based on the SUMMARY noting "packages/shared/src copied directly (no dist) since shared uses `main: ./src/index.js`", this line can likely be removed entirely:
```dockerfile
# Remove this line — shared package uses src directly, no build needed
# RUN pnpm --filter @flowboard/shared build || true
```

### WR-03: Redis without password authentication in production

**File:** `docker-compose.prod.yml:42-54`
**Issue:** Redis is configured without a password (`redis-server --appendonly yes`). While it's on an internal Docker bridge network and not exposed to the host, any other container on the same network or any process that gains access to the Docker network can read/write all Redis data (presence state, session data). Defense-in-depth recommends authentication.
**Fix:**
Add a Redis password:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
  # ...
```
And update the API's REDIS_URL:
```yaml
api:
  environment:
    REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```
Add `REDIS_PASSWORD` to `.env.production.example`:
```
REDIS_PASSWORD=CHANGE_ME
```

### WR-04: Dockerfile USER node may lack write permissions for Prisma operations

**File:** `Dockerfile:56,63`
**Issue:** `USER node` is set at line 56, but all `COPY` commands run as root (lines 38-53), meaning all copied files are owned by `root:root`. The CMD at line 63 runs `prisma migrate deploy` which may need to write temporary files. More critically, `npx` itself may need to write to the global `.npm` cache. While `node:22-alpine` creates a `/home/node` directory, `npx` may still fail if it can't write to `/app/.npm` or similar caches.
**Fix:**
Add a `chown` for the app directory before switching to `node`:
```dockerfile
# After all COPY commands, before USER node:
RUN chown -R node:node /app
USER node
```
Or alternatively, set the working directory's ownership for the specific directories that need write access.

## Info

### IN-01: Deploy script has unused DOMAIN placeholder

**File:** `scripts/deploy.sh:9`
**Issue:** `DOMAIN="CHANGE_ME_TO_YOUR_DOMAIN"` is used for the HTTPS verification step (line 34). If the user forgets to change it, the script will curl `https://CHANGE_ME_TO_YOUR_DOMAIN/api/health`, get an error, print the "WARNING" message, and continue. The deploy appears successful (exit 0) even though HTTPS isn't verified. This is by design per the SUMMARY, but a validation would be safer.
**Fix:**
Add a check at the top of the script:
```bash
if [ "$DOMAIN" = "CHANGE_ME_TO_YOUR_DOMAIN" ]; then
  echo "==> WARNING: DOMAIN not configured. Skipping HTTPS verification."
  echo "==> Edit scripts/deploy.sh and set DOMAIN to your actual domain."
  SKIP_HTTPS=true
fi
```

### IN-02: Nginx `listen 443 ssl http2` syntax deprecated in newer Nginx

**File:** `infra/nginx/flowboard.conf:17`
**Issue:** In Nginx 1.25.1+, the `http2` parameter on the `listen` directive is deprecated. The new syntax uses a separate `http2 on;` directive. This won't cause errors on current Oracle Cloud default Nginx (likely 1.24.x on Ubuntu 22.04), but will emit deprecation warnings on newer versions.
**Fix:**
For forward-compatibility:
```nginx
server {
    listen 443 ssl;
    http2 on;
    # ...
}
```

### IN-03: `.dockerignore` excludes `*.md` but uses negative pattern incorrectly

**File:** `.dockerignore:15-17`
**Issue:** Line 15 excludes `*.md`, and lines 16-17 attempt to re-include `package.json` files with `!` patterns. However, these negative patterns (`!packages/shared/package.json`, `!apps/api/package.json`) are for `.json` files, not `.md` files — they don't undo the `*.md` exclusion. The `*.md` exclusion is fine for the build (no markdown needed in the image), but the negative patterns for `package.json` are unnecessary since `*.md` doesn't match them. The negative patterns appear to be leftover from an earlier revision or a misunderstanding.
**Fix:**
Remove the unnecessary negative patterns since they don't interact with the `*.md` glob:
```dockerignore
# Docs
*.md
LICENSE
```
The `package.json` files are already included by the `COPY` commands and aren't affected by `*.md`.

---

_Reviewed: 2026-04-13T23:54:11Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
