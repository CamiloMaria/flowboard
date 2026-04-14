---
phase: 01-foundation-auth
plan: 04
subsystem: websocket
tags: [socket.io, y-websocket, yjs, ws, nestjs, websocket, upgrade-handler, dual-websocket]

# Dependency graph
requires:
  - phase: 01-02
    provides: NestJS API scaffold with Prisma, Redis, Docker Compose
provides:
  - Dual WebSocket upgrade dispatcher pattern
  - Socket.io gateway with NestJS @WebSocketGateway
  - y-websocket server with noServer:true
  - Proven coexistence of both transports on same HTTP server
affects: [01-05, 02-board-crud, 03-yjs-collaboration, 04-presence-system]

# Tech tracking
tech-stack:
  added: ["@prisma/adapter-pg (Prisma 7 driver adapter)"]
  patterns: ["Dual WebSocket upgrade dispatcher", "Capture-then-remove listener pattern for Socket.io coexistence"]

key-files:
  created:
    - apps/api/src/websocket/board.gateway.ts
    - apps/api/src/websocket/websocket.module.ts
    - apps/api/src/websocket/yjs.setup.ts
    - apps/api/test/websocket-spike.e2e-spec.ts
    - apps/api/jest.config.ts
  modified:
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/src/prisma/prisma.service.ts
    - apps/api/package.json

key-decisions:
  - "Capture Socket.io upgrade listeners before removeAllListeners, then delegate in dispatcher — avoids needing to access Socket.io engine internals"
  - "Prisma 7 requires @prisma/adapter-pg driver adapter — no more datasourceUrl in constructor"
  - "ws import must use `import * as WebSocket from 'ws'` in CommonJS (ts-jest)"

patterns-established:
  - "Upgrade dispatcher pattern: capture existing listeners → removeAllListeners('upgrade') → single dispatcher routing by pathname → delegate to captured listeners for /socket.io/ and handleUpgrade for /yjs/"
  - "E2E WebSocket tests: NestJS TestingModule + random port + Socket.io client + ws client"

requirements-completed: [FNDN-05, FNDN-06]

# Metrics
duration: 8min
completed: 2026-04-12
---

# Phase 01 Plan 04: Dual WebSocket Spike Summary

**Socket.io and y-websocket coexist on same NestJS HTTP server via capture-then-remove upgrade dispatcher pattern, validated by 4 E2E tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-12T03:09:04Z
- **Completed:** 2026-04-12T03:17:37Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 9

## Accomplishments
- Validated highest-risk architectural element (D-10): dual WebSocket coexistence
- Socket.io gateway handles board-level events via NestJS @WebSocketGateway
- y-websocket server accepts connections on /yjs/ path via ws.WebSocketServer with noServer:true
- Single upgrade dispatcher routes by URL path without conflict
- 4 E2E tests prove: socket.io connect, ping/pong messaging, yjs connect, simultaneous connections

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing E2E tests** - `e3b37f8` (test)
2. **Task 1 (GREEN): Dual WebSocket implementation** - `4a30b90` (feat)

_TDD: RED (failing tests) → GREEN (implementation passes)_

## Files Created/Modified
- `apps/api/src/websocket/board.gateway.ts` - Socket.io gateway with @WebSocketGateway, ping/pong handler
- `apps/api/src/websocket/websocket.module.ts` - NestJS module exporting BoardGateway
- `apps/api/src/websocket/yjs.setup.ts` - y-websocket server creation + dual upgrade dispatcher
- `apps/api/test/websocket-spike.e2e-spec.ts` - 4 E2E tests for dual WebSocket validation
- `apps/api/jest.config.ts` - Jest config with ts-jest, test roots, module name mapper
- `apps/api/src/main.ts` - Wires createYjsWebSocketServer + setupDualWebSocket after init
- `apps/api/src/app.module.ts` - Added WebSocketModule import
- `apps/api/src/prisma/prisma.service.ts` - Fixed for Prisma 7 driver adapter pattern
- `apps/api/package.json` - Added jest, ts-jest, socket.io-client, @prisma/adapter-pg

## Decisions Made
- **Capture-then-delegate pattern:** Instead of accessing Socket.io engine internals (which varies by NestJS version), we capture all existing upgrade listeners before `removeAllListeners('upgrade')`, then delegate to them when the path matches `/socket.io/`. This is more robust than trying to find the Engine.IO instance.
- **Prisma 7 driver adapter:** PrismaClient constructor no longer accepts `datasourceUrl`. Must use `@prisma/adapter-pg` with `PrismaPg({ connectionString })`. This is a breaking change from Prisma 6.
- **ws import pattern:** In CommonJS mode (ts-jest), `ws` must be imported as `import * as WebSocket from 'ws'` (not default import).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client generation path mismatch**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** PrismaService imported from `../generated/prisma` but Prisma 7 generates `client.ts` not `index.ts`
- **Fix:** Changed import to `../generated/prisma/client`
- **Files modified:** apps/api/src/prisma/prisma.service.ts
- **Verification:** TypeScript compiles, test suite runs
- **Committed in:** 4a30b90

**2. [Rule 3 - Blocking] Prisma 7 requires driver adapter**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** PrismaClient constructor no longer accepts `datasourceUrl` option; requires `adapter` (PrismaPg) or `accelerateUrl`
- **Fix:** Installed `@prisma/adapter-pg`, created PrismaPg adapter in PrismaService constructor
- **Files modified:** apps/api/src/prisma/prisma.service.ts, apps/api/package.json
- **Verification:** PrismaService instantiates, connects to DB, tests pass
- **Committed in:** 4a30b90

**3. [Rule 1 - Bug] TypeScript strict mode: WebSocketServer definite assignment**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `server: Server` property in BoardGateway fails TS strict mode (no initializer)
- **Fix:** Added `!` definite assignment assertion: `server!: Server`
- **Files modified:** apps/api/src/websocket/board.gateway.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 4a30b90

**4. [Rule 1 - Bug] ws default import fails in CommonJS**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `import WebSocket from 'ws'` produces `ws_1.default is not a constructor` in CommonJS
- **Fix:** Changed to `import * as WebSocket from 'ws'`
- **Files modified:** apps/api/test/websocket-spike.e2e-spec.ts
- **Verification:** WebSocket constructor works, y-websocket tests pass
- **Committed in:** 4a30b90

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes necessary for correctness. No scope creep. Prisma 7 adapter requirement is a critical discovery for all future phases.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Working Pattern Documentation

**CRITICAL: The exact pattern that works for dual WebSocket coexistence:**

1. NestJS's IoAdapter creates a Socket.io server and attaches an `upgrade` listener during `app.init()`
2. **AFTER** `app.init()` but **BEFORE** `app.listen()`:
   - Capture existing upgrade listeners: `httpServer.listeners('upgrade').slice()`
   - Remove all: `httpServer.removeAllListeners('upgrade')`
   - Install single dispatcher that routes by `request.url`:
     - `/yjs/*` → `yjsWss.handleUpgrade()` + emit `connection`
     - `/socket.io/*` → delegate to captured listeners
     - everything else → `socket.destroy()`
3. The captured listener approach avoids needing to find Socket.io's engine instance, which is buried inside NestJS's adapter internals

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dual WebSocket architecture validated — highest risk (D-10) eliminated
- Ready for Plan 05 (auth module with JWT guards + WebSocket auth middleware)
- Socket.io gateway ready to be extended with board events
- y-websocket server ready for Yjs setupWSConnection in Phase 3

## Self-Check: PASSED

All created files verified on disk. All commit hashes found in git log.

---
*Phase: 01-foundation-auth*
*Completed: 2026-04-12*
