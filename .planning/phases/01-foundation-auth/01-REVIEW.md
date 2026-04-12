---
phase: 01-foundation-auth
reviewed: 2026-04-12T04:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - apps/api/src/main.ts
  - apps/api/src/app.module.ts
  - apps/api/src/app.controller.ts
  - apps/api/src/app.service.ts
  - apps/api/src/auth/auth.module.ts
  - apps/api/src/auth/auth.controller.ts
  - apps/api/src/auth/auth.service.ts
  - apps/api/src/auth/jwt-auth.guard.ts
  - apps/api/src/auth/ws-auth.middleware.ts
  - apps/api/src/auth/decorators/public.decorator.ts
  - apps/api/src/auth/decorators/current-user.decorator.ts
  - apps/api/src/auth/dto/register.dto.ts
  - apps/api/src/auth/dto/login.dto.ts
  - apps/api/src/prisma/prisma.service.ts
  - apps/api/src/prisma/prisma.module.ts
  - apps/api/src/redis/redis.service.ts
  - apps/api/src/redis/redis.module.ts
  - apps/api/src/websocket/board.gateway.ts
  - apps/api/src/websocket/websocket.module.ts
  - apps/api/src/websocket/yjs.setup.ts
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/seed.ts
  - apps/api/prisma.config.ts
  - apps/api/jest.config.ts
  - apps/api/test/auth.e2e-spec.ts
  - apps/api/test/websocket-spike.e2e-spec.ts
  - apps/api/test/guest.e2e-spec.ts
  - apps/web/src/App.tsx
  - apps/web/src/main.tsx
  - apps/web/src/lib/api.ts
  - apps/web/src/pages/HomePage.tsx
  - apps/web/src/pages/LoginPage.tsx
  - apps/web/src/pages/RegisterPage.tsx
  - apps/web/src/pages/DemoPage.tsx
  - apps/web/vite.config.ts
  - apps/web/src/app.css
  - packages/shared/src/index.ts
  - packages/shared/src/auth.types.ts
  - packages/shared/src/board.types.ts
  - packages/shared/src/ws-events.types.ts
  - docker-compose.yml
  - .env.example
findings:
  critical: 3
  warning: 6
  info: 5
  total: 14
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-12T04:00:00Z
**Depth:** standard
**Files Reviewed:** 35+
**Status:** issues_found

## Summary

Phase 01 (foundation-auth) establishes the monorepo scaffold, database schema, dual WebSocket infrastructure, JWT authentication, guest JWT flow, and demo seed data. The code is generally well-structured with clean NestJS patterns, good use of TDD (E2E tests cover all auth flows), and proper separation of concerns.

Key concerns:
1. **Security (Critical):** JWT secret fallback to hardcoded string in production, y-websocket path has no authentication, and CORS hardcoded to localhost.
2. **Error handling (Warning):** Missing `await` on `verifyAsync`, unhandled empty response bodies, PrismaService bypasses ConfigService for database URL.
3. **Code quality (Info):** Debug `console.log` statements, duplicate color arrays, redundant CSS imports.

## Critical Issues

### CR-01: JWT Secret Falls Back to Hardcoded String

**File:** `apps/api/src/auth/auth.module.ts:13`
**Issue:** The `JwtModule.registerAsync` factory uses a nullish coalescing fallback: `config.get<string>('JWT_SECRET') ?? 'dev-jwt-secret'`. If `JWT_SECRET` is not set in the environment (e.g., misconfigured production deploy), the application silently uses a publicly-known secret. Any attacker can forge valid JWTs with `'dev-jwt-secret'`. The same pattern exists for `JWT_REFRESH_SECRET` in `auth.service.ts:38`.
**Fix:** Fail fast if the secret is missing. Throw at startup rather than silently degrading:
```typescript
// auth.module.ts:12-13
useFactory: (config: ConfigService) => {
  const secret = config.getOrThrow<string>('JWT_SECRET');
  return {
    secret,
    signOptions: { expiresIn: '15m' },
  };
},
```
```typescript
// auth.service.ts:37-39
this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
```
`ConfigService.getOrThrow()` throws if the key is missing or undefined, preventing silent fallback to an insecure default.

### CR-02: y-websocket Path Has No Authentication

**File:** `apps/api/src/websocket/yjs.setup.ts:14`
**Issue:** The y-websocket server accepts all upgrade requests on `/yjs/*` without any authentication. The comment on line 8-9 says "auth middleware will be wired in Plan 05" but Plan 05 only wired Socket.io auth — y-websocket remains unauthenticated. Any client can connect to `/yjs/{docName}` and read/write CRDT documents. This is a data integrity and confidentiality risk: an unauthenticated user can modify card descriptions on any board.
**Fix:** Add JWT validation in the upgrade handler before completing the WebSocket handshake:
```typescript
// yjs.setup.ts — in setupDualWebSocket, inside the /yjs/ branch:
if (pathname.startsWith('/yjs/')) {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const token = url.searchParams.get('token');
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  try {
    const jwtService = app.get(JwtService);
    jwtService.verify(token);
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  yjsWss.handleUpgrade(request, socket, head, (ws) => {
    yjsWss.emit('connection', ws, request);
  });
}
```
Note: y-websocket clients typically pass the token as a query parameter since WebSocket upgrade requests cannot carry custom headers from all browsers.

### CR-03: CORS Origin Hardcoded to localhost

**File:** `apps/api/src/main.ts:25`
**Issue:** `app.enableCors({ origin: 'http://localhost:5173' })` is hardcoded. In production (Railway deployment), the frontend will be on a Vercel domain. This will block all cross-origin requests from the production frontend, making the entire API unreachable from the deployed app. The same hardcoded origin exists in `board.gateway.ts:12`.
**Fix:** Read the allowed origin(s) from environment:
```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
});
```
```typescript
// board.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket'],
})
```
Add `CORS_ORIGIN` to `.env.example`.

## Warnings

### WR-01: PrismaService Bypasses ConfigService for DATABASE_URL

**File:** `apps/api/src/prisma/prisma.service.ts:11-12`
**Issue:** `PrismaService` reads `process.env.DATABASE_URL` directly instead of using NestJS's `ConfigService`. This bypasses the DI system, makes the service harder to test (can't override config in test modules), and creates an inconsistency: `RedisService` correctly uses `ConfigService` while `PrismaService` does not. The hardcoded fallback `'postgresql://flowboard:flowboard_dev@localhost:5432/flowboard'` contains credentials.
**Fix:** Inject `ConfigService` and use `getOrThrow`:
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }
  // ...
}
```

### WR-02: Refresh Token Replay Detection is Incomplete

**File:** `apps/api/src/auth/auth.service.ts:89-123`
**Issue:** When a refresh token is reused (potential token theft), the system only rejects the replayed token. It does not revoke the entire token family for the user. If an attacker steals a refresh token and uses it before the legitimate user, the attacker gets a valid new token pair while the victim's next refresh fails. Industry best practice (per RFC 6819) is to revoke **all** refresh tokens for the user when replay is detected — this forces both the attacker and victim to re-authenticate, limiting the damage window.
**Fix:** When a revoked token is presented, revoke all tokens for that user:
```typescript
// In refreshTokens(), after the revoked check:
if (!stored || stored.revoked) {
  // Potential token theft — revoke ALL tokens for this user
  if (stored?.userId) {
    await this.prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revoked: false },
      data: { revoked: true },
    });
  }
  throw new UnauthorizedException('Token revoked');
}
```

### WR-03: apiFetch Always Sets Content-Type: application/json

**File:** `apps/web/src/lib/api.ts:12-13`
**Issue:** `apiFetch` always sets `'Content-Type': 'application/json'` even for GET and DELETE requests that have no body. While most servers tolerate this, it can cause issues with some proxies or middleware that expect no Content-Type on bodyless requests. More importantly, if a future caller needs to send `multipart/form-data` (e.g., file uploads), the hardcoded Content-Type will override it.
**Fix:** Only set Content-Type when there's a body:
```typescript
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  // ...
}
```

### WR-04: apiFetch Assumes All Successful Responses Are JSON

**File:** `apps/web/src/lib/api.ts:32`
**Issue:** `return response.json()` is called unconditionally on successful responses. A 204 No Content response (e.g., from a future DELETE endpoint) has no body, causing `response.json()` to throw `SyntaxError: Unexpected end of JSON input`.
**Fix:** Handle empty responses:
```typescript
if (response.status === 204 || response.headers.get('content-length') === '0') {
  return undefined as T;
}
return response.json();
```

### WR-05: Missing Expired Token Cleanup in RefreshToken Table

**File:** `apps/api/prisma/schema.prisma:78-88`
**Issue:** The `RefreshToken` table stores tokens with `expiresAt` but there is no mechanism to clean up expired tokens. Over time, this table will grow unboundedly — every login and every refresh creates a new row, and revoked tokens are never deleted. For a portfolio project with demo mode generating guest tokens, this can accumulate quickly.
**Fix:** Add a scheduled cleanup (NestJS `@Cron` or a simpler approach in the seed/startup):
```typescript
// In AuthService or a separate task
async cleanupExpiredTokens() {
  await this.prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revoked: true, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });
}
```
This is a warning rather than critical because the portfolio won't have enough traffic to cause immediate issues, but it's a correctness gap.

### WR-06: Seed Script Demo Board ID is Not a Valid UUID

**File:** `apps/api/prisma/seed.ts:19`
**Issue:** `const DEMO_BOARD_ID = 'demo-board-00000000-0000-0000-0000'` is not a valid UUID format (UUIDs are `8-4-4-4-12` hex chars; this string has alpha chars in the first segment and is only 36 chars but with wrong structure). While PostgreSQL `TEXT` type accepts any string, the Prisma schema uses `@default(uuid())` suggesting UUIDs are the expected format. If any future code validates board IDs as UUIDs (e.g., a `@IsUUID()` param decorator on board endpoints), this seed data will fail validation.
**Fix:** Use a valid UUID:
```typescript
const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000000';
```

## Info

### IN-01: Console.log Statements in Production Code

**File:** `apps/api/src/websocket/yjs.setup.ts:16,19,81-83` and `apps/api/src/main.ts:39`
**Issue:** Multiple `console.log` statements are used for logging. In a production NestJS application, these should use NestJS's built-in `Logger` service for consistent log levels, formatting, and the ability to suppress logs in tests.
**Fix:** Replace with NestJS Logger:
```typescript
import { Logger } from '@nestjs/common';
const logger = new Logger('YjsSetup');
logger.log(`Client connected to document: ${docName}`);
```

### IN-02: Duplicate Color Arrays Between auth.service.ts and Shared Types

**File:** `apps/api/src/auth/auth.service.ts:14-27`
**Issue:** `USER_COLORS`, `BOT_COLORS`, and `GUEST_COLORS` are defined as constants in `auth.service.ts`. `BOT_COLORS` is also duplicated in `test/guest.e2e-spec.ts:9`. These palette values come from DESIGN.md and will need to stay in sync. If a color is changed, multiple files need updating.
**Fix:** Consider extracting color constants to `@flowboard/shared` so they're shared between backend and test code:
```typescript
// packages/shared/src/colors.ts
export const BOT_COLORS = ['#F472B6', '#4ADE80', '#A78BFA'];
export const GUEST_COLORS = ['#22D3EE', '#FBBF24', '#FB7185', '#60A5FA', '#2DD4BF'];
```

### IN-03: Redundant CSS Import in main.tsx

**File:** `apps/web/src/main.tsx:3`
**Issue:** `import './app.css'` is imported in both `main.tsx` (line 3) and `App.tsx` (line 2). Since `main.tsx` renders `App`, the CSS is loaded twice. While bundlers deduplicate this at build time, it's cleaner to import CSS in only one place.
**Fix:** Remove the import from `main.tsx` since `App.tsx` already imports it, or vice versa.

### IN-04: `UserPayload` Shared Type Missing `email` on Guest Tokens

**File:** `packages/shared/src/auth.types.ts:1-7` vs `apps/api/src/auth/auth.service.ts:141-148`
**Issue:** The `UserPayload` interface in shared types requires `email: string`, but guest tokens generated by `generateGuestToken()` do not include an `email` field. Any code that destructures `UserPayload` and expects `email` to exist will fail for guest users at runtime. The type contract doesn't match the implementation.
**Fix:** Make `email` optional in the shared type, or add a separate `GuestPayload` type:
```typescript
export interface UserPayload {
  sub: string;
  email?: string;  // Not present on guest tokens
  name: string;
  color: string;
  role: 'user' | 'guest';
}
```

### IN-05: `@WebSocketGateway` transports Restricted to websocket Only

**File:** `apps/api/src/websocket/board.gateway.ts:13`
**Issue:** `transports: ['websocket']` disables Socket.io's long-polling fallback. While WebSocket-only is faster, it prevents connections from environments where WebSocket upgrade fails (some corporate proxies, older load balancers). For a portfolio project where recruiters may be behind corporate networks, this could prevent the demo from working.
**Fix:** Consider allowing both transports (the Socket.io default) or documenting this as a deliberate choice:
```typescript
transports: ['websocket', 'polling'], // Allow fallback for corporate proxies
```

---

_Reviewed: 2026-04-12T04:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
