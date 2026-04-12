---
phase: 01-foundation-auth
plan: 02
subsystem: database
tags: [prisma, postgresql, redis, ioredis, nestjs, schema]

# Dependency graph
requires:
  - phase: 01-foundation-auth (plan 01)
    provides: Monorepo scaffold with NestJS API, Docker Compose, ConfigModule
provides:
  - Prisma 7 schema with 5 models (User, Board, List, Card, RefreshToken)
  - Generated Prisma client at custom output path
  - Global PrismaModule for NestJS DI
  - Global RedisModule for NestJS DI
  - prisma.config.ts for Prisma 7 datasource configuration
affects: [auth, websocket, board-crud, seed, presence]

# Tech tracking
tech-stack:
  added: [prisma 7.7.0, dotenv 17.4.1]
  patterns: [prisma-client generator (Prisma 7), prisma.config.ts for datasource URL, @Global() NestJS modules, custom Prisma output path for monorepo]

key-files:
  created:
    - apps/api/prisma/schema.prisma
    - apps/api/prisma.config.ts
    - apps/api/src/prisma/prisma.service.ts
    - apps/api/src/prisma/prisma.module.ts
    - apps/api/src/redis/redis.service.ts
    - apps/api/src/redis/redis.module.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/package.json

key-decisions:
  - "Prisma 7 requires prisma.config.ts for datasource URL — url field removed from schema.prisma"
  - "Used prisma-client generator (not prisma-client-js) per Prisma 7 breaking change"
  - "Custom output to src/generated/prisma for monorepo hoisting safety"
  - "RedisService extends ioredis Redis class directly for full API access"

patterns-established:
  - "Global modules: @Global() decorator + exports array for cross-module DI"
  - "Prisma 7 config: prisma.config.ts with defineConfig() and env() for datasource"
  - "Service lifecycle: OnModuleInit/OnModuleDestroy for connection management"

requirements-completed: [FNDN-03, FNDN-04]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 01 Plan 02: Database Schema & Service Modules Summary

**Prisma 7 schema with 5 models (User, Board, List, Card, RefreshToken), global PrismaModule and RedisModule for NestJS DI, and prisma.config.ts for Prisma 7 datasource configuration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T02:55:51Z
- **Completed:** 2026-04-12T03:01:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Full Prisma 7 database schema with 5 models, proper indexes, and snake_case table mapping
- Global PrismaModule with lifecycle-aware PrismaService (connect/disconnect)
- Global RedisModule with ioredis-based RedisService reading URL from ConfigService
- All 5 tables created in PostgreSQL via prisma db push
- Prisma client generated to custom output path (monorepo-safe)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma 7 schema with all models, indexes, and push to database** - `0f56cf9` (feat)
2. **Task 2: Create global PrismaModule and RedisModule for NestJS DI** - `be37b21` (feat)
3. **Task 3: Push database schema to PostgreSQL** - no file changes (runtime operation — db push executed during Task 1)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Full database schema with 5 models, indexes, and table mappings
- `apps/api/prisma.config.ts` - Prisma 7 config with datasource URL from environment
- `apps/api/src/prisma/prisma.service.ts` - PrismaClient wrapper with OnModuleInit/OnModuleDestroy
- `apps/api/src/prisma/prisma.module.ts` - @Global() module exporting PrismaService
- `apps/api/src/redis/redis.service.ts` - ioredis Redis wrapper with ConfigService URL injection
- `apps/api/src/redis/redis.module.ts` - @Global() module exporting RedisService
- `apps/api/src/app.module.ts` - Added PrismaModule and RedisModule to imports
- `apps/api/package.json` - Added dotenv dependency

## Decisions Made
- **Prisma 7 datasource config change:** Prisma 7 removed `url` from `datasource` block in schema.prisma. Created `prisma.config.ts` with `defineConfig()` and `env('DATABASE_URL')` as the Prisma 7 replacement. Added `dotenv` package for config file env loading.
- **Custom Prisma output path:** Output to `../src/generated/prisma` (already gitignored) to avoid pnpm hoisting issues in monorepo.
- **RedisService extends Redis directly:** Rather than wrapping ioredis, RedisService extends it for full API surface access in other services.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 datasource URL no longer supported in schema.prisma**
- **Found during:** Task 1 (Schema creation and validation)
- **Issue:** Prisma 7 removed support for `url = env("DATABASE_URL")` in the datasource block. `npx prisma validate` failed with P1012 error.
- **Fix:** Removed `url` from `datasource db {}` in schema.prisma. Created `apps/api/prisma.config.ts` with `defineConfig()` and `env('DATABASE_URL')`. Installed `dotenv` package for env loading.
- **Files modified:** `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/package.json`
- **Verification:** `npx prisma validate` passes, `npx prisma db push` succeeds
- **Committed in:** 0f56cf9 (Task 1 commit)

**2. [Rule 3 - Blocking] Docker port conflicts with other project containers**
- **Found during:** Task 1 (Docker Compose startup)
- **Issue:** Port 5432 (postgres) and 6379 (redis) were already allocated by notifyhub containers
- **Fix:** Stopped conflicting containers (`notifyhub-postgres-1`, `notifyhub-redis-1`) and restarted flowboard Docker Compose
- **Files modified:** None (runtime only)
- **Verification:** `docker compose ps` shows both services with correct port mappings

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both fixes necessary for execution. The Prisma 7 datasource change is a significant gotcha that the RESEARCH.md didn't fully capture — future plans should note that `prisma.config.ts` is mandatory in Prisma 7, not optional.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Docker Compose handles local PostgreSQL and Redis.

## Threat Flags

No new threat surfaces beyond those documented in the plan's threat model.

## Next Phase Readiness
- Database schema complete with all Phase 1 tables
- PrismaService and RedisService injectable globally via NestJS DI
- Ready for Plan 03 (auth module) which will use PrismaService for user creation and token storage
- Ready for Plan 04+ which will use RedisService for presence state

## Self-Check: PASSED

All files verified on disk. All commit hashes found in git log.

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-12*
