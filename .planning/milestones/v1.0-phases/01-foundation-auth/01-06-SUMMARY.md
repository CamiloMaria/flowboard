---
phase: 01-foundation-auth
plan: 06
subsystem: auth
tags: [jwt, guest, seed, prisma, nestjs, demo]

# Dependency graph
requires:
  - phase: 01-foundation-auth/01-05
    provides: JWT auth module with register/login/refresh, guards, decorators
provides:
  - Guest JWT endpoint (POST /api/auth/guest) for anonymous demo access
  - Database seed script with 3 bot users, demo board, 5 lists, 17 cards
affects: [demo-mode, frontend-guest-flow, board-crud]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guest JWT: ephemeral UUID, no DB row, 24h expiry, bot-excluded colors"
    - "Prisma 7 seed: prisma.config.ts migrations.seed, PrismaPg adapter required"
    - "Idempotent seeding: upsert for users/board, deleteMany+recreate for lists/cards"

key-files:
  created:
    - apps/api/prisma/seed.ts
    - apps/api/test/guest.e2e-spec.ts
  modified:
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/package.json
    - apps/api/prisma.config.ts

key-decisions:
  - "Prisma 7 seed uses prisma.config.ts migrations.seed (not package.json prisma.seed)"
  - "Seed script uses PrismaPg adapter matching PrismaService pattern"
  - "Guest color palette excludes bot colors (GUEST_COLORS != BOT_COLORS)"

patterns-established:
  - "Guest JWT: crypto.randomUUID() for sub, no DB interaction, same signing key"
  - "Seed idempotency: upsert for entities with stable IDs, delete+recreate for generated data"

requirements-completed: [AUTH-05, AUTH-06]

# Metrics
duration: 6min
completed: 2026-04-12
---

# Phase 01 Plan 06: Guest JWT & Demo Seed Summary

**Guest JWT endpoint (POST /api/auth/guest) with 24h ephemeral tokens and idempotent seed script creating 3 bots, demo board, 5 lists, 17 cards**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-12T03:31:00Z
- **Completed:** 2026-04-12T03:37:26Z
- **Tasks:** 2 (TDD task: 2 commits for RED+GREEN)
- **Files modified:** 6

## Accomplishments
- Guest JWT endpoint generates ephemeral tokens with UUID sub, random name/color, role: "guest", 24h expiry — no database row created
- Guest colors properly exclude bot-assigned colors (#F472B6, #4ADE80, #A78BFA)
- Database seed creates 3 bot users (Maria, Carlos, Ana), 1 demo board with is_demo: true, 5 lists, and 17 cards with realistic titles
- Seed is idempotent — safe to re-run without duplicating data
- 6 E2E tests cover guest JWT payload, expiry, uniqueness, color exclusion, and no-DB-row behavior

## Task Commits

Each task was committed atomically:

1. **Task 1a: Add failing guest E2E tests (RED)** - `a1069f2` (test)
2. **Task 1b: Implement guest JWT endpoint (GREEN)** - `e27ebd7` (feat)
3. **Task 2: Create database seed script** - `52324a3` (feat)

## Files Created/Modified
- `apps/api/test/guest.e2e-spec.ts` - 6 E2E tests for guest JWT flow
- `apps/api/src/auth/auth.service.ts` - Added generateGuestToken() method, BOT_COLORS/GUEST_COLORS constants
- `apps/api/src/auth/auth.controller.ts` - Added POST /api/auth/guest endpoint with @Public()
- `apps/api/prisma/seed.ts` - Full seed script with bots, demo board, lists, cards
- `apps/api/package.json` - Added prisma.seed config (package.json approach, kept for docs)
- `apps/api/prisma.config.ts` - Added migrations.seed command for Prisma 7

## Decisions Made
- **Prisma 7 seed config:** Prisma 7 moved seed configuration from `package.json` to `prisma.config.ts` under `migrations.seed`. The plan specified package.json but runtime showed the new pattern is required.
- **PrismaPg adapter in seed:** Prisma 7 requires a driver adapter in `PrismaClient` constructor. Seed script uses same `PrismaPg` adapter pattern as `PrismaService`.
- **Stable demo board ID:** Used `demo-board-00000000-0000-0000-0000` as a stable ID for upsert idempotency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 seed config location changed**
- **Found during:** Task 2 (Seed script creation)
- **Issue:** Plan specified `package.json` prisma.seed config, but Prisma 7 requires `prisma.config.ts` migrations.seed
- **Fix:** Added `seed: 'npx ts-node prisma/seed.ts'` to prisma.config.ts migrations section
- **Files modified:** apps/api/prisma.config.ts
- **Verification:** `npx prisma db seed` runs successfully
- **Committed in:** 52324a3

**2. [Rule 3 - Blocking] PrismaClient constructor requires adapter in Prisma 7**
- **Found during:** Task 2 (Seed script creation)
- **Issue:** `new PrismaClient()` without arguments throws TS2554 — Prisma 7 requires adapter parameter
- **Fix:** Added PrismaPg adapter initialization matching existing PrismaService pattern
- **Files modified:** apps/api/prisma/seed.ts
- **Verification:** Seed script compiles and executes correctly
- **Committed in:** 52324a3

---

**Total deviations:** 2 auto-fixed (2 blocking — Prisma 7 config changes)
**Impact on plan:** Both fixes required for Prisma 7 compatibility. No scope creep.

## Issues Encountered
None — all issues were Prisma 7 config differences resolved via deviation rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 01 (foundation-auth) is complete: all 6 plans executed
- Auth system fully functional: register, login, refresh, guest JWT
- Demo board seeded with realistic data for the recruiter first impression
- Ready for Phase 02 (board/list/card CRUD and real-time features)

## Self-Check: PASSED

All key files verified on disk. All commit hashes found in git history.

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-12*
