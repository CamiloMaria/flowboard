---
phase: 02-board-core
plan: 01
subsystem: ui
tags: [zustand, tanstack-query, socket.io, dnd-kit, motion, tailwind, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Monorepo scaffold, shared types (Board/List/Card), Socket.io client dep, Tailwind v4 base tokens, API client"
provides:
  - "Composite board types (BoardWithLists, ListWithCards) and WS event payload types"
  - "WsEventMap interface for type-safe Socket.io events"
  - "TanStack Query provider with 30s stale time and devtools"
  - "Zustand UI store (selectedCardId, connectionStatus)"
  - "Socket.io client singleton with JWT auth"
  - "Full DESIGN.md-aligned Tailwind v4 token system (colors, shadows, radii, fonts)"
  - "Frontend dependencies: zustand, @tanstack/react-query, @dnd-kit/react, @dnd-kit/helpers, motion, lucide-react"
affects: [02-board-core, 03-collaborative-editing, 04-presence]

# Tech tracking
tech-stack:
  added: [zustand@5.0.x, "@tanstack/react-query@5.99.x", "@tanstack/react-query-devtools@5.99.x", "@dnd-kit/react@0.3.x", "@dnd-kit/helpers@0.3.x", "motion@12.38.x", lucide-react, vitest]
  patterns: [zustand-ui-store, tanstack-query-provider, socket-singleton, tailwind-v4-theme-tokens]

key-files:
  created:
    - apps/web/src/providers/QueryProvider.tsx
    - apps/web/src/stores/board.store.ts
    - apps/web/src/lib/socket.ts
    - packages/shared/src/__tests__/board.types.test.ts
  modified:
    - packages/shared/src/board.types.ts
    - packages/shared/src/ws-events.types.ts
    - packages/shared/src/index.ts
    - apps/web/src/app.css
    - apps/web/src/App.tsx
    - apps/web/package.json

key-decisions:
  - "Socket.io client uses module-level singleton pattern (not React context) for framework-agnostic access"
  - "Zustand store is pure UI state — server state managed by TanStack Query"
  - "Tailwind tokens aligned to DESIGN.md hex values (surface-primary shifted from #0B0E14 to #0C1017)"

patterns-established:
  - "Zustand store pattern: create<Interface>((set) => ({...})) with explicit action methods"
  - "Socket.io client singleton: connectSocket/disconnectSocket/getSocket functions"
  - "TanStack Query defaults: 30s staleTime, no refetchOnWindowFocus (WS handles sync)"
  - "Tailwind v4 @theme token naming: --color-bg-*, --color-text-*, --color-accent-*, --color-border-*, --shadow-*, --radius-*, --font-*"

requirements-completed: [BORD-01]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 02 Plan 01: Frontend Infrastructure Summary

**Frontend infrastructure with Zustand UI store, TanStack Query provider, Socket.io client singleton, extended shared types (BoardWithLists, WsEventMap), and full DESIGN.md Tailwind v4 token system**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T13:58:32Z
- **Completed:** 2026-04-12T14:03:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Extended shared types with composite BoardWithLists, ListWithCards, and all WS event payload types (CardMovePayload, etc.) plus WsEventMap interface
- Installed all frontend dependencies (zustand, @tanstack/react-query, @dnd-kit/react, @dnd-kit/helpers, motion, lucide-react)
- Created TanStack Query provider wrapping app with 30s stale time, disabled refetchOnWindowFocus, and devtools
- Created Zustand UI store managing selectedCardId and connectionStatus
- Created Socket.io client singleton with JWT auth, reconnection config
- Aligned Tailwind v4 tokens to full DESIGN.md color system including backgrounds, text, accent, borders, shadows, radii, and fonts

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing type tests** — `2434912` (test)
2. **Task 1 (GREEN): Install deps, extend types, align Tailwind tokens** — `cef1d5c` (feat)
3. **Task 2: Create QueryProvider, Zustand store, Socket.io client** — `970a27a` (feat)

## Files Created/Modified

- `packages/shared/src/board.types.ts` — Added BoardWithLists, ListWithCards, CardMovePayload, and all WS event payload interfaces
- `packages/shared/src/ws-events.types.ts` — Added WsEventMap interface mapping event names to typed payloads
- `packages/shared/src/index.ts` — Re-exports all new types
- `packages/shared/src/__tests__/board.types.test.ts` — Type-level tests for composite types and event payloads
- `apps/web/src/providers/QueryProvider.tsx` — TanStack Query provider with getQueryClient helper
- `apps/web/src/stores/board.store.ts` — Zustand UI state store (selectedCardId, connectionStatus)
- `apps/web/src/lib/socket.ts` — Socket.io client singleton with JWT auth
- `apps/web/src/App.tsx` — Wrapped with QueryProvider, updated bg-surface-primary to bg-bg-base
- `apps/web/src/app.css` — Full DESIGN.md-aligned token system (bg, text, accent, borders, shadows, radii, fonts)
- `apps/web/package.json` — Added zustand, @tanstack/react-query, @dnd-kit, motion, lucide-react

## Decisions Made

- **Socket.io client singleton pattern:** Module-level `let socket` instead of React context — allows non-React code (stores, utils) to access the socket without prop drilling
- **Zustand for UI-only state:** connectionStatus and selectedCardId live in Zustand; server state (boards, lists, cards) will be TanStack Query's domain
- **Tailwind hex alignment:** Shifted Phase 1 surface-primary from #0B0E14 to DESIGN.md's #0C1017 (1-2 shade units, visually imperceptible)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All frontend infrastructure is in place for Phase 02 Plans 02-06
- Shared types ready for Board/List/Card REST API implementation
- TanStack Query provider ready for data fetching hooks
- Zustand store ready for UI state management
- Socket.io client ready for real-time event handling
- Tailwind tokens ready for component styling

## Self-Check: PASSED

All 9 created/modified files verified present. All 3 commit hashes verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
