---
phase: 01-foundation-auth
plan: 05
subsystem: auth
tags: [jwt, bcrypt, nestjs, guards, socket.io, refresh-tokens, cookies]

requires:
  - phase: 01-02
    provides: Prisma schema with User and RefreshToken models
  - phase: 01-04
    provides: Dual WebSocket infrastructure (Socket.io gateway + y-websocket)
provides:
  - JWT auth system (register, login, refresh token rotation)
  - Global JwtAuthGuard with @Public() bypass
  - @CurrentUser() parameter decorator
  - Socket.io auth middleware (JWT validation on handshake)
  - Auth DTOs with class-validator
affects: [01-06-guest-flow, board-crud, presence, demo-mode]

tech-stack:
  added: [bcrypt, cookie-parser, @nestjs/jwt, supertest]
  patterns: [APP_GUARD global guard, @Public() decorator opt-out, HTTP-only refresh cookie, token rotation with DB revocation, WS auth middleware via afterInit]

key-files:
  created:
    - apps/api/src/auth/auth.module.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/auth/auth.service.ts
    - apps/api/src/auth/jwt-auth.guard.ts
    - apps/api/src/auth/ws-auth.middleware.ts
    - apps/api/src/auth/decorators/public.decorator.ts
    - apps/api/src/auth/decorators/current-user.decorator.ts
    - apps/api/src/auth/dto/register.dto.ts
    - apps/api/src/auth/dto/login.dto.ts
    - apps/api/test/auth.e2e-spec.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/app.controller.ts
    - apps/api/src/websocket/board.gateway.ts
    - apps/api/src/websocket/websocket.module.ts
    - apps/api/test/websocket-spike.e2e-spec.ts

key-decisions:
  - "Used APP_GUARD provider (DI-aware) instead of app.useGlobalGuards() (no DI) for JwtAuthGuard"
  - "Added crypto.randomUUID() jti claim to refresh tokens to prevent uniqueness collision on rapid token generation"
  - "Wired WS auth middleware via BoardGateway.afterInit() rather than main.ts for proper NestJS lifecycle integration"

patterns-established:
  - "Global guard via APP_GUARD with @Public() decorator opt-out — all new endpoints are protected by default"
  - "Refresh token rotation: each use revokes old token in DB, issues new one"
  - "HTTP-only cookie for refresh token with sameSite=lax and scoped path /api/auth/refresh"
  - "Socket.io auth: JWT in handshake.auth.token, user payload on socket.data.user"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: 7min
completed: 2026-04-12
---

# Phase 01 Plan 05: JWT Authentication System Summary

**Full JWT auth with bcrypt 12-round password hashing, refresh token rotation via HTTP-only cookies, global APP_GUARD with @Public() bypass, and Socket.io handshake auth middleware**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-12T03:20:37Z
- **Completed:** 2026-04-12T03:27:54Z
- **Tasks:** 2 (TDD + implementation)
- **Files modified:** 15

## Accomplishments
- Register/login/refresh endpoints with 10 E2E tests covering all edge cases (duplicate email, wrong password, token revocation, rotation replay)
- Global JwtAuthGuard protects all endpoints by default, @Public() opt-out on health and auth routes
- Socket.io auth middleware validates JWT on handshake, rejects unauthenticated connections
- Refresh token rotation with database-backed revocation (each use invalidates old token)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing E2E tests** - `b7412f9` (test)
2. **Task 1 (GREEN): Auth register/login/refresh implementation** - `d9a40ac` (feat)
3. **Task 2: Global JwtAuthGuard + Socket.io auth middleware** - `3c3ce79` (feat)

## Files Created/Modified
- `apps/api/src/auth/auth.module.ts` - AuthModule with JwtModule.registerAsync
- `apps/api/src/auth/auth.controller.ts` - Register/login/refresh endpoints with @Public()
- `apps/api/src/auth/auth.service.ts` - JWT generation, bcrypt hashing, token rotation
- `apps/api/src/auth/jwt-auth.guard.ts` - Global guard with IS_PUBLIC_KEY reflector check
- `apps/api/src/auth/ws-auth.middleware.ts` - Socket.io handshake JWT validation
- `apps/api/src/auth/decorators/public.decorator.ts` - @Public() metadata decorator
- `apps/api/src/auth/decorators/current-user.decorator.ts` - @CurrentUser() param decorator
- `apps/api/src/auth/dto/register.dto.ts` - RegisterDto with @IsEmail, @MinLength(8)
- `apps/api/src/auth/dto/login.dto.ts` - LoginDto with class-validator
- `apps/api/test/auth.e2e-spec.ts` - 10 E2E tests for auth flows
- `apps/api/src/app.module.ts` - Added AuthModule import + APP_GUARD provider
- `apps/api/src/app.controller.ts` - Added @Public() to health endpoint
- `apps/api/src/websocket/board.gateway.ts` - Added afterInit with WS auth middleware
- `apps/api/src/websocket/websocket.module.ts` - Added AuthModule import for JwtService
- `apps/api/test/websocket-spike.e2e-spec.ts` - Updated to use valid JWT, added auth rejection tests

## Decisions Made
- **APP_GUARD over useGlobalGuards:** Used `{ provide: APP_GUARD, useClass: JwtAuthGuard }` in AppModule providers so the guard gets proper DI injection of JwtService and Reflector. `app.useGlobalGuards()` in main.ts does not support DI.
- **jti claim on refresh tokens:** Added `crypto.randomUUID()` as `jti` claim in refresh token JWT payload to prevent unique constraint violations when multiple tokens are generated in the same second (same payload + same timestamp = same JWT without jti).
- **WS auth via afterInit:** Wired Socket.io auth middleware in `BoardGateway.afterInit(server)` rather than in main.ts, keeping WebSocket concerns within the NestJS module system and ensuring the middleware is applied after the server is fully initialized.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DTO strict property initialization**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** TypeScript strict mode requires definite assignment (`!:`) on class-validator DTO properties since they're set by the framework, not constructors
- **Fix:** Added `!:` to all DTO properties (email!, password!, name!)
- **Files modified:** `apps/api/src/auth/dto/register.dto.ts`, `apps/api/src/auth/dto/login.dto.ts`
- **Verification:** Tests pass, TypeScript compiles
- **Committed in:** `d9a40ac` (part of Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed refresh token uniqueness collision**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Multiple JWTs signed with same payload in the same second produce identical token strings, causing `Unique constraint failed on (token)` in RefreshToken table
- **Fix:** Added `jti: crypto.randomUUID()` claim to refresh token payload for guaranteed uniqueness
- **Files modified:** `apps/api/src/auth/auth.service.ts`
- **Verification:** Token rotation tests pass without unique constraint errors
- **Committed in:** `d9a40ac` (part of Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for correct operation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth foundation complete with all guards and middleware in place
- Ready for guest flow (plan 01-06): needs `POST /api/auth/guest` endpoint generating read-only JWTs
- @Public() decorator pattern established for guest endpoints
- Socket.io auth middleware ready for board-specific presence flows

## Self-Check: PASSED

- All 10 created files verified on disk
- All 3 task commits verified in git log (b7412f9, d9a40ac, 3c3ce79)
- All 16 tests pass (10 auth + 6 websocket)

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-12*
