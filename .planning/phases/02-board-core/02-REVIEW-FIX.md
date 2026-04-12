---
phase: 02-board-core
fixed_at: 2026-04-12T15:12:00Z
review_path: .planning/phases/02-board-core/02-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-12T15:12:00Z
**Source review:** .planning/phases/02-board-core/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11
- Fixed: 11
- Skipped: 0

## Fixed Issues

### CR-01: `card:move` broadcast missing `fromListId` — frontend type contract broken

**Files modified:** `apps/api/src/board/board.controller.ts`, `apps/api/src/board/board.service.ts`
**Commit:** 9dcddd9
**Applied fix:** Added `getCardById` method to `BoardService`. In `moveCard` controller, fetch the card before moving to capture `fromListId`, then include it in the broadcast payload to satisfy the `CardMovePayload` type contract.

### CR-02: `moveCard` service returns potentially null value

**Files modified:** `apps/api/src/board/board.service.ts`
**Commit:** 4fe7bab
**Applied fix:** Changed `moveCard` to conditionally re-fetch only if rebalance occurred (with null guard + `NotFoundException`). When no rebalance happens, returns a spread of the original card with updated fields — avoids unnecessary query and eliminates null return.

### WR-01: Socket.io `connectSocket` doesn't reset stale socket — can return disconnected instance

**Files modified:** `apps/web/src/lib/socket.ts`
**Commit:** ed7f78b
**Applied fix:** Added cleanup block before creating a new socket: if an existing socket is non-null but disconnected, explicitly disconnect and null it before creating a fresh instance. Prevents ghost event listeners from leaked socket instances.

### WR-02: `CardDetailModal` description state goes stale when card data updates via WebSocket

**Files modified:** `apps/web/src/components/board/CardDetailModal.tsx`
**Commit:** c860746
**Applied fix:** Added `useEffect` that syncs local `description` state with `card.descriptionText` when the card prop changes (via remote WebSocket updates). Implements "last writer wins" UX until Phase 3 CRDT-based editing replaces this.

### WR-03: `updateList` doesn't verify list belongs to the specified board

**Files modified:** `apps/api/src/board/board.service.ts`, `apps/api/src/board/board.controller.ts`
**Commit:** b444076
**Applied fix:** Updated `updateList` and `deleteList` service methods to accept `boardId` parameter and verify `list.boardId === boardId` before proceeding. Updated controller calls to pass `boardId`. Prevents cross-board list manipulation and ensures gateway broadcasts target the correct board room.

### WR-04: `rebalanceIfNeeded` uses `Promise.all` for dependent writes — potential race condition

**Files modified:** `apps/api/src/board/board.service.ts`
**Commit:** c9664f8
**Applied fix:** Replaced `Promise.all(updates)` with `this.prisma.$transaction(...)` to execute all position updates atomically. Prevents inconsistent card positions from concurrent moves to the same list during rebalance.

### WR-05: `useBoardSocket` calls `disconnectSocket()` on cleanup — kills socket for other potential consumers

**Files modified:** `apps/web/src/hooks/useBoardSocket.ts`
**Commit:** 3c94560
**Applied fix:** Removed `disconnectSocket()` call from cleanup function. Socket now persists across board navigations — cleanup only leaves the room and removes event listeners. Removed unused `disconnectSocket` import. Eliminates brief disconnection flash when navigating between boards.

### WR-06: `updateCard` DTO spread leaks `id` field into Prisma update

**Files modified:** `apps/api/src/board/board.service.ts`
**Commit:** b84b4d9
**Applied fix:** Replaced `data: { ...dto }` spread pattern with explicit field picking in both `updateCard` (picks `title`, `descriptionText`) and `updateList` (picks `name`). Prevents future DTO field additions from accidentally propagating to Prisma.

### IN-01: `CardDetailModal` wraps content in redundant `AnimatePresence`

**Files modified:** `apps/web/src/components/board/CardDetailModal.tsx`
**Commit:** 1ed6f09
**Applied fix:** Removed inner `<AnimatePresence>` wrapper from CardDetailModal — the outer `<AnimatePresence>` in `BoardPage.tsx` already controls mount/unmount animations. Removed unused `AnimatePresence` import.

### IN-02: `board.lists.sort()` called in multiple places without memoization

**Files modified:** `apps/web/src/components/board/BoardCanvas.tsx`, `apps/web/src/components/board/ColumnContainer.tsx`
**Commit:** 4bbbced
**Applied fix:** Wrapped list sorting in `BoardCanvas` and card sorting in `ColumnContainer` with `useMemo` to avoid re-sorting on every render. Uses spread-then-sort pattern to avoid array mutation.

### IN-03: `AddListGhost` shows redundant "+" in button text

**Files modified:** `apps/web/src/components/board/AddListGhost.tsx`
**Commit:** 72dfd42
**Applied fix:** Changed button text from `"+ Add List"` to `"Add List"` since the Lucide `<Plus>` icon already provides the visual "+" cue.

### IN-04: `ConnectionStatus` shows "Disconnected" on initial page load

**Files modified:** `apps/web/src/stores/board.store.ts`, `apps/web/src/components/board/ConnectionStatus.tsx`
**Commit:** bbcb849
**Applied fix:** Added `'connecting'` to `ConnectionStatus` union type. Changed initial store state from `'disconnected'` to `'connecting'`. Added `connecting` entry to `ConnectionStatus` component config with yellow indicator and "Connecting..." label. Eliminates jarring red "Disconnected" flash on page load.

---

_Fixed: 2026-04-12T15:12:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
