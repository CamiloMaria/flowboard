---
phase: 02-board-core
plan: 07
subsystem: ui
tags: [socket.io, dnd-kit, tanstack-query, bugfix, broadcast-exclusion, optimistic-updates, drop-target]

# Dependency graph
requires:
  - phase: 02-board-core
    plan: 05
    provides: "DnD with useBoardDnd, BoardCanvas, useMoveCard, ColumnContainer with useDroppable"
  - phase: 02-board-core
    plan: 06
    provides: "useBoardSocket with Socket.io event listeners updating TanStack Query cache"
provides:
  - "Socket.io broadcast exclusion via X-Socket-Id header round-trip (no more card duplication)"
  - "Success-only cache invalidation in all 7 mutations (no crash on move failure)"
  - "Stale-while-revalidate pattern in BoardPage (cached data shown on query error)"
  - "EmptyListPlaceholder with disabled useSortable registering empty lists as valid drop targets"
affects: [03-collaborative-editing, 04-presence, 05-demo-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [x-socket-id-broadcast-exclusion, success-only-invalidation, stale-while-revalidate, empty-list-sortable-placeholder]

key-files:
  created: []
  modified:
    - apps/web/src/lib/socket.ts
    - apps/web/src/lib/api.ts
    - apps/api/src/board/board.controller.ts
    - apps/web/src/hooks/useBoardMutations.ts
    - apps/web/src/pages/BoardPage.tsx
    - apps/web/src/components/board/ColumnContainer.tsx

key-decisions:
  - "X-Socket-Id header on non-GET requests only — GET requests never broadcast"
  - "onSuccess replaces onSettled for all 7 mutations — error state never triggers refetch"
  - "Stale-while-revalidate: BoardPage renders cached board even when query is in error state"
  - "EmptyListPlaceholder uses disabled useSortable to register group without being draggable"

patterns-established:
  - "Broadcast exclusion: client sends X-Socket-Id header → controller extracts → broadcastToBoard excludes originator"
  - "Success-only invalidation: onSuccess (not onSettled) for cache invalidation in optimistic mutations"
  - "Stale-while-revalidate guard: if (isLoading && !board) / if (error && !board) — never wipe cached data on error"
  - "Empty drop target: disabled useSortable placeholder registers @dnd-kit group for lists with 0 items"

requirements-completed: [BORD-03, BORD-04, DND-01, DND-02, DND-03, DND-04, DND-05]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 02 Plan 07: DnD Gap Closure Summary

**Socket.io broadcast exclusion via X-Socket-Id header eliminates cross-list card duplication, success-only cache invalidation prevents page crash on move failure, and disabled useSortable placeholder enables drops into empty lists**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T16:24:17Z
- **Completed:** 2026-04-12T16:28:47Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Eliminated cross-list card duplication by adding X-Socket-Id header round-trip: client sends socket ID on all mutation requests, controller extracts it, and passes to broadcastToBoard to exclude the originator from receiving their own broadcast
- Fixed page crash on move failure by replacing all 7 onSettled callbacks with onSuccess — failed mutations now only revert via onError snapshot without triggering a refetch that could cascade into error state
- Added stale-while-revalidate pattern to BoardPage — cached board data stays visible even when query enters error state, preventing "Failed to load board" screen when cached data exists
- Fixed empty list drop targets by adding EmptyListPlaceholder with disabled useSortable that registers the list's @dnd-kit group even when it has 0 cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix cross-list card duplication via Socket.io broadcast exclusion** — `0b5cc3f` (fix)
2. **Task 2: Fix move failure crash — success-only invalidation + stale-while-revalidate** — `160b026` (fix)
3. **Task 3: Fix empty list drop target with hidden sortable placeholder** — `9d9ff5d` (fix)

## Files Created/Modified

- `apps/web/src/lib/socket.ts` — Added getSocketId() export returning Socket.io client ID
- `apps/web/src/lib/api.ts` — Added X-Socket-Id header to all non-GET requests in apiFetch
- `apps/api/src/board/board.controller.ts` — Added getSocketId() helper, @Req() param to all 7 route handlers, pass excludeSocketId to all broadcastToBoard calls
- `apps/web/src/hooks/useBoardMutations.ts` — Replaced all 7 onSettled with onSuccess for cache invalidation
- `apps/web/src/pages/BoardPage.tsx` — Stale-while-revalidate guard: render cached board on error state
- `apps/web/src/components/board/ColumnContainer.tsx` — Added EmptyListPlaceholder with disabled useSortable for empty list drop targets

## Decisions Made

- **X-Socket-Id on non-GET only:** GET requests never trigger broadcasts, so the header is only needed on mutation methods (POST, PATCH, PUT, DELETE). This avoids unnecessary header overhead on read operations.
- **Success-only invalidation:** Replacing onSettled with onSuccess ensures that on error, the cache stays with the rolled-back optimistic data and no refetch is attempted. This prevents cascading failures where a refetch to an unavailable server would put the entire query into error state.
- **Stale-while-revalidate pattern:** When TanStack Query has cached data but the query is in error state, we render the board normally instead of showing the error screen. Transient server failures become invisible to the user.
- **Disabled useSortable for empty lists:** The placeholder uses `disabled: true` so it can't be dragged but still registers the group with @dnd-kit. The `id: placeholder-${listId}` avoids collision with real card IDs.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 3 UAT gaps from 02-HUMAN-UAT.md are now closed
- Phase 02 (board-core) is fully complete — all 7 plans executed
- Board ready for Phase 03 (collaborative editing): TipTap + Yjs CRDT sync for card descriptions
- Board ready for Phase 04 (presence): cursor broadcasting, online user avatars
- Board ready for Phase 05 (demo mode): bot choreography via server-side mutations

## Self-Check: PASSED

All 6 modified files verified present. All 3 commit hashes (0b5cc3f, 160b026, 9d9ff5d) verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
