---
phase: 04-demo-mode-polish
plan: 03
subsystem: api
tags: [choreography, bots, bezier, cursor, crdt, random-behavior]

requires:
  - phase: 04-demo-mode-polish
    provides: DemoService with bot lifecycle (Plan 02)
provides:
  - 60-second scripted choreography with parallel bot actions
  - Quadratic Bezier cursor path generator with ease-in-out
  - Weighted random behavior engine for post-choreography
  - Sleep utility with AbortSignal support
affects: [04-demo-mode-polish]

tech-stack:
  added: []
  patterns: [Quadratic Bezier for cursor arcs, Promise.all for parallel bot execution, AbortSignal-based cancellation]

key-files:
  created:
    - apps/api/src/demo/choreography.ts
    - apps/api/src/demo/cursor-path.ts
    - apps/api/src/demo/random-behavior.ts
    - apps/api/src/demo/choreography.spec.ts
  modified:
    - apps/api/src/demo/demo.service.ts

key-decisions:
  - "Choreography uses Promise.all for parallel bot execution — all 3 bots run simultaneously"
  - "Cursor paths use quadratic Bezier with 15-30% perpendicular offset for natural arcs"
  - "Random phase does NOT open cards for editing per D-04 — only moves and roaming"

patterns-established:
  - "Bot personality weights: normalized Record<action, number> with weightedRandom() selection"
  - "Abortable async loops: sleep() with AbortSignal for graceful cancellation"

requirements-completed: [DEMO-02, DEMO-03]

duration: 7min
completed: 2026-04-13
---

# Phase 04 Plan 03: Bot Choreography Engine Summary

**60-second scripted choreography with Bezier cursor arcs, parallel card moves, CRDT editing climax, and perpetual random weighted behavior**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-13T22:46:00Z
- **Completed:** 2026-04-13T22:53:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Cursor path generator: quadratic Bezier curves with randomized perpendicular offset and ease-in-out timing
- 60-second choreography: Maria moves cards In Progress→Review, Carlos drags To Do→In Progress, Ana moves Backlog→To Do + Review→Done
- CRDT editing climax: Carlos and Maria type simultaneously in the same card (t=30-45s)
- Random behavior engine: 3 bot personalities with weighted actions, 5-10s intervals
- Everything abortable via AbortController propagated from DemoService

## Task Commits

1. **Task 1: Cursor path generator + scripted choreography** - `a3bdfd0` (feat)
2. **Task 2: Random weighted behavior engine + tests** - `ccffc4a` (feat)

## Files Created/Modified
- `apps/api/src/demo/cursor-path.ts` - Bezier path generator + sleep + randomizeDelay utilities
- `apps/api/src/demo/choreography.ts` - 60-second scripted sequence with 3 parallel bots
- `apps/api/src/demo/random-behavior.ts` - Weighted random behavior with bot personalities
- `apps/api/src/demo/choreography.spec.ts` - 8 tests for weights, paths, sleep, intervals
- `apps/api/src/demo/demo.service.ts` - Wired choreography→random behavior pipeline

## Decisions Made
- Promise.all for parallel bot execution — all 3 bots simultaneously
- Quadratic Bezier with 15-30% perpendicular offset for natural cursor arcs
- Random phase excludes card editing per D-04

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Choreography engine complete, wired into DemoService lifecycle
- Ready for end-to-end integration testing (Plan 05)

## Self-Check: PASSED

---
*Phase: 04-demo-mode-polish*
*Completed: 2026-04-13*
