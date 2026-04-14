---
phase: 02-board-core
plan: 05
subsystem: ui
tags: [dnd-kit, react, drag-drop, fractional-indexing, motion, optimistic-updates, auto-scroll]

# Dependency graph
requires:
  - phase: 02-board-core
    plan: 03
    provides: "BoardPage, ColumnContainer, CardItem, useBoard hook, board route"
  - phase: 02-board-core
    plan: 04
    provides: "useBoardMutations with CRUD optimistic mutations, ToastProvider, InlineInput"
provides:
  - "DragDropProvider-wrapped BoardCanvas with @dnd-kit/react 0.3.x cross-list card sorting"
  - "useBoardDnd hook with onDragStart/onDragOver/onDragEnd and fractional position calculation"
  - "CardDragOverlay with scale-1.03, rotate-2deg, shadow-card-drag, opacity-0.95 per D-09"
  - "useMoveCard mutation with optimistic cache update and revert toast on failure"
  - "Board auto-scroll at 60px edge zones with linear acceleration (D-11)"
  - "motion layout animations on cards for smooth reorder/remote-update transitions (D-12)"
affects: [03-collaborative-editing, 04-presence, 05-demo-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [dnd-kit-react-0.3-kanban, drag-overlay-pattern, fractional-indexing-client, auto-scroll-edge-zone, motion-layout-animation]

key-files:
  created:
    - apps/web/src/hooks/useBoardDnd.ts
    - apps/web/src/components/board/BoardCanvas.tsx
    - apps/web/src/components/board/CardDragOverlay.tsx
  modified:
    - apps/web/src/components/board/CardItem.tsx
    - apps/web/src/components/board/ColumnContainer.tsx
    - apps/web/src/hooks/useBoardMutations.ts
    - apps/web/src/pages/BoardPage.tsx

key-decisions:
  - "@dnd-kit/react 0.3.x: useSortable with group prop for cross-list, DragOverlay for ghost card"
  - "Fractional position calc: start=first/2, end=last+1000, between=midpoint"
  - "Auto-scroll uses pointermove listener active only during drag, not RAF loop"
  - "motion.div layout with spring(200,25,0.8) for card reorder animation"
  - "Merged ref callback for dual useSortable + motion ref compatibility"

patterns-established:
  - "useSortable: {id, index, data, type:'item', accept:'item', group: listId} for cross-list cards"
  - "DragOverlay with function children pattern for dynamic ghost card rendering"
  - "useDroppable on ColumnContainer for drag-over accent border detection"
  - "useMoveCard mutation following same optimistic TanStack Query pattern as existing CRUD"
  - "Edge zone auto-scroll: 60px zone, linear speed 0-15px/frame"

requirements-completed: [DND-01, DND-02, DND-03, DND-04, DND-05]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 02 Plan 05: Drag-and-Drop Summary

**@dnd-kit/react 0.3.x cross-list card sorting with fractional indexing, drag overlay ghost card, drop zone indicators, optimistic moves with revert toast, board auto-scroll, and motion layout animations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T14:32:46Z
- **Completed:** 2026-04-12T14:36:50Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created useBoardDnd hook managing drag state, fractional position calculation (start/2, midpoint, end+1000), and snapshot-based cancel revert
- Created BoardCanvas wrapping DragDropProvider with DragOverlay for ghost card rendering
- Created CardDragOverlay with scale-1.03, rotate-2deg, shadow-card-drag, accent border, 0.95 opacity per D-09/UI-SPEC §5
- Updated CardItem to sortable item with useSortable (ref+isDragging), group=listId for cross-list, dashed placeholder on drag
- Updated ColumnContainer with useDroppable for accent border highlight during drag-over (D-10)
- Added useMoveCard mutation with optimistic cache update (move card between lists in cache) and revert + toast on error
- Added 60px edge zone auto-scroll with pointermove listener during active drag (D-11)
- Wrapped CardItem in motion.div with layout animation spring(200, 25, 0.8) for smooth card reordering (D-12)
- Wired BoardCanvas into BoardPage replacing inline column rendering

## Task Commits

Each task was committed atomically:

1. **Task 1: DnD core — useBoardDnd, BoardCanvas, CardDragOverlay, sortable CardItem, droppable ColumnContainer, useMoveCard** — `fa5aad5` (feat)
2. **Task 2: Auto-scroll, BoardPage integration, motion layout animations** — `e467115` (feat)

## Files Created/Modified

- `apps/web/src/hooks/useBoardDnd.ts` — DnD state management with onDragStart/onDragOver/onDragEnd, fractional position calc, snapshot revert
- `apps/web/src/components/board/BoardCanvas.tsx` — DragDropProvider wrapper with auto-scroll and DragOverlay
- `apps/web/src/components/board/CardDragOverlay.tsx` — Ghost card overlay with scale, rotation, elevated shadow per D-09
- `apps/web/src/components/board/CardItem.tsx` — useSortable integration with isDragging placeholder, motion.div layout animation
- `apps/web/src/components/board/ColumnContainer.tsx` — useDroppable with accent border for drag-over state
- `apps/web/src/hooks/useBoardMutations.ts` — Added useMoveCard with optimistic cache move and error revert toast
- `apps/web/src/pages/BoardPage.tsx` — Replaced inline column rendering with BoardCanvas component

## Decisions Made

- **@dnd-kit/react 0.3.x API:** Used new API (DragDropProvider, useSortable with ref, DragOverlay) — not the legacy @dnd-kit/core API. group prop enables cross-list card sorting.
- **Fractional position calculation:** Client-side: position = first/2 (start), midpoint (between), last+1000 (end), 1000 (empty). Matches server rebalance threshold.
- **Auto-scroll via pointermove (not RAF loop):** Simpler implementation — pointermove fires frequently enough during drag for smooth scrolling. Cleanup on drag end via useEffect dependency on activeCard.
- **Merged ref callback:** useSortable returns a ref and motion.div needs a ref — used callback ref pattern to assign to both, avoiding React ref collision.
- **motion.div layout animation:** spring(stiffness:200, damping:25, mass:0.8) per D-12/UI-SPEC for smooth card reorder transitions — applies to both local DnD and future remote Socket.io updates.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Full DnD working: within-list reorder, cross-list move, ghost overlay, drop indicators, auto-scroll
- motion layout animations ready for remote update animations in Plan 06 (Socket.io sync)
- useMoveCard mutation integrates with existing TanStack Query optimistic pattern
- Card position sync via onSettled invalidateQueries ensures server consistency after moves

## Self-Check: PASSED

All 7 created/modified files verified present. Both commit hashes (fa5aad5, e467115) verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
