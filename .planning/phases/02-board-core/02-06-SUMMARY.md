---
phase: 02-board-core
plan: 06
subsystem: ui
tags: [socket.io, react, tanstack-query, zustand, motion, animate-presence, real-time, websocket]

# Dependency graph
requires:
  - phase: 02-board-core
    plan: 01
    provides: "TanStack Query provider (getQueryClient), Zustand UI store (connectionStatus, setConnectionStatus), Socket.io client singleton (connectSocket/disconnectSocket), shared types (BoardWithLists, WsEventMap payloads)"
  - phase: 02-board-core
    plan: 03
    provides: "BoardPage, ColumnContainer, CardItem, useBoard hook, ConnectionStatus indicator"
  - phase: 02-board-core
    plan: 04
    provides: "useBoardMutations, CardDetailModal, Toast system, InlineInput"
  - phase: 02-board-core
    plan: 05
    provides: "BoardCanvas with DragDropProvider, useBoardDnd, CardDragOverlay, motion.div layout animation on cards"
provides:
  - "useBoardSocket hook: Socket.io board room lifecycle with 7 event listeners updating TanStack Query cache directly"
  - "Real-time sync: card:move/create/update/delete and list:create/update/delete events reflected in all connected tabs"
  - "Connection status: Zustand store updates on connect/disconnect/reconnect with Manager-level event handling"
  - "AnimatePresence on cards: fade in/out + scale for remote card create/delete with popLayout mode"
  - "AnimatePresence on columns: slide from right for list create, fade + scale out for list delete"
  - "useReducedMotion hook: respects prefers-reduced-motion, disables springs when active"
  - "Reconnect resilience: re-joins board room and invalidates query cache on reconnection"
affects: [03-collaborative-editing, 04-presence, 05-demo-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [socket-event-to-cache-update, manager-level-reconnect, animate-presence-pop-layout, reduced-motion-hook]

key-files:
  created:
    - apps/web/src/hooks/useBoardSocket.ts
    - apps/web/src/hooks/useReducedMotion.ts
  modified:
    - apps/web/src/pages/BoardPage.tsx
    - apps/web/src/components/board/BoardCanvas.tsx
    - apps/web/src/components/board/ColumnContainer.tsx

key-decisions:
  - "Socket.io Manager-level events (socket.io.on) for reconnect_attempt/reconnect — socket instance only fires connect/disconnect"
  - "AnimatePresence mode='popLayout' for cards — allows exit animations without layout shift"
  - "useReducedMotion hook: duration:0 replaces spring config when prefers-reduced-motion active"

patterns-established:
  - "Socket event → setQueryData pattern: each event handler maps payload to TanStack Query cache update via getQueryClient().setQueryData"
  - "Board room lifecycle: connect → board:join → events → board:leave → disconnectSocket in useEffect cleanup"
  - "Reconnect strategy: re-join room + invalidateQueries to catch any events missed during disconnection"
  - "Reduced motion: useReducedMotion() returns boolean, components swap transition config based on result"

requirements-completed: [DND-06, BORD-09]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 02 Plan 06: Real-Time Socket Sync Summary

**Socket.io board room connection with 7 event handlers updating TanStack Query cache directly, AnimatePresence animations for remote card/list mutations, and useReducedMotion accessibility hook**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T14:40:09Z
- **Completed:** 2026-04-12T14:43:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created useBoardSocket hook managing full Socket.io lifecycle: connect → join room → handle 7 event types → leave room → disconnect on unmount
- All remote board mutations (card move/create/update/delete, list create/update/delete) update TanStack Query cache directly via setQueryData (D-13) — no server refetch
- Connection status indicator updates on connect/disconnect/reconnect via Zustand store (D-16)
- Remote card creates fade in with scale(0.95→1), deletes fade out — via AnimatePresence mode="popLayout"
- Remote list creates slide from right (x:50→0), deletes fade + scale out — via AnimatePresence
- useReducedMotion hook disables spring physics when prefers-reduced-motion active, keeping functional opacity animations

## Task Commits

Each task was committed atomically:

1. **Task 1: useBoardSocket hook with event listeners and cache updates** — `f63fce7` (feat)
2. **Task 2: Wire useBoardSocket into BoardPage and add remote update animations** — `d524921` (feat)

## Files Created/Modified

- `apps/web/src/hooks/useBoardSocket.ts` — Socket.io board room lifecycle hook with 7 event listeners updating TanStack Query cache
- `apps/web/src/hooks/useReducedMotion.ts` — Accessibility hook for prefers-reduced-motion media query
- `apps/web/src/pages/BoardPage.tsx` — Wired useBoardSocket(boardId) for socket connection on mount
- `apps/web/src/components/board/BoardCanvas.tsx` — Added AnimatePresence + motion.div on columns for list create/delete animations
- `apps/web/src/components/board/ColumnContainer.tsx` — Added AnimatePresence mode="popLayout" + motion.div on cards for create/delete animations

## Decisions Made

- **Manager-level reconnect events:** Socket.io v4.8 fires `reconnect_attempt` and `reconnect` on `socket.io` (the Manager), not on the socket instance. Used `socket.io.on(...)` for these events, `socket.on(...)` for `connect`/`disconnect`.
- **AnimatePresence mode="popLayout" for cards:** Allows cards to animate out while new cards animate in without layout jumps. More natural for Kanban card flow than default "sync" mode.
- **useReducedMotion replaces spring config with duration:0:** Preserves AnimatePresence exit/enter behavior (functional opacity changes) while eliminating spring physics and stagger effects for accessibility.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 02 (board-core) is now complete — all 6 plans executed
- Full real-time sync working: all board mutations in one tab appear instantly in all other connected tabs
- Remote card moves animate with spring physics via motion layout animation (D-12)
- Connection status indicator shows live state (connected/reconnecting/disconnected) via D-16
- Board ready for Phase 03 (collaborative editing): TipTap editor swap in CardDetailModal, Yjs CRDT sync
- Board ready for Phase 04 (presence): cursor broadcasting, online user avatars
- Board ready for Phase 05 (demo mode): bot choreography via server-side board mutations broadcasting to connected clients

## Self-Check: PASSED

All 5 created/modified files verified present. Both commit hashes (f63fce7, d524921) verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
