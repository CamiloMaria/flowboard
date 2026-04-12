---
phase: 02-board-core
plan: 02
subsystem: api
tags: [nestjs, prisma, rest-api, fractional-indexing, socket.io, websocket, class-validator]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "NestJS scaffold, Prisma schema (Board/List/Card), auth guards, WebSocket gateway scaffold"
  - phase: 02-board-core
    plan: 01
    provides: "Shared composite types (BoardWithLists, ListWithCards), WS event payload types"
provides:
  - "8 REST API endpoints for board/list/card CRUD with fractional indexing"
  - "BoardService with position auto-assignment and rebalancing"
  - "Socket.io room management (board:join, board:leave, disconnect cleanup)"
  - "Event broadcasting for all mutations (list:create/update/delete, card:create/update/delete/move)"
  - "5 DTOs with class-validator decorators"
  - "11 E2E tests covering all CRUD + fractional indexing + rebalancing"
affects: [02-board-core, 03-collaborative-editing, 04-presence, 05-demo-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [board-crud-service, fractional-indexing-rebalance, socket-room-broadcast, controller-gateway-injection]

key-files:
  created:
    - apps/api/src/board/board.module.ts
    - apps/api/src/board/board.controller.ts
    - apps/api/src/board/board.service.ts
    - apps/api/src/board/dto/create-list.dto.ts
    - apps/api/src/board/dto/update-list.dto.ts
    - apps/api/src/board/dto/create-card.dto.ts
    - apps/api/src/board/dto/update-card.dto.ts
    - apps/api/src/board/dto/move-card.dto.ts
    - apps/api/test/board.e2e-spec.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/websocket/board.gateway.ts

key-decisions:
  - "Controller injects BoardGateway directly for broadcasting — no event emitter indirection"
  - "Rebalance uses Promise.all for parallel card position updates within a single list"
  - "Move endpoint returns 200 (not 201) since it's updating not creating"

patterns-established:
  - "Fractional indexing: new items get position = max(existing) + 1000; moves use midpoint"
  - "Position rebalancing: when gap < 0.001, reassign all cards as (index+1)*1000"
  - "Controller broadcasts to board room after every mutation via boardGateway.broadcastToBoard"
  - "E2E test pattern: register user, create board in beforeEach, clean tables in FK order"

requirements-completed: [BORD-02, BORD-03, BORD-04, BORD-05, BORD-06, BORD-07, BORD-08, BORD-09, DND-04, DND-06]

# Metrics
duration: 6min
completed: 2026-04-12
---

# Phase 02 Plan 02: Board CRUD API Summary

**Board/list/card REST API with fractional indexing, position rebalancing, and Socket.io event broadcasting to per-board rooms**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-12T14:06:33Z
- **Completed:** 2026-04-12T14:12:27Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- 8 REST endpoints for board/list/card CRUD with fractional indexing and automatic position assignment
- Position rebalancing triggers when gap between adjacent positions < 0.001, reassigning as (index+1)*1000
- Socket.io board room management (join/leave/disconnect) with event broadcasting after all mutations
- 11 E2E tests passing including fractional indexing midpoint and rebalance scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing E2E tests** — `9a08b8e` (test)
2. **Task 1 (GREEN): Implement BoardModule with CRUD, DTOs, fractional indexing** — `4190da8` (feat)
3. **Task 2: Socket.io room management and event broadcasting** — `acd2e98` (feat)

## Files Created/Modified

- `apps/api/src/board/board.module.ts` — BoardModule importing PrismaModule and WebSocketModule
- `apps/api/src/board/board.controller.ts` — 8 REST endpoints with BoardGateway injection for broadcasting
- `apps/api/src/board/board.service.ts` — Business logic: CRUD, fractional indexing, rebalanceIfNeeded
- `apps/api/src/board/dto/create-list.dto.ts` — name validation (1-100 chars)
- `apps/api/src/board/dto/update-list.dto.ts` — optional name validation
- `apps/api/src/board/dto/create-card.dto.ts` — title, listId (UUID), optional coverColor (hex)
- `apps/api/src/board/dto/update-card.dto.ts` — optional title, descriptionText
- `apps/api/src/board/dto/move-card.dto.ts` — targetListId (UUID), newPosition (number)
- `apps/api/src/app.module.ts` — Added BoardModule to imports
- `apps/api/src/websocket/board.gateway.ts` — Room management (board:join/leave), broadcastToBoard, disconnect cleanup
- `apps/api/test/board.e2e-spec.ts` — 11 E2E tests covering all CRUD + move + rebalance

## Decisions Made

- **Controller-Gateway injection:** BoardController directly injects BoardGateway for broadcasting — simplest pattern, avoids event emitter indirection. Gateway is already exported from WebSocketModule.
- **Move returns 200:** POST move endpoint uses @HttpCode(200) since it updates an existing card rather than creating a new resource.
- **Rebalance with Promise.all:** Position rebalancing updates all cards in parallel. Safe because all updates target different rows within a single list.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 8 REST endpoints ready for frontend consumption via TanStack Query
- Socket.io broadcasting ready for real-time sync on the frontend
- Fractional indexing ready for @dnd-kit drag-and-drop position calculations
- E2E test pattern established for future API testing

## Self-Check: PASSED

All 11 created/modified files verified present. All 3 commit hashes verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
