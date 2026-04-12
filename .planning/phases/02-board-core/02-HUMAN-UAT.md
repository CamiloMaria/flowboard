---
status: complete
phase: 02-board-core
source: [02-VERIFICATION.md]
started: 2026-04-12T17:10:00.000Z
updated: 2026-04-12T18:05:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Visual board rendering
expected: Dark theme board with 5 columns and 17 cards, colored accent stripes, loading skeleton on first load, connection status indicator
result: pass
note: Required fix — @tailwindcss/vite plugin was missing (commit 8bdbd7b). After fix, dark theme renders correctly.

### 2. Drag-and-drop interaction
expected: Cards drag with ghost overlay (scale+rotate+shadow), drop indicators visible between cards, auto-scroll at container edges, smooth layout animations on drop
result: issue
reported: "Animations and drag-and-drop work. But when dragging a card from one list to another (e.g. In Progress to Review), the card gets duplicated in the target list."
severity: major

### 3. Move failure revert
expected: When backend rejects a card move, card reverts to original position with animation and toast notification appears
result: issue
reported: "Toast appears correctly but card does not snap back to original position. After a second the entire page shows 'Failed to load board' error."
severity: major

### 4. Two-tab real-time sync
expected: Open board in two browser tabs — card moves, creates, edits, and deletes in one tab appear instantly in the other with smooth animation
result: issue
reported: "Real-time sync works across tabs. But cannot drop cards into an empty list — once all cards are dragged out of a list (e.g. To Do), it won't accept drops anymore."
severity: major

### 5. Card detail modal interaction
expected: Click card opens detail modal with editable title, description textarea, delete button. Modal closes on backdrop click or Escape key
result: pass

## Summary

total: 5
passed: 2
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Cross-list card drag-and-drop moves card without duplication"
  status: failed
  reason: "User reported: dragging card from one list to another duplicates the card in the target list. Likely double-insert from optimistic update + Socket.io broadcast hitting the same client."
  severity: major
  test: 2
  artifacts:
    - apps/web/src/hooks/useBoardDnd.ts
    - apps/web/src/hooks/useBoardSocket.ts
    - apps/web/src/hooks/useBoardMutations.ts
  missing: []

- truth: "When backend rejects a card move, card reverts to original position with animation"
  status: failed
  reason: "User reported: toast appears but card does not snap back. After ~1 second the page crashes to 'Failed to load board'. The onError rollback in useMoveCard likely restores a stale snapshot, and TanStack Query refetch fails because the API is down, triggering the error state."
  severity: major
  test: 3
  artifacts:
    - apps/web/src/hooks/useBoardDnd.ts
    - apps/web/src/hooks/useBoardMutations.ts
  missing: []

- truth: "Cards can be dropped into empty lists"
  status: failed
  reason: "User reported: once all cards are dragged out of a list, it becomes impossible to drop cards back into it. The empty list has no drop target. Likely the sortable container or droppable zone collapses to zero height when it has no children, so @dnd-kit can't detect it as a valid drop target."
  severity: major
  test: 4
  artifacts:
    - apps/web/src/components/board/ColumnContainer.tsx
    - apps/web/src/hooks/useBoardDnd.ts
  missing: []
