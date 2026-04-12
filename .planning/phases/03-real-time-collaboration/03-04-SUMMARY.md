---
phase: 03-real-time-collaboration
plan: 04
subsystem: presence
tags: [redis, socket.io, zustand, cursor, presence, motion, animation]

requires:
  - phase: 03-01
    provides: shared presence types (OnlineUser, CursorPosition, PresenceCursorPayload, etc.)
provides:
  - "PresenceService — Redis-backed online user tracking (HSET/HDEL/HGETALL + TTL)"
  - "Cursor broadcasting via Socket.io presence:cursor events (50ms throttle)"
  - "CursorOverlay + RemoteCursor — Figma-style remote cursors with glow + idle breathe"
  - "OnlineUsers — avatar strip in board header with spring join/leave animations"
  - "usePresence hook — emits cursor position + heartbeat"
affects: [demo-mode, polish]

tech-stack:
  added: []
  patterns:
    - "Zustand store for ephemeral high-frequency presence state (separate from board.store)"
    - "Redis HSET/HGETALL for per-board online user tracking with 10s TTL heartbeat"
    - "Socket.io event pattern: presence:join/leave/cursor/heartbeat/users"
    - "50ms client-side throttle for cursor emissions"
    - "CSS custom properties (--cursor-color) for dynamic cursor glow in animations"

key-files:
  created:
    - apps/api/src/presence/presence.service.ts
    - apps/api/src/presence/presence.module.ts
    - apps/api/src/presence/presence.service.spec.ts
    - apps/web/src/stores/presence.store.ts
    - apps/web/src/hooks/usePresence.ts
    - apps/web/src/components/presence/CursorOverlay.tsx
    - apps/web/src/components/presence/RemoteCursor.tsx
    - apps/web/src/components/presence/OnlineUsers.tsx
  modified:
    - apps/api/src/websocket/board.gateway.ts
    - apps/api/src/websocket/websocket.module.ts
    - apps/api/src/app.module.ts
    - apps/web/src/hooks/useBoardSocket.ts
    - apps/web/src/components/board/BoardHeader.tsx
    - apps/web/src/components/board/BoardCanvas.tsx
    - apps/web/src/app.css

key-decisions:
  - "User identity extracted from socket.data.user (set by JWT middleware), not from client payload — prevents spoofing (T-03-08)"
  - "Separate Zustand store for presence state — ephemeral high-frequency data shouldn't live with board UI state"
  - "CSS custom property --cursor-color for keyframe animation instead of inline style — needed for @keyframes var() support"

patterns-established:
  - "Presence event naming: presence:{action} (join, leave, cursor, heartbeat, users)"
  - "Socket.io handlers store user reference on socket as (client as any).user for disconnect cleanup"
  - "50ms timestamp-based throttle for cursor emissions (simpler than requestAnimationFrame)"

requirements-completed: [PRES-01, PRES-02, PRES-03, PRES-04, PRES-05, PRES-06]

duration: 7min
completed: 2026-04-12
---

# Phase 03 Plan 04: Presence System Summary

**Redis-backed presence tracking with Figma-style remote cursors (glow + idle breathe) and animated online user avatars in board header**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-12T19:10:13Z
- **Completed:** 2026-04-12T19:17:22Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- PresenceService with Redis HSET/HDEL/HGETALL for per-board online tracking with 10s TTL heartbeat
- BoardGateway presence handlers: cursor broadcast, join/leave events, heartbeat refresh
- Full TDD coverage for PresenceService (5 tests, all passing)
- Remote cursor rendering with 16×20 SVG arrow, glow drop-shadow, and idle breathe animation after 3s
- Online user avatars in board header with spring join/leave animations and +N overflow pill
- usePresence hook emitting cursor positions throttled at 50ms + 5s heartbeat interval
- Cursor ghost-fade on user leave via AnimatePresence exit animation
- Reduced motion support: no breathe, no scale animation, instant appear/disappear

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend PresenceModule (TDD)**
   - `4db4412` (test): add failing tests for PresenceService Redis operations
   - `9a467c7` (feat): implement PresenceModule with Redis heartbeats and cursor broadcast
2. **Task 2: Frontend presence** - `5cd9090` (feat): frontend cursors, online users, and presence store

## Files Created/Modified
- `apps/api/src/presence/presence.service.ts` - Redis-backed presence tracking (setOnline, setOffline, getOnlineUsers, refreshHeartbeat)
- `apps/api/src/presence/presence.module.ts` - NestJS module exporting PresenceService
- `apps/api/src/presence/presence.service.spec.ts` - TDD unit tests (5 tests)
- `apps/api/src/websocket/board.gateway.ts` - Added presence:cursor, presence:heartbeat handlers + join/leave integration
- `apps/api/src/websocket/websocket.module.ts` - Imports PresenceModule for DI
- `apps/api/src/app.module.ts` - Imports PresenceModule
- `apps/web/src/stores/presence.store.ts` - Zustand store for ephemeral presence state (onlineUsers + cursorPositions)
- `apps/web/src/hooks/usePresence.ts` - Emits cursor position (50ms throttle) + heartbeat (5s interval)
- `apps/web/src/hooks/useBoardSocket.ts` - Added presence event handlers (users/join/leave/cursor)
- `apps/web/src/components/presence/CursorOverlay.tsx` - Board-level cursor rendering layer (absolute, inset-0, pointer-events-none)
- `apps/web/src/components/presence/RemoteCursor.tsx` - Single cursor with arrow SVG, name pill, glow, breathe animation
- `apps/web/src/components/presence/OnlineUsers.tsx` - Avatar strip (max 5 + overflow pill) with spring animations
- `apps/web/src/components/board/BoardHeader.tsx` - Renders OnlineUsers left of ConnectionStatus
- `apps/web/src/components/board/BoardCanvas.tsx` - Renders CursorOverlay + wires usePresence hook
- `apps/web/src/app.css` - cursor-breathe keyframes + reduced-motion media query

## Decisions Made
- User identity extracted from socket.data.user (JWT middleware), not client payload — prevents spoofing (T-03-08)
- Separate Zustand store for presence — ephemeral high-frequency data isolated from board UI state
- CSS custom property --cursor-color for keyframe animation — @keyframes can reference var()
- Timestamp-based 50ms throttle simpler than requestAnimationFrame for cursor emissions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Threat Flags

No new threat surfaces introduced beyond what the plan's threat model covers.

## Next Phase Readiness
- Presence system complete, ready for Plan 05 (drag-and-drop sync) or demo mode integration
- PresenceService can be injected by demo bot service for simulated presence

## Self-Check: PASSED

All 8 created files verified on disk. All 3 commits verified in git log.

---
*Phase: 03-real-time-collaboration*
*Completed: 2026-04-12*
