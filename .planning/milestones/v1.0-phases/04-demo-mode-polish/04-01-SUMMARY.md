---
phase: 04-demo-mode-polish
plan: 01
subsystem: ui
tags: [motion, animation, spring-physics, cursor, stagger, dnd-kit]

requires:
  - phase: 02-board-ui
    provides: CardItem, CardDragOverlay, RemoteCursor, ColumnContainer, CursorOverlay components
provides:
  - Velocity-based drag rotation with spring(1,80,12) on CardDragOverlay
  - Cursor ghost trace glow effect (600ms) via CursorGhostTrace component
  - Column card cascade stagger at 30ms per card offset
  - Card create/archive fade+scale animations
  - Modal spring open + ease-in close animations
affects: [04-demo-mode-polish]

tech-stack:
  added: []
  patterns: [motion.div animate+exit for two-phase animations, pointer velocity tracking via exponential decay]

key-files:
  created:
    - apps/web/src/components/presence/CursorGhostTrace.tsx
  modified:
    - apps/web/src/components/board/CardDragOverlay.tsx
    - apps/web/src/components/board/CardDetailModal.tsx
    - apps/web/src/components/board/BoardCanvas.tsx
    - apps/web/src/components/board/CardItem.tsx
    - apps/web/src/components/board/ColumnContainer.tsx
    - apps/web/src/components/presence/CursorOverlay.tsx

key-decisions:
  - "Pointer velocity tracked via exponential decay smoothing (0.7/0.3 blend) since @dnd-kit 0.3.x does not expose velocity on drag events"
  - "Ghost traces managed at CursorOverlay level via departure detection, not inside RemoteCursor — cleaner separation"
  - "Removed redundant motion.div wrapper in ColumnContainer — CardItem already has motion.div with layout"

patterns-established:
  - "Velocity tracking: useRef + pointermove listener with exponential smoothing for physics-based UI feedback"
  - "Ghost trace pattern: AnimatePresence exit triggers separate glow component via parent state tracking"

requirements-completed: [PLSH-01, PLSH-02, PLSH-03, PLSH-04]

duration: 6min
completed: 2026-04-13
---

# Phase 04 Plan 01: Animation Refinements Summary

**Velocity-based card drag rotation, cursor ghost traces, and column cascade stagger — premium animations for the bot choreography demo**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-13T22:32:04Z
- **Completed:** 2026-04-13T22:38:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Card drag overlay tilts +/-2deg based on horizontal pointer velocity with spring(1,80,12) physics
- Cursor ghost trace: 14px glow dot lingers 600ms after remote cursor exits, with fade-out animation
- Column card cascade: sibling cards stagger their layout shift at 30ms per card index
- Card create/archive: fade+scale(0.95) enter/exit animations (250ms/300ms)
- Modal: spring open (stiffness:300, damping:25, mass:0.8), ease-in close (0.2s)
- All animations respect `useReducedMotion`

## Task Commits

Each task was committed atomically:

1. **Task 1: Card drag rotation + modal spring animations** - `089cfc5` (feat)
2. **Task 2: Cursor ghost trace + column cascade stagger** - `3d2a6e3` (feat)

## Files Created/Modified
- `apps/web/src/components/presence/CursorGhostTrace.tsx` - Ghost trace glow dot component
- `apps/web/src/components/board/CardDragOverlay.tsx` - Velocity-based rotation with spring physics
- `apps/web/src/components/board/CardDetailModal.tsx` - Spring open + ease-in close transitions
- `apps/web/src/components/board/BoardCanvas.tsx` - Pointer velocity tracking, velocity prop wiring
- `apps/web/src/components/board/CardItem.tsx` - staggerIndex prop, create/archive animations
- `apps/web/src/components/board/ColumnContainer.tsx` - staggerIndex pass-through, AnimatePresence wrapping
- `apps/web/src/components/presence/CursorOverlay.tsx` - Ghost trace state management

## Decisions Made
- Pointer velocity tracked via exponential decay smoothing since @dnd-kit 0.3.x does not expose velocity on drag events
- Ghost traces managed at CursorOverlay level via departure detection, not inside RemoteCursor
- Removed redundant motion.div wrapper in ColumnContainer — CardItem already has motion.div with layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @dnd-kit 0.3.x has no velocity API**
- **Found during:** Task 1 (CardDragOverlay velocity wiring)
- **Issue:** Plan referenced `event.operation.velocity?.x` but @dnd-kit/react 0.3.x types don't expose velocity
- **Fix:** Implemented pointer velocity tracking via pointermove listener with exponential decay smoothing in BoardCanvas
- **Files modified:** apps/web/src/components/board/BoardCanvas.tsx
- **Verification:** TypeScript compiles, velocity ref properly passed to CardDragOverlay
- **Committed in:** 089cfc5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary workaround for missing API. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Animation foundation complete for bot choreography demo
- Ghost traces will activate when bots disconnect (Plan 02-03 wiring)
- Cascade stagger activates automatically when bots move cards

---
*Phase: 04-demo-mode-polish*
*Completed: 2026-04-13*
