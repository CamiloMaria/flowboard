---
phase: 01-foundation-auth
fixed_at: 2026-04-12T04:30:00Z
review_path: .planning/phases/01-foundation-auth/01-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-12T04:30:00Z
**Source review:** .planning/phases/01-foundation-auth/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
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

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-04-12T04:30:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
