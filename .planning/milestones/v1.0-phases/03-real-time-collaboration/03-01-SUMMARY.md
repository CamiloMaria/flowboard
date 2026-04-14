---
phase: 03-real-time-collaboration
plan: 01
subsystem: types
tags: [typescript, presence, websocket, shared-types]

# Dependency graph
requires:
  - phase: 02-board-crud
    provides: WsEventMap and board types in @flowboard/shared
provides:
  - OnlineUser, CursorPosition, PresenceCursorPayload presence type contracts
  - PresenceJoinPayload, PresenceLeavePayload event payloads
  - CoEditorInfo for card modal co-editor display
  - Fully typed WsEventMap with presence entries
affects: [03-02-backend-presence, 03-03-frontend-presence, 03-04-yjs-collaboration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Presence types as shared contracts before implementation"]

key-files:
  created:
    - packages/shared/src/presence.types.ts
  modified:
    - packages/shared/src/ws-events.types.ts
    - packages/shared/src/index.ts
    - packages/shared/src/__tests__/board.types.test.ts

key-decisions:
  - "CursorPosition includes lastUpdate timestamp for idle detection"
  - "PresenceCursorPayload carries name+color to avoid client-side lookup"

patterns-established:
  - "Types-first pattern: define shared contracts before backend/frontend implementation"

requirements-completed: [PRES-03, PRES-06, COLLAB-03]

# Metrics
duration: 2min
completed: 2026-04-12
---

# Phase 03 Plan 01: Shared Presence & Collaboration Types Summary

**Presence type contracts (OnlineUser, CursorPosition, PresenceCursorPayload, CoEditorInfo) in @flowboard/shared with fully typed WsEventMap**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-12T18:46:02Z
- **Completed:** 2026-04-12T18:48:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created 6 typed presence interfaces (OnlineUser, CursorPosition, PresenceCursorPayload, PresenceJoinPayload, PresenceLeavePayload, CoEditorInfo)
- Wired presence payloads into WsEventMap (12 total event types now fully typed)
- Re-exported all presence types from @flowboard/shared barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Create presence type definitions** - `ed1f9aa` (feat)
2. **Task 2: Update WsEventMap with presence payloads and re-export** - `69d64d5` (feat)

## Files Created/Modified
- `packages/shared/src/presence.types.ts` - 6 interfaces for presence system contracts
- `packages/shared/src/ws-events.types.ts` - Added typed presence:cursor/join/leave entries to WsEventMap
- `packages/shared/src/index.ts` - Re-exports all 6 presence types from barrel
- `packages/shared/src/__tests__/board.types.test.ts` - Updated WsEventMap test with presence entries

## Decisions Made
- CursorPosition includes `lastUpdate` (Date.now() timestamp) for idle detection — enables cursor fading without extra server round-trips
- PresenceCursorPayload carries `name` and `color` alongside coordinates to avoid client-side userId→user lookup on every cursor move event

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing WsEventMap test for new presence entries**
- **Found during:** Task 2 (Update WsEventMap)
- **Issue:** `board.types.test.ts` instantiates a full WsEventMap object — TypeScript required presence entries
- **Fix:** Added presence:cursor, presence:join, presence:leave test data; updated expected count from 9 to 12
- **Files modified:** packages/shared/src/__tests__/board.types.test.ts
- **Verification:** `pnpm exec tsc --noEmit` passes
- **Committed in:** 69d64d5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for type-checking correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 presence types importable from @flowboard/shared
- Plans 02 (backend presence), 03 (frontend presence), and 04 (Yjs collaboration) can now import typed contracts
- Ready for Plan 02

## Self-Check: PASSED

All created files verified on disk. All commit hashes found in git log.

---
*Phase: 03-real-time-collaboration*
*Completed: 2026-04-12*
