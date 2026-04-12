---
phase: 03-real-time-collaboration
plan: 02
subsystem: collab
tags: [yjs, crdt, y-protocols, websocket, persistence, postgresql, bytea]

requires:
  - phase: 01-foundation-auth
    provides: Prisma schema with Card model (descriptionYjs BYTEA, descriptionText), dual WebSocket upgrade dispatcher
provides:
  - CollabModule with Yjs persistence to PostgreSQL BYTEA
  - y-protocols based WebSocket sync (setupWSConnection)
  - Debounced persistence (30s) with SIGTERM flush
  - D-15 plaintext-to-Yjs migration on first connection
  - Plaintext fallback extraction on each persist (D-19)
affects: [03-real-time-collaboration, frontend-tiptap-editor]

tech-stack:
  added: [y-protocols, lib0]
  patterns: [y-protocols direct sync protocol implementation, debounced persistence with SIGTERM flush, UUID validation on docName]

key-files:
  created:
    - apps/api/src/collab/yjs-persistence.ts
    - apps/api/src/collab/yjs-persistence.spec.ts
    - apps/api/src/collab/collab.service.ts
    - apps/api/src/collab/collab.module.ts
  modified:
    - apps/api/src/websocket/yjs.setup.ts
    - apps/api/src/app.module.ts
    - apps/api/src/main.ts
    - apps/api/package.json

key-decisions:
  - "Used y-protocols + lib0 directly instead of @y/websocket-server (requires yjs@14, incompatible with yjs@13.6.x)"
  - "UUID regex validation on cardId from docName for T-03-02 threat mitigation"
  - "In-memory Y.Doc/Awareness cache with cleanup on last-disconnect"

patterns-established:
  - "docName format: card:{uuid} for Yjs document naming"
  - "y-protocols sync protocol: MESSAGE_SYNC=0, MESSAGE_AWARENESS=1"
  - "Module-level Map for debounce timers and dirty doc tracking"

requirements-completed: [COLLAB-01, COLLAB-04, COLLAB-05, COLLAB-06]

duration: 6min
completed: 2026-04-12
---

# Phase 03 Plan 02: Yjs Server Persistence Summary

**CollabModule with y-protocols sync, PostgreSQL BYTEA persistence (last-disconnect + 30s debounce), plaintext fallback, and D-15 migration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-12T18:50:29Z
- **Completed:** 2026-04-12T18:57:03Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 8

## Accomplishments
- Implemented server-side Yjs document sync using y-protocols directly (wire-compatible with y-websocket clients)
- PostgreSQL BYTEA persistence on last-disconnect and 30-second debounced timer
- Plaintext fallback extraction (descriptionText) updated on each persist
- D-15 migration: cards with only descriptionText auto-migrate to Yjs format on first connection
- UUID validation on docName to prevent injection (T-03-02 threat mitigation)
- SIGTERM/SIGINT handlers flush dirty documents before shutdown

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for Yjs persistence** - `0f7f6b0` (test)
2. **Task 1 (GREEN): CollabModule implementation** - `68683f4` (feat)

## Files Created/Modified
- `apps/api/src/collab/yjs-persistence.ts` - Core persistence: bindState, writeState, debounced persistence, flushAllDirtyDocs
- `apps/api/src/collab/yjs-persistence.spec.ts` - 10 tests covering all persistence behaviors
- `apps/api/src/collab/collab.service.ts` - NestJS injectable service exposing PrismaService
- `apps/api/src/collab/collab.module.ts` - NestJS module exporting CollabService
- `apps/api/src/websocket/yjs.setup.ts` - Wired setupWSConnection with y-protocols sync and awareness
- `apps/api/src/app.module.ts` - Added CollabModule import
- `apps/api/src/main.ts` - Pass PrismaService to createYjsWebSocketServer, added SIGTERM handler
- `apps/api/package.json` - Added y-protocols and lib0 direct dependencies

## Decisions Made
- **y-protocols instead of @y/websocket-server:** The plan specified `@y/websocket-server` but it requires `yjs@^14.0.0-7` (prerelease) which is incompatible with our `yjs@^13.6.0` stack. Implemented the same sync protocol directly using `y-protocols` and `lib0`, which is wire-compatible with y-websocket v3 clients.
- **UUID validation on docName:** Added regex validation for T-03-02 threat mitigation — prevents arbitrary strings from being used in Prisma queries.
- **In-memory doc cache with lazy cleanup:** Documents are cached in memory while clients are connected. On last-disconnect, state is persisted and memory is freed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used y-protocols directly instead of @y/websocket-server**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan specified `@y/websocket-server` as the server package, but it requires `yjs@^14.0.0-7` which conflicts with the project's `yjs@^13.6.0`
- **Fix:** Implemented setupWSConnection using `y-protocols/sync` + `y-protocols/awareness` + `lib0/encoding` + `lib0/decoding` directly. This is the same approach y-websocket v2's `utils.js` used internally and produces wire-compatible messages.
- **Files modified:** apps/api/src/websocket/yjs.setup.ts, apps/api/package.json
- **Verification:** TypeScript compiles, all 10 tests pass
- **Committed in:** 68683f4

**2. [Rule 2 - Missing Critical] Added UUID validation on cardId (T-03-02)**
- **Found during:** Task 1 (threat model review)
- **Issue:** Plan's threat model T-03-02 mandates validating cardId from docName before DB queries
- **Fix:** Added UUID regex validation in parseCardId() — invalid docNames are rejected before any Prisma call
- **Files modified:** apps/api/src/collab/yjs-persistence.ts
- **Verification:** Test case "validates cardId format from docName" passes
- **Committed in:** 68683f4

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary — one for dependency compatibility, one for security. No scope creep.

## Issues Encountered
None — plan executed cleanly after resolving the y-websocket-server version incompatibility.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side CRDT infrastructure complete and ready for frontend TipTap editor integration
- y-protocols sync is wire-compatible with standard y-websocket client (`WebsocketProvider`)
- Ready for Phase 03 Plan 03 (presence system) or Plan 04 (frontend TipTap integration)

## Self-Check: PASSED

All 7 key files verified on disk. Both commit hashes (0f7f6b0, 68683f4) found in git log.

---
*Phase: 03-real-time-collaboration*
*Completed: 2026-04-12*
