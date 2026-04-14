---
phase: 01-foundation-auth
fixed_at: 2026-04-12T05:00:00Z
review_path: .planning/phases/01-foundation-auth/01-REVIEW.md
iteration: 2
findings_in_scope: 14
fixed: 14
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-12T05:00:00Z
**Source review:** .planning/phases/01-foundation-auth/01-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 14
- Fixed: 14
- Skipped: 0

## Fixed Issues

### CR-01: JWT Secret Falls Back to Hardcoded String

**Files modified:** `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.service.ts`
**Commit:** 3f312d1
**Applied fix:** Replaced `config.get() ?? 'dev-jwt-secret'` with `config.getOrThrow()` in auth.module.ts and `configService.getOrThrow()` in auth.service.ts for `JWT_REFRESH_SECRET`. Application now fails fast at startup if JWT secrets are not configured, preventing silent use of insecure hardcoded defaults.

### CR-02: y-websocket Path Has No Authentication

**Files modified:** `apps/api/src/websocket/yjs.setup.ts`
**Commit:** 9ebfdc6
**Applied fix:** Added JWT validation in the `/yjs/` upgrade handler within `setupDualWebSocket()`. Extracts token from query parameter, verifies via `JwtService`, and rejects with 401 if missing or invalid. Imported `JwtService` from `@nestjs/jwt`. Unauthenticated clients can no longer connect to y-websocket CRDT documents.

### CR-03: CORS Origin Hardcoded to localhost

**Files modified:** `apps/api/src/main.ts`, `apps/api/src/websocket/board.gateway.ts`, `.env.example`
**Commit:** ca9eede
**Applied fix:** Changed hardcoded `'http://localhost:5173'` CORS origin to `process.env.CORS_ORIGIN || 'http://localhost:5173'` in both main.ts and board.gateway.ts. Added `CORS_ORIGIN` to `.env.example`. Production deploys can now set the Vercel frontend URL.

### WR-01: PrismaService Bypasses ConfigService for DATABASE_URL

**Files modified:** `apps/api/src/prisma/prisma.service.ts`
**Commit:** ed31367
**Applied fix:** Injected `ConfigService` into PrismaService constructor and replaced `process.env.DATABASE_URL || 'hardcoded-fallback'` with `configService.getOrThrow<string>('DATABASE_URL')`. Removes hardcoded credentials and aligns with the NestJS DI pattern used by RedisService. ConfigModule is global, so no module import changes needed.

### WR-02: Refresh Token Replay Detection is Incomplete

**Files modified:** `apps/api/src/auth/auth.service.ts`
**Commit:** 46d0361
**Status:** fixed: requires human verification
**Applied fix:** When a revoked refresh token is presented (potential token theft), the system now revokes ALL refresh tokens for that user before throwing UnauthorizedException. This follows RFC 6819 token family revocation — both attacker and legitimate user must re-authenticate, limiting the damage window.

### WR-03: apiFetch Always Sets Content-Type: application/json

**Files modified:** `apps/web/src/lib/api.ts`
**Commit:** 1d30aad
**Applied fix:** Moved `Content-Type: application/json` header from unconditional default to conditional — only set when `options.body` is present. Preserves caller-specified Content-Type (e.g., for future multipart/form-data uploads) and avoids sending Content-Type on bodyless GET/DELETE requests.

### WR-04: apiFetch Assumes All Successful Responses Are JSON

**Files modified:** `apps/web/src/lib/api.ts`
**Commit:** 1ab9d2c
**Applied fix:** Added guard before `response.json()` — returns `undefined as T` for 204 No Content or content-length: 0 responses. Prevents `SyntaxError: Unexpected end of JSON input` on empty response bodies from DELETE or other endpoints.

### WR-05: Missing Expired Token Cleanup in RefreshToken Table

**Files modified:** `apps/api/src/auth/auth.service.ts`
**Commit:** 1e04051
**Applied fix:** Added `cleanupExpiredTokens()` method to AuthService that deletes expired tokens and revoked tokens older than 24 hours. Returns count of deleted rows. Method is documented for future @nestjs/schedule Cron integration. Does not add the scheduler dependency (scope for a future phase) but provides the cleanup logic.

### WR-06: Seed Script Demo Board ID is Not a Valid UUID

**Files modified:** `apps/api/prisma/seed.ts`
**Commit:** a352457
**Applied fix:** Changed `'demo-board-00000000-0000-0000-0000'` (invalid UUID format) to `'00000000-0000-0000-0000-000000000000'` (valid UUID v4 nil format, 8-4-4-4-12 hex structure). Ensures seed data passes any future UUID validation decorators on board endpoints.

### IN-01: Console.log Statements in Production Code

**Files modified:** `apps/api/src/websocket/yjs.setup.ts`, `apps/api/src/main.ts`
**Commit:** 5312ef1
**Applied fix:** Replaced all `console.log` statements with NestJS `Logger`. Created a `Logger('YjsSetup')` instance for yjs.setup.ts and used `Logger('Bootstrap')` in main.ts. Provides consistent log levels, formatting, and the ability to suppress logs in tests.

### IN-02: Duplicate Color Arrays Between auth.service.ts and Test Code

**Files modified:** `packages/shared/src/colors.ts`, `packages/shared/src/index.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/test/guest.e2e-spec.ts`
**Commit:** c2969d9
**Applied fix:** Extracted `USER_COLORS`, `BOT_COLORS`, and `GUEST_COLORS` to `packages/shared/src/colors.ts` and exported from the shared package index. Updated `auth.service.ts` to import `USER_COLORS` and `GUEST_COLORS` from `@flowboard/shared`, and `guest.e2e-spec.ts` to import `BOT_COLORS` from `@flowboard/shared`. Single source of truth for DESIGN.md palette values.

### IN-03: Redundant CSS Import in main.tsx

**Files modified:** `apps/web/src/main.tsx`
**Commit:** ddb0617
**Applied fix:** Removed `import './app.css'` from `main.tsx` since `App.tsx` already imports it. Since `main.tsx` renders `App`, the CSS is loaded exactly once through the component tree.

### IN-04: UserPayload Type Missing email on Guest Tokens

**Files modified:** `packages/shared/src/auth.types.ts`
**Commit:** 136745d
**Applied fix:** Made `email` optional (`email?: string`) in the `UserPayload` interface with a comment noting it's not present on guest tokens. This aligns the type contract with the implementation — `generateGuestToken()` does not include an `email` field in the JWT payload.

### IN-05: @WebSocketGateway transports Restricted to websocket Only

**Files modified:** `apps/api/src/websocket/board.gateway.ts`
**Commit:** 92a1dfc
**Applied fix:** Changed `transports: ['websocket']` to `transports: ['websocket', 'polling']` to allow Socket.io's long-polling fallback. Ensures the demo works for recruiters behind corporate proxies or older load balancers where WebSocket upgrade may fail.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-12T05:00:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_
