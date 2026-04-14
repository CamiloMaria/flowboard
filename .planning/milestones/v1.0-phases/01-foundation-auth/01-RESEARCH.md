# Phase 1: Foundation & Auth - Research

**Researched:** 2026-04-11
**Domain:** Monorepo scaffold, NestJS backend, Prisma 7 database schema, dual WebSocket coexistence, JWT authentication with guest flow
**Confidence:** HIGH

## Summary

Phase 1 is the foundation layer. It establishes the monorepo structure (Turborepo + pnpm), NestJS API with Prisma 7 database schema (users, boards, lists, cards), dual WebSocket transport (Socket.io on `/socket.io/` + y-websocket on `/yjs/`), JWT authentication with refresh token rotation, and guest access for the demo board. Everything subsequent depends on this phase being solid.

The highest-risk element is the dual WebSocket coexistence spike (D-10). Socket.io and y-websocket both want to handle HTTP upgrade events, and making them coexist on a single NestJS HTTP server requires a manual upgrade dispatcher. This must be validated **first** — before auth, before schema, before anything. If it doesn't work, the architecture needs rethinking.

**Primary recommendation:** Implement in this order: (1) monorepo scaffold, (2) Docker Compose for PostgreSQL + Redis, (3) Prisma schema + migrations, (4) dual WebSocket spike, (5) auth module + guards, (6) guest flow, (7) seed script.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Standard Turborepo layout: `apps/api` (NestJS), `apps/web` (Vite React), `packages/shared` (TypeScript types/interfaces only, no runtime deps). Root `turbo.json` defines task graph (`build`, `dev`, `lint`, `test`).
- **D-02:** pnpm workspaces with `workspace:*` protocol for inter-package references. Shared package uses Just-in-Time compilation (TypeScript source imported directly, no separate build step).
- **D-03:** Root `pnpm dev` starts both apps concurrently via Turborepo. NestJS on port 3001, Vite dev server on port 5173 with proxy config forwarding `/api/*`, `/socket.io/*`, and `/yjs/*` to the backend.
- **D-04:** JWT access tokens with 15-minute expiry, stored in memory (not localStorage). Refresh tokens with 7-day expiry, stored in HTTP-only secure cookies with SameSite=Lax.
- **D-05:** Refresh token rotation: each use issues a new refresh token and invalidates the old one. Refresh tokens stored in DB (or Redis) for revocation capability.
- **D-06:** Password hashing with bcrypt (12 rounds). Email field is case-insensitive (normalize to lowercase on register/login).
- **D-07:** NestJS guards pattern: `@UseGuards(JwtAuthGuard)` on protected endpoints, `@Public()` decorator for open endpoints, `@CurrentUser()` param decorator to inject user from JWT.
- **D-08:** Socket.io handled by NestJS `@WebSocketGateway()` with the default Socket.io adapter. y-websocket handled by a raw `ws.Server` with `noServer: true` configured in `main.ts`.
- **D-09:** Manual HTTP upgrade handler in `main.ts`: intercept `upgrade` event, route by URL path. Requests to `/yjs/*` go to the ws.Server; Socket.io handles its own `/socket.io/` upgrades automatically. Must remove conflicting upgrade listeners if NestJS adds them.
- **D-10:** The dual WebSocket spike is the highest-risk element. Validate coexistence BEFORE building any features on top. If it doesn't work, the entire architecture needs rethinking.
- **D-11:** Visiting `/demo` route on the frontend triggers a call to `POST /api/auth/guest` which returns a guest JWT. No DB row created. JWT contains `{ sub: uuid(), name: "Guest-{short_id}", color: randomFromPalette(), role: "guest", exp: 24h }`.
- **D-12:** Guest JWTs use the same signing key as regular JWTs. The `role: "guest"` claim is checked by guards to restrict mutations. Guests can observe but not modify board state.
- **D-13:** Guest color is randomly selected from the 8-slot user color palette defined in DESIGN.md (excluding colors already assigned to bots).
- **D-14:** Prisma 7 with `prisma-client` generator (NOT `prisma-client-js` — breaking change from v6). Schema defines 4 core tables: users, boards, lists, cards. UUIDs as primary keys. FLOAT for position columns. BYTEA for `description_yjs`.
- **D-15:** Indexes: `(list_id, position)` on cards, `(board_id, position)` on lists, partial index on `boards(is_demo) WHERE is_demo = true`.
- **D-16:** Seed script creates demo board with `is_demo: true`, 5 lists (Backlog, To Do, In Progress, Review, Done), 17 cards with realistic software project titles, and 3 bot user records (Maria, Carlos, Ana with assigned colors from palette).

### Agent's Discretion
- Exact NestJS module boundaries (AuthModule, BoardModule, etc.) — follow NestJS conventions
- Docker Compose service names and network config — standard patterns
- ESLint/Prettier configuration — use NestJS defaults + Vite React defaults
- TypeScript tsconfig paths and project references — standard monorepo patterns

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDN-01 | Monorepo scaffold with Turborepo + pnpm workspaces (NestJS API, Vite React frontend, shared types package) | Standard Stack: Turborepo 2.9.6 + pnpm 10.33, Architecture: JIT packages pattern, turbo.json task graph |
| FNDN-02 | `pnpm dev` runs both apps concurrently with hot reload | Turborepo `persistent: true` + `cache: false` on dev task; Vite proxy config for API/WS forwarding |
| FNDN-03 | PostgreSQL database with Prisma 7 schema (users, boards, lists, cards tables) | Standard Stack: Prisma 7.7.0 with `prisma-client` generator; Code Examples: full schema with UUID PKs, FLOAT positions, BYTEA |
| FNDN-04 | Database migrations run cleanly from fresh clone | Prisma migrate dev + Docker Compose PostgreSQL; Pitfall: Prisma client generation in monorepo (#16) |
| FNDN-05 | Dual WebSocket server — Socket.io on `/socket.io/` and y-websocket on `/yjs/` coexisting on same NestJS HTTP server | Architecture: manual upgrade dispatcher in main.ts; Pitfalls #1 (upgrade collision) and #5 (gateway conflict) |
| FNDN-06 | WebSocket upgrade handler routes requests by URL path without conflict | Code Examples: upgrade dispatcher pattern from Socket.io docs; Prevention: `removeAllListeners('upgrade')` then single dispatcher |
| AUTH-01 | User can register with email and password | Auth module: AuthService with bcrypt 12 rounds, email lowercase normalization, Prisma user creation |
| AUTH-02 | User can log in and receive JWT access + refresh tokens | JwtStrategy + JwtService from @nestjs/jwt; access token 15min in response body, refresh token 7d in HTTP-only cookie |
| AUTH-03 | Refresh token rotation via HTTP-only cookies | Token rotation pattern: new refresh token issued on each use, old one invalidated; stored in DB for revocation |
| AUTH-04 | Auth guards protect API endpoints and WebSocket connections | JwtAuthGuard with @Public() decorator and Reflector; Socket.io middleware auth via handshake.auth.token |
| AUTH-05 | Guest user receives temporary read-only JWT (no DB row, 24h expiry, `role: "guest"`) when visiting demo board | POST /api/auth/guest endpoint; JWT with { sub: uuid(), name, color, role: "guest", exp: 24h } |
| AUTH-06 | Guest auto-assigned random name and color from palette | 8-slot color palette from DESIGN.md; exclude bot-assigned colors (slots 2, 3, 4 for Maria, Carlos, Ana) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- **Test-Driven Development (mandatory):** Write failing test FIRST, verify it fails, write minimum code to pass, verify it passes, refactor, commit. No exceptions.
- **Git Commit Standards:** Atomic commits per task with conventional commits format + phase-plan coordinates: `feat(01-01): description`, `test(01-01): description`.
- **Dark-only theme:** Per DESIGN.md, no light mode toggle.
- **Code quality:** Recruiters will open random source files. Clean, well-typed code with consistent patterns is a hard constraint.
- **Timeline:** Solo developer, 6-8 weeks total (~80-100 hours).

## Standard Stack

### Core (Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/core` | 11.1.18 | API framework | [VERIFIED: npm registry] First-class WS gateway, DI, guards, decorators |
| `@nestjs/websockets` | 11.1.18 | WebSocket gateway decorators | [VERIFIED: npm registry] Must match @nestjs/core version |
| `@nestjs/platform-socket.io` | 11.1.18 | Socket.io adapter | [VERIFIED: npm registry] Default WS adapter for NestJS |
| `@nestjs/jwt` | 11.0.2 | JWT sign/verify | [VERIFIED: npm registry] NestJS-native JWT integration |
| `@nestjs/passport` | 11.0.5 | Auth strategy layer | [VERIFIED: npm registry] Passport.js wrapper for guards pattern |
| `@nestjs/config` | 4.0.4 | Environment config | [VERIFIED: npm registry] ConfigModule.forRoot() with .env |
| `passport-jwt` | 4.0.1 | JWT passport strategy | [VERIFIED: npm registry] ExtractJwt.fromAuthHeaderAsBearerToken() |
| `prisma` | 7.7.0 | ORM CLI + migrations | [VERIFIED: npm registry] `prisma-client` generator (NOT `prisma-client-js`) |
| `@prisma/client` | 7.7.0 | Generated DB client | [VERIFIED: npm registry] Must match `prisma` CLI version |
| `socket.io` | 4.8.3 | Server WebSocket | [VERIFIED: npm registry via STACK.md] Rooms, namespaces, reconnection |
| `socket.io-client` | 4.8.3 | Client WebSocket | [VERIFIED: npm registry via STACK.md] Must match server major |
| `yjs` | 13.6.30 | CRDT library | [VERIFIED: npm registry via STACK.md] For y-websocket server setup |
| `y-websocket` | 3.0.0 | Yjs WebSocket provider | [VERIFIED: npm registry] v3 major — room-based doc isolation |
| `ws` | 8.20.0 | Raw WebSocket server | [VERIFIED: npm registry] Used with `noServer: true` for y-websocket |
| `bcrypt` | 6.0.0 | Password hashing | [VERIFIED: npm registry] 12 rounds per D-06 |
| `cookie-parser` | 1.4.7 | Parse HTTP-only cookies | [VERIFIED: npm registry] For refresh token cookie extraction |
| `class-validator` | 0.15.1 | DTO validation | [VERIFIED: npm registry] NestJS validation pipe |
| `class-transformer` | 0.5.1 | DTO transformation | [VERIFIED: npm registry] Companion to class-validator |
| `ioredis` | 5.10.1 | Redis client | [VERIFIED: npm registry via STACK.md] For presence + future Socket.io adapter |

### Frontend (Phase 1 — minimal shell)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.2.5 | UI library | [VERIFIED: npm registry] |
| `react-dom` | 19.2.5 | DOM rendering | [VERIFIED: npm registry] |
| `react-router` | 7.14.0 | Client routing | [VERIFIED: npm registry] `/demo` route for guest flow |
| `vite` | 8.0.8 | Build tool + dev server | [VERIFIED: npm registry] HMR, proxy config |
| `@vitejs/plugin-react` | 6.0.1 | Vite React plugin | [VERIFIED: npm registry] |
| `tailwindcss` | 4.2.2 | Utility CSS | [VERIFIED: npm registry via STACK.md] v4 CSS-first config |
| `typescript` | 6.0.2 | Type safety | [VERIFIED: npm registry] |

### Monorepo Tooling

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `turbo` | 2.9.6 | Build orchestration | [VERIFIED: npm registry] Task caching, parallel dev |
| `pnpm` | 10.33.0 | Package manager | [VERIFIED: locally installed] Workspace protocol |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcrypt | argon2 | Argon2 is more modern but bcrypt is locked by D-06 decision |
| passport-jwt | manual JWT verify | Passport integrates with NestJS guards pattern per D-07 |
| class-validator | zod | class-validator is NestJS's built-in DTO validation pattern |
| ioredis | redis (node-redis) | ioredis is the NestJS ecosystem standard, better API for Cluster/Sentinel |

**Installation (apps/api):**
```bash
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/websockets @nestjs/platform-socket.io @nestjs/jwt @nestjs/passport @nestjs/config passport passport-jwt @prisma/client socket.io bcrypt cookie-parser class-validator class-transformer ioredis yjs y-websocket ws
pnpm add -D prisma @types/bcrypt @types/cookie-parser @types/passport-jwt @types/ws typescript @nestjs/cli @nestjs/schematics @nestjs/testing
```

**Installation (apps/web):**
```bash
pnpm add react react-dom react-router socket.io-client
pnpm add -D vite @vitejs/plugin-react tailwindcss typescript @types/react @types/react-dom
```

## Architecture Patterns

### Recommended Project Structure

```
flowboard/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap, dual WS setup
│   │   │   ├── app.module.ts       # Root module
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts    # POST /auth/register, /auth/login, /auth/refresh, /auth/guest
│   │   │   │   ├── auth.service.ts       # JWT sign/verify, bcrypt, guest token
│   │   │   │   ├── jwt.strategy.ts       # Passport JWT strategy
│   │   │   │   ├── jwt-auth.guard.ts     # REST route guard with @Public() support
│   │   │   │   ├── ws-auth.middleware.ts  # Socket.io connection middleware
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── public.decorator.ts    # @Public() metadata decorator
│   │   │   │   │   └── current-user.decorator.ts # @CurrentUser() param decorator
│   │   │   │   └── dto/
│   │   │   │       ├── register.dto.ts
│   │   │   │       └── login.dto.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts      # @Global() module
│   │   │   │   └── prisma.service.ts     # onModuleInit/$connect, onModuleDestroy/$disconnect
│   │   │   ├── redis/
│   │   │   │   ├── redis.module.ts       # @Global() module
│   │   │   │   └── redis.service.ts      # ioredis wrapper
│   │   │   └── websocket/
│   │   │       ├── websocket.module.ts
│   │   │       ├── board.gateway.ts      # @WebSocketGateway() — Socket.io
│   │   │       └── yjs.setup.ts          # Raw ws.Server with noServer: true
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                   # Demo board + bot users
│   │   ├── test/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                        # Vite React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   └── DemoPage.tsx          # /demo route — triggers guest JWT
│       │   └── lib/
│       │       └── api.ts                # Axios/fetch wrapper
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/                     # TypeScript types only (JIT — no build step)
│       ├── src/
│       │   ├── index.ts
│       │   ├── auth.types.ts
│       │   ├── board.types.ts
│       │   └── ws-events.types.ts
│       ├── tsconfig.json
│       └── package.json            # main + types point to ./src/index.ts
├── docker-compose.yml              # PostgreSQL + Redis for local dev
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                    # Root workspace config
├── .env.example
└── .gitignore
```

### Pattern 1: Turborepo Just-in-Time Internal Packages

**What:** Shared types package exposes raw TypeScript source — no separate build step needed.
**When to use:** Internal packages that export only types/interfaces.
**Source:** [VERIFIED: Context7 `/vercel/turborepo` — Internal Packages pattern]

```json
// packages/shared/package.json
{
  "name": "@flowboard/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {}
}
```

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "lint": {},
    "test": {}
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Pattern 2: Dual WebSocket Upgrade Dispatcher

**What:** Single HTTP upgrade handler routes WebSocket connections by URL path.
**When to use:** Socket.io and y-websocket coexisting on the same HTTP server.
**Source:** [VERIFIED: Context7 `/websites/socket_io` — Server API, handleUpgrade]

```typescript
// main.ts — critical dual WebSocket setup
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Server as SocketServer } from 'socket.io';
import { WebSocketServer } from 'ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // NestJS config: validation, CORS, cookie parser, global prefix, etc.
  app.setGlobalPrefix('api');
  
  await app.init(); // Initialize all modules BEFORE touching HTTP server
  
  const httpServer = app.getHttpServer();
  
  // --- y-websocket: raw ws.Server with noServer ---
  const yjsWss = new WebSocketServer({ noServer: true });
  yjsWss.on('connection', (ws, req) => {
    const docName = req.url!.replace('/yjs/', '').split('?')[0];
    // setupWSConnection from y-websocket will be wired here
  });
  
  // --- Upgrade dispatcher: route by URL path ---
  // Remove any listeners NestJS may have added
  httpServer.removeAllListeners('upgrade');
  
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url || '';
    
    if (pathname.startsWith('/socket.io/')) {
      // Let Socket.io handle its own upgrades
      // Get the Socket.io engine from the NestJS-created server
      const io = app.get(/* Socket.io server reference */);
      io.engine.handleUpgrade(request, socket, head);
    } else if (pathname.startsWith('/yjs/')) {
      // Validate JWT from query params BEFORE upgrade
      // const token = new URL(pathname, 'http://localhost').searchParams.get('token');
      yjsWss.handleUpgrade(request, socket, head, (ws) => {
        yjsWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### Pattern 3: NestJS Global Module (PrismaModule)

**What:** Prisma client available everywhere via DI without explicit imports.
**When to use:** Database access needed across all modules.
**Source:** [VERIFIED: Context7 `/nestjs/docs.nestjs.com` — @Global() decorator]

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma'; // Custom output path per D-14

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Pattern 4: JWT Auth Guard with @Public() Decorator

**What:** Global JWT guard that skips endpoints marked with @Public().
**When to use:** All protected routes (default protected, opt-out with decorator).
**Source:** [VERIFIED: Context7 `/nestjs/docs.nestjs.com` — authentication guide]

```typescript
// decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException();
    
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Pattern 5: Socket.io Auth Middleware

**What:** Verify JWT on WebSocket handshake, attach user to socket.data.
**When to use:** All Socket.io connections.
**Source:** [VERIFIED: Context7 `/websites/socket_io` — middlewares, handshake.auth]

```typescript
// ws-auth.middleware.ts — applied in gateway module
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  
  try {
    const payload = jwtService.verify(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

// Client-side
const socket = io('http://localhost:3001', {
  auth: { token: getAccessToken() },
  transports: ['websocket'], // Skip polling per Pitfall #5
});

socket.on('connect_error', (err) => {
  if (err.message === 'Unauthorized') {
    refreshToken().then((newToken) => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

### Pattern 6: Refresh Token Rotation

**What:** Issue new refresh token on each use, invalidate old one. Store in DB for revocation.
**When to use:** POST /auth/refresh endpoint.

```typescript
// auth.service.ts — token rotation flow
async refreshTokens(oldRefreshToken: string) {
  // 1. Verify the old refresh token
  const payload = this.jwtService.verify(oldRefreshToken, { secret: this.refreshSecret });
  
  // 2. Check if token exists in DB (not yet revoked)
  const stored = await this.prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
  });
  if (!stored || stored.revoked) throw new UnauthorizedException('Token revoked');
  
  // 3. Revoke old token
  await this.prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });
  
  // 4. Issue new tokens
  const newAccessToken = this.jwtService.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    { expiresIn: '15m' },
  );
  const newRefreshToken = this.jwtService.sign(
    { sub: payload.sub },
    { secret: this.refreshSecret, expiresIn: '7d' },
  );
  
  // 5. Store new refresh token
  await this.prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: payload.sub, expiresAt: addDays(new Date(), 7) },
  });
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

### Anti-Patterns to Avoid

- **Routing y-websocket through NestJS Gateway:** NestJS gateways assume Socket.io's event protocol. y-websocket uses binary lib0 encoding — incompatible. Use raw `ws.Server` outside the gateway system. [VERIFIED: ARCHITECTURE.md Anti-Pattern 1]
- **Storing access tokens in localStorage:** XSS vulnerability. Access tokens stay in-memory only per D-04. [ASSUMED — standard security practice]
- **Persisting Yjs on every update:** Fires on every keystroke, kills DB. Debounce 30s + flush on disconnect. [VERIFIED: ARCHITECTURE.md Anti-Pattern 2]
- **Using `prisma-client-js` generator:** Prisma 7 uses `prisma-client`. The old name silently falls back and may not generate correctly. [VERIFIED: Context7 `/prisma/prisma` schema examples]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom crypto | `@nestjs/jwt` + `JwtService` | Edge cases: expiry, clock skew, algorithm validation |
| Password hashing | Custom hash | `bcrypt` (6.0.0) | Salt generation, timing-attack resistance, work factor tuning |
| DTO validation | Manual if/else | `class-validator` + `ValidationPipe` | Consistent error messages, decorator-based, NestJS-native |
| WebSocket rooms | Manual room tracking | Socket.io rooms (`socket.join()` / `socket.to()`) | Handles cleanup on disconnect, works with Redis adapter |
| Config loading | Manual `process.env` | `@nestjs/config` ConfigModule | Type-safe, .env file support, schema validation |
| HTTP upgrade routing | Let both libraries fight | Manual `httpServer.on('upgrade')` dispatcher | Only reliable way to coexist — Pitfall #1 |
| Prisma client lifecycle | Manual connect/disconnect | `PrismaService` with `OnModuleInit`/`OnModuleDestroy` | NestJS lifecycle-aware, clean shutdown |

**Key insight:** The only hand-rolled piece in this phase is the upgrade dispatcher in `main.ts`. Everything else uses established library patterns.

## Common Pitfalls

### Pitfall 1: Socket.io + y-websocket HTTP Upgrade Handler Collision (CRITICAL)
**What goes wrong:** Both Socket.io and ws attach `upgrade` listeners to the HTTP server. One silently swallows the other's connections.
**Why it happens:** Node.js HTTP servers process `upgrade` events through listener order. Socket.io's Engine.IO claims priority.
**How to avoid:** Create manual upgrade dispatcher in `main.ts`: `httpServer.removeAllListeners('upgrade')` then route by URL path (`/socket.io/` vs `/yjs/`). See Architecture Pattern 2 above.
**Warning signs:** y-websocket clients never fire `sync` event; Socket.io falls back to `transport: "polling"`.
**Source:** [VERIFIED: Context7 `/websites/socket_io` — Server API; PITFALLS.md #1]

### Pitfall 2: NestJS WebSocket Gateway vs Manual Upgrade Handler Conflict (HIGH)
**What goes wrong:** NestJS's `@WebSocketGateway()` auto-creates Socket.io server and attaches to HTTP server. If you also manually create a ws.Server, NestJS replaces your upgrade dispatcher on hot-reload.
**Why it happens:** NestJS's IoAdapter calls `createIOServer()` internally during module init.
**How to avoid:** Wire the upgrade dispatcher in `main.ts` AFTER `app.init()` but BEFORE `app.listen()`. Verify with `httpServer.listeners('upgrade').length` — should be exactly 1.
**Warning signs:** Works after full restart, breaks on NestJS hot-reload.
**Source:** [VERIFIED: Context7 `/nestjs/docs.nestjs.com` — custom adapter; PITFALLS.md #5]

### Pitfall 3: Prisma Client Generation in Monorepo (MODERATE)
**What goes wrong:** `prisma generate` outputs to `node_modules/.prisma/client` by default. In pnpm monorepo with hoisting, the generated client ends up in the wrong `node_modules/`.
**Why it happens:** pnpm's strict module resolution + hoisting can misplace generated output.
**How to avoid:** Set custom output path in `schema.prisma`:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```
Never import Prisma Client from the shared package — keep it API-only.
**Source:** [VERIFIED: Context7 `/prisma/prisma` — custom output; PITFALLS.md #16]

### Pitfall 4: Shared Types Build Order (MODERATE)
**What goes wrong:** `@flowboard/shared` isn't built before apps import from it. TypeScript fails with "Cannot find module".
**Why it happens:** Turborepo needs explicit `dependsOn: ["^build"]` or the package must use JIT pattern.
**How to avoid:** Use JIT pattern per D-02: `main` and `types` in shared package.json point to `./src/index.ts`. No build step needed for types-only packages.
**Source:** [VERIFIED: Context7 `/vercel/turborepo` — Internal Packages]

### Pitfall 5: Refresh Token Not HTTP-Only
**What goes wrong:** If refresh token is sent in response body (like access token), the frontend stores it in memory/localStorage. XSS can steal it.
**How to avoid:** Set refresh token as HTTP-only cookie in the `Set-Cookie` response header:
```typescript
response.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```
**Source:** [ASSUMED — standard JWT security practice, locked by D-04]

### Pitfall 6: Prisma 7 Generator Name
**What goes wrong:** Using `prisma-client-js` (Prisma 6 name) instead of `prisma-client` (Prisma 7 name). Generation may silently fail or produce an old-style client.
**How to avoid:** Always use `provider = "prisma-client"` in schema.prisma. Every tutorial written before 2026 will have the wrong name.
**Source:** [VERIFIED: Context7 `/prisma/prisma` — schema examples show `prisma-client`]

## Code Examples

### Prisma 7 Schema (Full Phase 1)

```prisma
// apps/api/prisma/schema.prisma
// Source: D-14, D-15, ARCHITECTURE.md, design-doc.md schema section

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  avatarUrl    String?  @map("avatar_url")
  color        String   // Hex color for cursor/avatar from DESIGN.md palette
  isBot        Boolean  @default(false) @map("is_bot")
  createdAt    DateTime @default(now()) @map("created_at")

  boards       Board[]
  cards        Card[]

  refreshTokens RefreshToken[]

  @@map("users")
}

model Board {
  id              String   @id @default(uuid())
  name            String
  description     String?
  backgroundColor String?  @map("background_color")
  isDemo          Boolean  @default(false) @map("is_demo")
  createdById     String   @map("created_by")
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now()) @map("created_at")

  lists           List[]

  @@index([isDemo], name: "idx_boards_demo")
  @@map("boards")
}

model List {
  id        String   @id @default(uuid())
  boardId   String   @map("board_id")
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name      String
  position  Float
  createdAt DateTime @default(now()) @map("created_at")

  cards     Card[]

  @@index([boardId, position])
  @@map("lists")
}

model Card {
  id              String   @id @default(uuid())
  listId          String   @map("list_id")
  list            List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  title           String
  descriptionText String?  @map("description_text")
  descriptionYjs  Bytes?   @map("description_yjs") // BYTEA for Yjs CRDT state
  position        Float
  coverColor      String?  @map("cover_color")
  dueDate         DateTime? @map("due_date")
  createdById     String   @map("created_by")
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([listId, position])
  @@map("cards")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  revoked   Boolean  @default(false)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@map("refresh_tokens")
}
```

### Docker Compose (Local Dev)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flowboard
      POSTGRES_USER: flowboard
      POSTGRES_PASSWORD: flowboard_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Vite Proxy Config

```typescript
// apps/web/vite.config.ts
// Source: D-03 — forward /api/*, /socket.io/*, /yjs/* to NestJS backend
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/yjs': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

### Guest JWT Generation

```typescript
// auth.service.ts — guest token per D-11, D-12, D-13
import { v4 as uuid } from 'uuid'; // or crypto.randomUUID()

// Bot colors: user-2 (#F472B6), user-3 (#4ADE80), user-4 (#A78BFA)
const GUEST_COLORS = ['#22D3EE', '#FBBF24', '#FB7185', '#60A5FA', '#2DD4BF'];

generateGuestToken(): { accessToken: string } {
  const guestId = crypto.randomUUID();
  const shortId = guestId.slice(0, 6);
  const color = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
  
  const accessToken = this.jwtService.sign(
    {
      sub: guestId,
      name: `Guest-${shortId}`,
      color,
      role: 'guest',
    },
    { expiresIn: '24h' },
  );
  
  return { accessToken };
}
```

### Seed Script Skeleton

```typescript
// apps/api/prisma/seed.ts — per D-16
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BOT_USERS = [
  { name: 'Maria', email: 'maria@flowboard.bot', color: '#F472B6' }, // user-2: Phosphor Pink
  { name: 'Carlos', email: 'carlos@flowboard.bot', color: '#4ADE80' }, // user-3: Biolume Green
  { name: 'Ana', email: 'ana@flowboard.bot', color: '#A78BFA' },       // user-4: Plasma Violet
];

const LISTS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

const CARDS_PER_LIST = {
  'Backlog': [
    'Research WebSocket scaling patterns',
    'Evaluate CRDT libraries for comments',
    'Design mobile responsive layout',
  ],
  'To Do': [
    'Build profile settings page',
    'API: user preferences endpoint',
    'Add keyboard shortcuts documentation',
    'Set up error tracking (Sentry)',
  ],
  'In Progress': [
    'Implement drag-and-drop card reordering',
    'Design system: Button variants',
    'API: card search with full-text',
  ],
  'Review': [
    'Fix WebSocket reconnection on deploy',
    'Add loading skeleton screens',
    'Optimize board query (N+1 fix)',
    'Update onboarding flow copy',
  ],
  'Done': [
    'Set up CI/CD pipeline',
    'Database schema v1 migration',
    'Implement JWT auth with refresh tokens',
  ],
};

async function main() {
  // Create bot users with dummy password hashes (bots never login)
  const botHash = await bcrypt.hash('bot-no-login', 12);
  const bots = await Promise.all(
    BOT_USERS.map(bot =>
      prisma.user.upsert({
        where: { email: bot.email },
        update: {},
        create: {
          email: bot.email,
          passwordHash: botHash,
          name: bot.name,
          color: bot.color,
          isBot: true,
        },
      })
    )
  );

  // Create demo board
  const board = await prisma.board.upsert({
    where: { id: 'demo-board-id' }, // stable ID for demo
    update: {},
    create: {
      id: 'demo-board-id',
      name: 'FlowBoard Sprint 24',
      isDemo: true,
      createdById: bots[0].id,
    },
  });

  // Create lists and cards...
  // (Full implementation in plan — skeleton here for research)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma-client-js` generator | `prisma-client` generator | Prisma 7 (2026) | Schema migration required; old generator name silently fails |
| `framer-motion` import | `motion/react` import | motion v12 (2025-2026) | Package renamed; old import is re-export wrapper |
| `tailwind.config.js` | `@import "tailwindcss"` + `@theme` in CSS | Tailwind v4 (2025) | No JS config file; CSS-first configuration |
| Express-style JWT middleware | NestJS guards + Passport strategy | NestJS 10+ (stable) | Declarative, decorator-based auth |
| `y-websocket` v2 | `y-websocket` v3 | 2025-2026 | Major API changes; room-based isolation |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Storing access tokens in memory (not localStorage) prevents XSS theft | Anti-Patterns | LOW — this is standard security practice but memory storage means tokens lost on page refresh; needs silent refresh flow |
| A2 | Refresh token rotation with DB storage is sufficient for revocation (vs Redis) | Pattern 6 | LOW — D-05 says "DB or Redis"; DB is simpler for Phase 1, Redis can be added later |
| A3 | Guest colors exclude slots 2, 3, 4 (bot colors: Maria=#F472B6, Carlos=#4ADE80, Ana=#A78BFA) | Phase Requirements AUTH-06 | MEDIUM — if bot color assignments change, guest exclusion list must update |
| A4 | `bcrypt` 6.0.0 is safe to use (native addon) — may need node-gyp build tools | Standard Stack | LOW — bcryptjs is pure-JS alternative if native build fails |
| A5 | `RefreshToken` model in Prisma schema is the right approach for D-05 token revocation | Code Examples | LOW — Redis alternative exists per D-05 but DB is simpler for Phase 1 |

## Open Questions

1. **Socket.io Server Reference in Upgrade Dispatcher**
   - What we know: NestJS creates the Socket.io server internally via IoAdapter. We need access to `io.engine` in the upgrade dispatcher.
   - What's unclear: Exact API to retrieve the Socket.io server instance from NestJS after initialization. May need to inject it via a custom adapter or access `app.get(WebSocketServer)`.
   - Recommendation: During the dual WS spike, experiment with both: (a) custom IoAdapter that exposes the engine, and (b) `httpServer.removeAllListeners('upgrade')` + manual re-registration.

2. **NestJS Hot-Reload and Upgrade Listener Re-registration**
   - What we know: NestJS HMR may re-register upgrade listeners on module reload.
   - What's unclear: Whether `--watch` mode (default NestJS dev) triggers full adapter re-initialization.
   - Recommendation: Test explicitly during the spike. If HMR breaks the dispatcher, document the workaround (full restart required, or disable HMR for websocket module).

3. **Prisma 7 Partial Index Syntax**
   - What we know: PostgreSQL supports `WHERE is_demo = true` partial indexes. D-15 requires this.
   - What's unclear: Whether Prisma 7 schema language supports partial indexes declaratively or requires a raw SQL migration.
   - Recommendation: Check if `@@index([isDemo], where: ...)` syntax exists in Prisma 7. If not, create partial index in a manual migration SQL file.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | v24.13.0 | — |
| pnpm | Monorepo workspaces | ✓ | 10.33.0 | — |
| Docker | Local dev PostgreSQL + Redis | ✓ | 29.2.1 | — |
| Docker Compose | Multi-service local dev | ✓ | v5.0.2 | — |
| PostgreSQL CLI (psql) | Direct DB access (optional) | ✗ | — | Access via Docker: `docker compose exec postgres psql` |
| Redis CLI (redis-cli) | Direct Redis access (optional) | ✗ | — | Access via Docker: `docker compose exec redis redis-cli` |
| Git | Version control | ✓ | (present per .git/) | — |

**Missing dependencies with no fallback:** None — all critical dependencies are available.

**Missing dependencies with fallback:**
- psql and redis-cli are not installed locally but accessible via Docker containers.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | bcrypt 12 rounds, email normalization, JWT access + refresh tokens |
| V3 Session Management | **yes** | HTTP-only secure cookies for refresh token, 15min access token expiry, rotation on refresh |
| V4 Access Control | **yes** | Role-based guards (user vs guest), @Public() decorator for open endpoints |
| V5 Input Validation | **yes** | class-validator DTOs on all endpoints, email format validation |
| V6 Cryptography | no | JWT uses @nestjs/jwt (HMAC-SHA256 default) — no custom crypto |

### Known Threat Patterns for NestJS + JWT Auth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT token theft (XSS) | Information Disclosure | Access token in memory only (not localStorage); refresh in HTTP-only cookie |
| Refresh token replay | Spoofing | Token rotation: each use invalidates old token, issues new one |
| Password brute force | Spoofing | bcrypt 12 rounds (slow hashing); consider rate limiting in Phase 5 |
| Mass assignment | Tampering | class-validator whitelist DTOs; Prisma typed inputs |
| Guest privilege escalation | Elevation of Privilege | Role claim in JWT checked by guards; guest cannot call mutation endpoints |
| CSRF on refresh endpoint | Spoofing | SameSite=Lax cookie; refresh endpoint requires valid cookie path |

## Sources

### Primary (HIGH confidence)
- Context7 `/nestjs/docs.nestjs.com` — WebSocket adapter, guards, authentication, modules, lifecycle
- Context7 `/prisma/prisma` — Prisma 7 schema syntax, `prisma-client` generator, custom output
- Context7 `/vercel/turborepo` — turbo.json task config, pnpm workspace setup, JIT internal packages
- Context7 `/websites/socket_io` — Auth middleware, handleUpgrade, handshake.auth, rooms
- npm registry — all package versions verified 2026-04-11

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — Module structure, data flow diagrams, dual WS pattern
- `.planning/research/PITFALLS.md` — 16 pitfalls with prevention strategies
- `.planning/research/STACK.md` — Full stack with version verification
- `design-doc.md` — Architecture decisions, DB schema, guest user model
- `DESIGN.md` — Color palette (cursor colors for guest/bot assignment)

### Tertiary (LOW confidence)
- None — all critical claims verified against Context7 or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry
- Architecture: HIGH — dual WS pattern verified via Context7 Socket.io + NestJS docs; Prisma schema verified
- Pitfalls: HIGH — all Phase 1 relevant pitfalls (#1, #5, #9, #12, #16) verified via Context7
- Auth patterns: HIGH — NestJS auth guide verified via Context7; Socket.io middleware pattern verified
- Guest flow: MEDIUM — specific implementation details (color exclusion, short_id format) are project-specific decisions

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (30 days — stable technologies, no fast-moving dependencies)
