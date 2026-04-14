---
phase: 04-demo-mode-polish
plan: 02
subsystem: api
tags: [nestjs, demo, bots, presence, guards, lifecycle]

requires:
  - phase: 01-foundation-auth
    provides: Guest JWT with role='guest', bot seed data, demo board
  - phase: 03-real-time-collaboration
    provides: PresenceService, BoardGateway, Socket.io presence events
provides:
  - DemoModule with DemoService for bot lifecycle management
  - Bot identity resolution from database (Maria, Carlos, Ana)
  - Guest read-only guard on all mutation endpoints
  - AbortController for choreography cancellation
  - Presence injection for bots (appear as real users)
affects: [04-demo-mode-polish]

tech-stack:
  added: []
  patterns: [forwardRef for NestJS circular dependency (WebSocketModule <-> DemoModule), OnModuleInit for DB-resolved identities]

key-files:
  created:
    - apps/api/src/demo/demo.module.ts
    - apps/api/src/demo/demo.service.ts
    - apps/api/src/demo/demo.service.spec.ts
    - apps/api/src/demo/bot-user.interface.ts
  modified:
    - apps/api/src/websocket/board.gateway.ts
    - apps/api/src/websocket/websocket.module.ts
    - apps/api/src/board/board.controller.ts
    - apps/api/src/app.module.ts
    - packages/shared/src/presence.types.ts

key-decisions:
  - "Bot UUIDs resolved at runtime via OnModuleInit (seed uses dynamic UUIDs, not stable ones)"
  - "forwardRef() on both DemoModule and WebSocketModule to handle circular dependency"
  - "OnlineUser.role extended to include 'bot' in shared types"
  - "Grace period set to 45 seconds (middle of 30-60 range per D-07)"

patterns-established:
  - "assertNotGuestOnDemo pattern: private guard method called at top of each mutation"
  - "Bot lifecycle: startBots/stopBots with idempotent guards and AbortController"

requirements-completed: [DEMO-01, DEMO-04, DEMO-05, DEMO-06]

duration: 8min
completed: 2026-04-13
---

# Phase 04 Plan 02: DemoModule Backend Summary

**NestJS DemoModule with 3-bot lifecycle (start on guest join, 45s grace period), guest read-only guards on all mutations, and AbortController for choreography**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T22:38:00Z
- **Completed:** 2026-04-13T22:46:00Z
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments
- DemoService with full bot lifecycle: start on first guest, grace period on last guest leave, clean stop
- 3 bots (Maria, Carlos, Ana) register in presence system as real users with 'bot' role
- All 7 mutation endpoints (createList, updateList, deleteList, createCard, updateCard, deleteCard, moveCard) reject guest role on demo board with 403 ForbiddenException
- AbortController exposed for choreography engine cancellation
- 7 tests covering: start, idempotent start, grace period stop, grace cancel on rejoin, clean stop, non-demo ignore, abort signal

## Task Commits

Each task was committed atomically:

1. **Task 1: DemoModule with bot identity, lifecycle, and guest guards** - `f3ac6eb` (feat)

## Files Created/Modified
- `apps/api/src/demo/demo.module.ts` - NestJS module for demo functionality
- `apps/api/src/demo/demo.service.ts` - Bot lifecycle management service (208 lines)
- `apps/api/src/demo/demo.service.spec.ts` - 7 tests for lifecycle states
- `apps/api/src/demo/bot-user.interface.ts` - BotUser type, constants
- `apps/api/src/websocket/board.gateway.ts` - DemoService injection, guest join/leave notifications
- `apps/api/src/websocket/websocket.module.ts` - forwardRef DemoModule import
- `apps/api/src/board/board.controller.ts` - assertNotGuestOnDemo guard on all mutations
- `apps/api/src/app.module.ts` - DemoModule registration
- `packages/shared/src/presence.types.ts` - OnlineUser.role extended with 'bot'

## Decisions Made
- Bot UUIDs resolved at runtime via OnModuleInit — seed.ts uses upsert with dynamic UUIDs, not hardcoded ones
- forwardRef() on both sides to handle WebSocketModule <-> DemoModule circular dependency
- Grace period set to 45 seconds (middle of D-07 range)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inject decorator from wrong module**
- **Found during:** Task 1 (BoardGateway DemoService injection)
- **Issue:** Initially imported `Inject` from `@nestjs/websockets` instead of `@nestjs/common`
- **Fix:** Moved import to `@nestjs/common`
- **Files modified:** apps/api/src/websocket/board.gateway.ts
- **Committed in:** f3ac6eb

**2. [Rule 2 - Critical] OnlineUser type missing 'bot' role**
- **Found during:** Task 1 (Bot presence registration)
- **Issue:** Shared OnlineUser type only allowed 'user' | 'guest', bots need 'bot' role
- **Fix:** Extended union type to include 'bot'
- **Files modified:** packages/shared/src/presence.types.ts
- **Committed in:** f3ac6eb

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 critical)
**Impact on plan:** Both fixes necessary for type safety and correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DemoModule ready for choreography engine (Plan 03)
- AbortController wired and tested
- Bot identity and presence system operational

## Self-Check: PASSED

---
*Phase: 04-demo-mode-polish*
*Completed: 2026-04-13*
