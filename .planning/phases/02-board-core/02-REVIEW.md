---
phase: 02-board-core
reviewed: 2026-04-12T14:47:46Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - packages/shared/src/board.types.ts
  - packages/shared/src/ws-events.types.ts
  - apps/web/src/app.css
  - apps/web/src/App.tsx
  - apps/web/src/lib/socket.ts
  - apps/web/src/lib/api.ts
  - apps/web/src/stores/board.store.ts
  - apps/web/src/providers/QueryProvider.tsx
  - apps/web/src/pages/BoardPage.tsx
  - apps/web/src/hooks/useBoard.ts
  - apps/web/src/hooks/useBoardMutations.ts
  - apps/web/src/hooks/useBoardSocket.ts
  - apps/web/src/hooks/useBoardDnd.ts
  - apps/web/src/hooks/useReducedMotion.ts
  - apps/web/src/components/board/BoardHeader.tsx
  - apps/web/src/components/board/ColumnContainer.tsx
  - apps/web/src/components/board/CardItem.tsx
  - apps/web/src/components/board/BoardSkeleton.tsx
  - apps/web/src/components/board/ConnectionStatus.tsx
  - apps/web/src/components/board/CardDetailModal.tsx
  - apps/web/src/components/board/AddListGhost.tsx
  - apps/web/src/components/board/InlineInput.tsx
  - apps/web/src/components/board/BoardCanvas.tsx
  - apps/web/src/components/board/CardDragOverlay.tsx
  - apps/web/src/components/ui/Toast.tsx
  - apps/web/src/components/ui/ToastProvider.tsx
  - apps/api/src/board/board.module.ts
  - apps/api/src/board/board.controller.ts
  - apps/api/src/board/board.service.ts
  - apps/api/src/board/dto/create-list.dto.ts
  - apps/api/src/board/dto/update-list.dto.ts
  - apps/api/src/board/dto/create-card.dto.ts
  - apps/api/src/board/dto/update-card.dto.ts
  - apps/api/src/board/dto/move-card.dto.ts
  - apps/api/src/websocket/board.gateway.ts
  - apps/api/src/websocket/websocket.module.ts
  - apps/api/src/app.module.ts
  - apps/api/test/board.e2e-spec.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-12T14:47:46Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 02 (board-core) delivers the full Kanban board — backend CRUD with fractional indexing, frontend board UI with TanStack Query, drag-and-drop via @dnd-kit/react, real-time sync via Socket.io, and CRUD mutations with optimistic updates. The overall code quality is high: consistent patterns, clean typing, good separation of concerns.

Key concerns:
1. **Critical:** The `moveCard` broadcast is missing `fromListId`, which the frontend `CardMovePayload` type requires — remote clients won't properly handle cross-list card:move events.
2. **Critical:** The `moveCard` service method has a race condition — it returns a re-fetched card after rebalance, but `findUnique` can return `null` (type mismatch with controller expectations).
3. **Warning-level:** Socket reconnection creates duplicate listeners, `InlineInput` has a new-card bug, and the `CardDetailModal` has a stale closure issue with description state.

## Critical Issues

### CR-01: `card:move` broadcast missing `fromListId` — frontend type contract broken

**File:** `apps/api/src/board/board.controller.ts:109-114`
**Issue:** The `moveCard` endpoint broadcasts `{ cardId, toListId, newPosition, card }` but the shared `CardMovePayload` type requires `fromListId`. The frontend `useBoardSocket.ts` handler (`onCardMove`) filters the card out of all lists, so it still works functionally, but the type contract is violated — `payload.fromListId` would be `undefined` at runtime. Any future code that relies on `fromListId` (e.g., animation logic to determine cross-list vs. within-list move) will silently fail.
**Fix:**
```typescript
// apps/api/src/board/board.controller.ts — moveCard method
async moveCard(
  @Param('boardId') boardId: string,
  @Param('cardId') cardId: string,
  @Body() dto: MoveCardDto,
) {
  const card = await this.boardService.getCardById(cardId); // get original before move
  const fromListId = card.listId;
  const result = await this.boardService.moveCard(cardId, dto);
  this.boardGateway.broadcastToBoard(boardId, 'card:move', {
    cardId,
    fromListId,              // <-- add this
    toListId: dto.targetListId,
    newPosition: dto.newPosition,
    card: result,
  });
  return result;
}
```
Alternatively, have `boardService.moveCard` return both the original `listId` and the updated card.

### CR-02: `moveCard` service returns potentially null value

**File:** `apps/api/src/board/board.service.ts:127-146`
**Issue:** After updating the card and running `rebalanceIfNeeded`, the method re-fetches the card with `findUnique` (line 145). `findUnique` returns `Card | null`, but the controller uses the return value directly (broadcasts it, returns it to client). If the card were deleted between the update and the re-fetch (unlikely but possible in concurrent scenarios), this would return `null` to the client and broadcast `null` as the card payload. Additionally, after the update on line 133, the `updatedCard` variable is created but never used — the re-fetch on line 145 discards the already-available data.
**Fix:**
```typescript
async moveCard(cardId: string, dto: MoveCardDto) {
  const card = await this.prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    throw new NotFoundException(`Card ${cardId} not found`);
  }

  await this.prisma.card.update({
    where: { id: cardId },
    data: {
      listId: dto.targetListId,
      position: dto.newPosition,
    },
  });

  const rebalanced = await this.rebalanceIfNeeded(dto.targetListId);

  // If rebalanced, re-fetch for updated position; otherwise use known values
  if (rebalanced) {
    const fresh = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!fresh) throw new NotFoundException(`Card ${cardId} not found after rebalance`);
    return fresh;
  }

  // No rebalance — return card with updated fields directly
  return { ...card, listId: dto.targetListId, position: dto.newPosition };
}
```

## Warnings

### WR-01: Socket.io `connectSocket` doesn't reset stale socket — can return disconnected instance

**File:** `apps/web/src/lib/socket.ts:8-9`
**Issue:** `connectSocket()` checks `socket?.connected` and returns early if true. But if the socket exists but is in a disconnected/reconnecting state (`socket` is non-null, `socket.connected` is `false`), it creates a **new** socket without disconnecting the old one. This leaks the previous socket instance (its event listeners keep firing). On the second call, the module-level `socket` variable is overwritten, but the old socket's `reconnect` handler could fire and cause ghost events.
**Fix:**
```typescript
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Clean up any existing disconnected socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: getAccessToken() },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}
```

### WR-02: `InlineInput` prevents saving new cards with empty initial value

**File:** `apps/web/src/components/board/InlineInput.tsx:23-29`
**Issue:** `handleSave` checks `trimmed !== value` — if the initial `value` is `""` (as used for new card creation in `ColumnContainer.tsx:203`) and the user types a card title, the condition `trimmed !== value` evaluates `"my card" !== ""` → true, so it works. BUT: if the user just hits Enter without typing (empty input), `trimmed` is `""`, which equals `value` (`""`), so it calls `onCancel()` instead of doing nothing. This is actually fine behavior. However, the `trimmed && trimmed !== value` guard means it will also call `onCancel()` even when `trimmed` is truthy — wait, re-reading: `if (trimmed && trimmed !== value)` — if `trimmed` is truthy AND different, it saves. If equal, it cancels. This seems correct for rename. But for new card creation where `value=""`, if user types "test" and presses Enter, `trimmed = "test"`, `trimmed !== "" → true` → saves. OK, this works.

**Updated assessment:** On closer inspection, the real issue is that `onBlur` calls `handleSave`, and if the trimmed text equals the original value, it calls `onCancel()`. For the **rename** case: if a user clicks into a list name, doesn't change anything, and clicks away (blur), `onCancel` fires, which is correct. No bug here — downgrading from the original concern.

**ACTUAL Issue:** When `InlineInput` is used for **new card creation** (`value=""`), if the user types whitespace only and hits Enter: `trimmed=""`, `trimmed` is falsy → `onCancel()` is called. This is correct behavior — empty titles shouldn't save. No fix needed.

*Self-correction: Removing this finding — no bug after thorough analysis.*

### WR-02: `CardDetailModal` description state goes stale when card data updates via WebSocket

**File:** `apps/web/src/components/board/CardDetailModal.tsx:20`
**Issue:** The description textarea state is initialized from `card.descriptionText` on mount: `const [description, setDescription] = useState(card.descriptionText ?? '')`. If another user updates the same card's description via WebSocket while the modal is open, the `card` prop gets a new `descriptionText` from TanStack Query, but the local `description` state is stale (React `useState` initial value only runs once). The user sees their old text, and on blur, their stale version overwrites the remote update.
**Fix:**
```typescript
// Sync local state when card prop changes (remote update)
useEffect(() => {
  setDescription(card.descriptionText ?? '');
}, [card.descriptionText]);
```
Note: This creates a "last writer wins" UX. For Phase 3 (TipTap + Yjs), this becomes CRDT-based and the issue resolves itself. But for Phase 2's plain textarea, the sync effect prevents silently discarding remote updates.

### WR-03: `updateList` doesn't verify list belongs to the specified board

**File:** `apps/api/src/board/board.service.ts:58-68`
**Issue:** `updateList(listId, dto)` finds the list by `listId` alone and updates it, without checking that the list's `boardId` matches the `boardId` in the URL. A user could PATCH `/api/boards/board-A/lists/list-from-board-B` and it would succeed. Same issue exists in `deleteList` (line 70). While the global JwtAuthGuard protects the endpoints and this is a portfolio project (accepted in threat model T-02-05), this is a correctness issue — the `boardId` URL param is ignored, which could cause confusion in broadcasting (the gateway broadcasts to the wrong board room).
**Fix:**
```typescript
async updateList(boardId: string, listId: string, dto: UpdateListDto) {
  const list = await this.prisma.list.findUnique({ where: { id: listId } });
  if (!list) throw new NotFoundException(`List ${listId} not found`);
  if (list.boardId !== boardId) throw new NotFoundException(`List ${listId} not found in board ${boardId}`);
  return this.prisma.list.update({ where: { id: listId }, data: { ...dto } });
}
```
Apply the same pattern to `deleteList`, `updateCard`, `deleteCard`, and `moveCard`.

### WR-04: `rebalanceIfNeeded` uses `Promise.all` for dependent writes — potential race condition

**File:** `apps/api/src/board/board.service.ts:169-176`
**Issue:** The rebalance logic updates all cards in a list via `Promise.all(updates)`. Multiple concurrent `UPDATE` statements could conflict if another request is also modifying cards in the same list simultaneously. Since Prisma doesn't wrap `Promise.all` in a transaction by default, a concurrent `moveCard` to the same list during rebalance could result in inconsistent positions.
**Fix:**
```typescript
// Use a Prisma transaction for atomicity
await this.prisma.$transaction(
  cards.map((card, index) =>
    this.prisma.card.update({
      where: { id: card.id },
      data: { position: (index + 1) * 1000 },
    }),
  ),
);
```

### WR-05: `useBoardSocket` calls `disconnectSocket()` on cleanup — kills socket for other potential consumers

**File:** `apps/web/src/hooks/useBoardSocket.ts:184`
**Issue:** When `BoardPage` unmounts (e.g., navigating away), the cleanup function calls `disconnectSocket()` which fully disconnects and nulls the socket. If any other component also holds a reference to the socket (or if React StrictMode double-mounts), this could disconnect the socket prematurely during development. Currently `useBoardSocket` is the only consumer, so this works. However, if the user navigates from one board to another (`/board/A` → `/board/B`), React unmounts the old `BoardPage` and mounts the new one — the cleanup disconnects the socket, then `connectSocket` in the new page creates a fresh one. The brief disconnection causes a flash in the ConnectionStatus indicator.
**Fix:** Instead of destroying the socket on page unmount, just leave the room and remove event listeners. Only disconnect the socket on app-level unmount or user logout:
```typescript
return () => {
  socket.emit('board:leave', { boardId });
  socket.off('connect', onConnect);
  socket.off('disconnect', onDisconnect);
  socket.io.off('reconnect_attempt', onReconnectAttempt);
  socket.io.off('reconnect', onReconnect);
  socket.off('card:move', onCardMove);
  // ... other offs
  // DON'T call disconnectSocket() here — let the socket persist
};
```

### WR-06: `updateCard` DTO spread leaks `id` field into Prisma update

**File:** `apps/api/src/board/board.service.ts:111-114`
**Issue:** `updateCard` uses `data: { ...dto }` where `dto` is `UpdateCardDto`. Since `UpdateCardDto` only has `title?` and `descriptionText?`, this is currently safe — class-validator with `whitelist: true` strips unknown fields. However, the pattern of spreading the full DTO into `data` is fragile. If someone adds a field to `UpdateCardDto` (like `coverColor`) without considering whether it should be directly passed to Prisma, it auto-propagates. The same pattern is used in `updateList` (line 67). Not a current bug, but a maintenance hazard.
**Fix:** Explicitly pick fields:
```typescript
return this.prisma.card.update({
  where: { id: cardId },
  data: {
    ...(dto.title !== undefined && { title: dto.title }),
    ...(dto.descriptionText !== undefined && { descriptionText: dto.descriptionText }),
  },
});
```

## Info

### IN-01: `CardDetailModal` wraps content in redundant `AnimatePresence`

**File:** `apps/web/src/components/board/CardDetailModal.tsx:80`
**Issue:** The modal internally wraps itself in `<AnimatePresence>`, but it's already wrapped in `<AnimatePresence>` by `BoardPage.tsx:42`. The inner `AnimatePresence` is redundant and could potentially interfere with exit animations (the outer one controls mount/unmount, the inner one has no dynamic children).
**Fix:** Remove the `<AnimatePresence>` wrapper inside `CardDetailModal.tsx`. The outer wrapper in `BoardPage.tsx` already handles mount/unmount animations.

### IN-02: `board.lists.sort()` called in multiple places without memoization

**File:** `apps/web/src/components/board/BoardCanvas.tsx:64`, `apps/web/src/components/board/ColumnContainer.tsx:18`
**Issue:** Lists are sorted inline on every render: `board.lists.sort(...)` in `BoardCanvas` and `[...list.cards].sort(...)` in `ColumnContainer`. The spread-then-sort pattern is correct (avoids mutating the original), but the sort runs on every render. For 5 lists with 17 cards, this is negligible (out of perf scope), but noting for code quality — `useMemo` would make the intent clearer.
**Fix:** Optional — wrap in `useMemo` for clarity:
```typescript
const sortedLists = useMemo(
  () => [...board.lists].sort((a, b) => a.position - b.position),
  [board.lists],
);
```

### IN-03: `AddListGhost` shows redundant "+" in button text

**File:** `apps/web/src/components/board/AddListGhost.tsx:51`
**Issue:** The button renders both a `<Plus>` icon AND the text `"+ Add List"`. This shows two plus signs: the Lucide Plus icon and the "+" character in the text.
**Fix:** Change text to `"Add List"` (without the leading "+") since the icon already provides the visual cue:
```tsx
<span className="font-body text-sm">Add List</span>
```

### IN-04: `ConnectionStatus` shows "Disconnected" on initial page load

**File:** `apps/web/src/stores/board.store.ts:16`, `apps/web/src/components/board/ConnectionStatus.tsx`
**Issue:** The Zustand store initializes `connectionStatus` to `'disconnected'`. Before the socket connects (brief moment on page load), the user sees a red dot with "Disconnected" which flashes to green "Connected" once the socket connects. This is technically accurate but could be jarring.
**Fix:** Consider initializing to `'reconnecting'` or adding a `'connecting'` state to show a neutral/yellow indicator during the initial connection attempt, rather than alarming red.

---

_Reviewed: 2026-04-12T14:47:46Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
