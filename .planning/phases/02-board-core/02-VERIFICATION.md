---
phase: 02-board-core
verified: 2026-04-12T15:10:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Open the board page in a browser (http://localhost:5173/board/:boardId) and verify 5 lists with 17 cards render correctly"
    expected: "Board shows 5 vertical columns (Backlog, To Do, In Progress, Review, Done) with cards stacked in each, colored top stripes visible"
    why_human: "Visual rendering, layout correctness, and colored stripe styling cannot be verified by static analysis"
  - test: "Drag a card within the same list and across lists"
    expected: "Ghost overlay follows cursor with lift effect (scale + shadow + rotation). Card lands in correct position immediately. Drop zone indicator shows accent-colored gap line."
    why_human: "Drag-and-drop interaction, visual feedback (ghost overlay, drop indicator, auto-scroll), and optimistic update timing require interactive testing"
  - test: "Trigger a failed card move (e.g., stop the API server mid-drag)"
    expected: "Card reverts to original position with animation and a toast notification appears saying 'Card move failed. The card has been returned to its original position.'"
    why_human: "Failure scenario requires simulating network error during active operation"
  - test: "Open two browser tabs to the same board, move a card in tab 1"
    expected: "Card animates to new position in tab 2 via Socket.io broadcast with smooth spring animation"
    why_human: "Real-time WebSocket sync between tabs requires running server and two live clients"
  - test: "Create, rename, and delete a list; create, edit title inline, and delete a card"
    expected: "All CRUD operations work with optimistic updates (instant UI feedback) and toast on error"
    why_human: "Full CRUD interaction flow with inline editing, modals, and confirmation dialogs needs interactive testing"
---

# Phase 2: Board Core Verification Report

**Phase Goal:** Users can view, create, edit, and reorganize cards across lists with drag-and-drop, with all changes broadcast to connected clients in real-time
**Verified:** 2026-04-12T15:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Roadmap SC) | Status | Evidence |
|---|---|---|---|
| 1 | User sees a board with vertical columns (lists) and stacked cards, including a seeded demo board with 5 lists and 17 cards | ✓ VERIFIED | `BoardPage.tsx` fetches via `useBoard(boardId)` → `apiGet<BoardWithLists>(/api/boards/${boardId})`. `BoardCanvas.tsx` renders sorted columns via `ColumnContainer`. `CardItem.tsx` renders cards with coverColor stripe and title. `BoardSkeleton.tsx` shows shimmer during load. Route `/board/:boardId` registered in `App.tsx`. Backend `getBoard()` returns board with lists (ordered by position) and nested cards (ordered by position). |
| 2 | User can create, rename, and delete lists, and create, edit title inline, and delete cards | ✓ VERIFIED | 8 REST endpoints in `BoardController`: POST/PATCH/DELETE for lists, POST/PATCH/DELETE for cards, POST for move. `useBoardMutations.ts` provides 7 TanStack Query mutations (useCreateList, useUpdateList, useDeleteList, useCreateCard, useUpdateCard, useDeleteCard, useMoveCard) — all with full optimistic update pattern (snapshot → apply → revert on error → invalidate). `AddListGhost.tsx` handles list creation. `ColumnContainer.tsx` has inline rename via InlineInput, 3-dot menu with delete confirmation. `CardItem.tsx` has click-to-edit title. `CardDetailModal.tsx` has editable title, textarea description, and delete with confirmation. |
| 3 | User can drag cards within and across lists with a ghost overlay, and cards land in correct position immediately (optimistic update) | ✓ VERIFIED | `BoardCanvas.tsx` wraps DragDropProvider from `@dnd-kit/react`. `CardItem.tsx` uses `useSortable` with `group: card.listId` for cross-list sorting. `CardDragOverlay.tsx` renders ghost card with scale-1.03, rotate-2deg, shadow-card-drag, opacity-0.95, accent border. `useBoardDnd.ts` implements onDragStart/onDragOver/onDragEnd with fractional position calculation (start/2, midpoint, end+1000) and calls `useMoveCard` mutation. Column shows dashed placeholder when isDragging. Drop target column highlights with accent border via `useDroppable` in ColumnContainer. Auto-scroll at 60px edge zones implemented in BoardCanvas. |
| 4 | Failed drag operations revert with animation and show a toast notification | ✓ VERIFIED | `useMoveCard` in `useBoardMutations.ts` has `onError` handler that reverts cache to `context.previous` snapshot and calls `addToast('error', 'Card move failed. The card has been returned to its original position.')`. `useBoardDnd.ts` stores pre-drag snapshot in `snapshotRef` and reverts on `event.canceled`. `ToastProvider.tsx` renders toast with auto-dismiss, bottom-right positioning, aria-live="polite". `Toast.tsx` (44 lines in provider) handles display. motion.div layout animation on CardItem provides visual revert animation. |
| 5 | In a second browser tab, card moves appear in real-time via Socket.io broadcast with smooth animation | ✓ VERIFIED | **Backend:** `BoardGateway.broadcastToBoard()` emits events to board rooms. `BoardController` calls broadcast after every mutation (createList/updateList/deleteList/createCard/updateCard/deleteCard/moveCard). **Frontend:** `useBoardSocket.ts` connects to board room on mount, listens to all 7 event types (card:move/create/update/delete, list:create/update/delete), and updates TanStack Query cache via `setQueryData`. Connection status updates Zustand store. Manager-level reconnect events handled via `socket.io.on()`. Cleanup on unmount: board:leave + disconnectSocket. **Animation:** `AnimatePresence mode="popLayout"` in ColumnContainer for card create/delete. `motion.div layout` with spring(200,25,0.8) on CardItem for smooth remote move animation. AnimatePresence on columns in BoardCanvas for list create/delete. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/shared/src/board.types.ts` | Extended types with BoardWithLists, WS payloads | ✓ VERIFIED | 71 lines. BoardWithLists, ListWithCards, CardMovePayload, CardCreatePayload, CardUpdatePayload, CardDeletePayload, ListCreatePayload, ListUpdatePayload, ListDeletePayload all present. |
| `packages/shared/src/ws-events.types.ts` | WsEventMap interface | ✓ VERIFIED | 35 lines. WsEventMap maps all 9 event types to typed payloads. Imports from board.types.ts. |
| `apps/api/src/board/board.controller.ts` | REST endpoints + broadcast | ✓ VERIFIED | 117 lines. 8 endpoints: GET board, POST/PATCH/DELETE list, POST/PATCH/DELETE card, POST move. Injects BoardGateway, broadcasts after every mutation. |
| `apps/api/src/board/board.service.ts` | Business logic, fractional indexing, rebalancing | ✓ VERIFIED | 179 lines. getBoard with nested includes, createList/Card with max+1000 position, moveCard with rebalanceIfNeeded (gap < 0.001 threshold, reassigns (index+1)*1000). |
| `apps/api/src/websocket/board.gateway.ts` | Room management + broadcasting | ✓ VERIFIED | 77 lines. board:join/leave handlers, handleDisconnect cleanup, broadcastToBoard with optional excludeSocketId. |
| `apps/api/src/board/board.module.ts` | NestJS module | ✓ VERIFIED | 13 lines. Imports PrismaModule + WebSocketModule, exports BoardService. |
| `apps/api/src/board/dto/*.ts` | 5 DTOs | ✓ VERIFIED | All 5 DTOs exist: create-list, update-list, create-card, update-card, move-card. |
| `apps/api/test/board.e2e-spec.ts` | E2E tests | ✓ VERIFIED | 312 lines. Full test suite with auth setup, DB cleanup, 11+ test cases. |
| `apps/web/src/pages/BoardPage.tsx` | Board page with data + socket | ✓ VERIFIED | 55 lines. useBoard + useBoardSocket + CardDetailModal + BoardCanvas integration. |
| `apps/web/src/hooks/useBoard.ts` | TanStack Query board hook | ✓ VERIFIED | 11 lines. useQuery with ['board', boardId] key, apiGet, enabled guard. |
| `apps/web/src/hooks/useBoardMutations.ts` | 7 CRUD mutations | ✓ VERIFIED | 279 lines. 7 mutations with full optimistic update pattern (cancelQueries → snapshot → setQueryData → onError revert + toast → onSettled invalidate). |
| `apps/web/src/hooks/useBoardDnd.ts` | DnD state + position calc | ✓ VERIFIED | 137 lines. onDragStart/onDragOver/onDragEnd, fractional position calc, snapshot revert, useMoveCard integration. |
| `apps/web/src/hooks/useBoardSocket.ts` | Socket.io event listeners | ✓ VERIFIED | 187 lines. 7 event handlers, connection status, manager-level reconnect, cleanup on unmount. |
| `apps/web/src/components/board/BoardCanvas.tsx` | DragDropProvider + auto-scroll | ✓ VERIFIED | 93 lines. DragDropProvider wrapping columns, DragOverlay with CardDragOverlay, 60px edge zone auto-scroll, AnimatePresence on columns. |
| `apps/web/src/components/board/ColumnContainer.tsx` | 280px column with CRUD | ✓ VERIFIED | 223 lines. 280px fixed width, sorted cards, useDroppable with accent border, rename/delete/addCard, AnimatePresence mode="popLayout" on cards. |
| `apps/web/src/components/board/CardItem.tsx` | Sortable card with coverColor | ✓ VERIFIED | 116 lines. useSortable with group=listId, isDragging placeholder, coverColor stripe, inline title edit, motion.div layout animation, merged ref callback, role="button" + aria-label. |
| `apps/web/src/components/board/CardDetailModal.tsx` | Editable modal | ✓ VERIFIED | 206 lines. Editable title via InlineInput, textarea description with auto-save on blur, delete with confirmation, backdrop blur, spring animation, focus trap, Escape to close, aria-modal="true". |
| `apps/web/src/components/board/CardDragOverlay.tsx` | Ghost card overlay | ✓ VERIFIED | 33 lines. scale-1.03, rotate-2deg, shadow-card-drag, opacity-0.95, accent border, coverColor stripe. |
| `apps/web/src/components/board/AddListGhost.tsx` | Ghost list column | ✓ VERIFIED | 85 lines. 280px dashed border, hover accent, inline input form with Add List / Cancel buttons. |
| `apps/web/src/components/board/BoardSkeleton.tsx` | Loading skeleton | ✓ VERIFIED | 61 lines. 3 columns, 3-4 cards each, CSS shimmer animation with custom keyframes. |
| `apps/web/src/components/board/BoardHeader.tsx` | Header with name + status | ✓ VERIFIED | 16 lines. Board name in Space Grotesk + ConnectionStatus component. |
| `apps/web/src/components/board/ConnectionStatus.tsx` | 3-state indicator | ✓ VERIFIED | 33 lines. Green/yellow/red dot with label from Zustand store. |
| `apps/web/src/components/board/InlineInput.tsx` | Reusable click-to-edit | ✓ VERIFIED | 54 lines. Auto-focus + select, Enter save, Escape cancel, blur auto-commit. |
| `apps/web/src/stores/board.store.ts` | Zustand UI store | ✓ VERIFIED | 20 lines. selectedCardId, connectionStatus, openCard/closeCard/setConnectionStatus actions. |
| `apps/web/src/lib/socket.ts` | Socket.io singleton | ✓ VERIFIED | 31 lines. connectSocket/disconnectSocket/getSocket, JWT auth, reconnection config. |
| `apps/web/src/hooks/useReducedMotion.ts` | Accessibility hook | ✓ VERIFIED | 25 lines. Listens to prefers-reduced-motion media query. |
| `apps/web/src/components/ui/ToastProvider.tsx` | Toast system | ✓ VERIFIED | 44 lines. React context with addToast, stacked bottom-right, aria-live="polite". |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| BoardPage.tsx | useBoard.ts | `useBoard(boardId!)` hook | ✓ WIRED | Line 13: `const { data: board, isLoading, error } = useBoard(boardId!)` |
| useBoard.ts | /api/boards/:id | `apiGet` from lib/api.ts | ✓ WIRED | Line 8: `apiGet<BoardWithLists>(\`/api/boards/${boardId}\`)` |
| BoardPage.tsx | useBoardSocket.ts | `useBoardSocket(boardId!)` | ✓ WIRED | Line 16: `useBoardSocket(boardId!)` |
| useBoardSocket.ts | QueryProvider.tsx | `setQueryData` for cache updates | ✓ WIRED | Line 25: `getQueryClient()` + 7 event handlers all call `queryClient.setQueryData` |
| useBoardSocket.ts | board.store.ts | `setConnectionStatus` on events | ✓ WIRED | Line 26: `useBoardStore.getState()` + `setConnectionStatus()` on connect/disconnect/reconnect |
| useBoardSocket.ts | socket.ts | `connectSocket/disconnectSocket` | ✓ WIRED | Line 24: `connectSocket()` + Line 184: `disconnectSocket()` in cleanup |
| useBoardMutations.ts | /api/boards/:boardId/* | `apiPost/apiPatch/apiDelete` | ✓ WIRED | 7 mutations: createList (POST), updateList (PATCH), deleteList (DELETE), createCard (POST), updateCard (PATCH), moveCard (POST), deleteCard (DELETE) |
| CardDetailModal.tsx | useBoardMutations.ts | `useUpdateCard`, `useDeleteCard` | ✓ WIRED | Lines 16-17: `useUpdateCard(boardId)`, `useDeleteCard(boardId)`. handleTitleSave calls mutate, handleDelete calls mutate. |
| board.controller.ts | board.service.ts | NestJS DI injection | ✓ WIRED | Line 24: `constructor(private readonly boardService: BoardService)` |
| board.controller.ts | board.gateway.ts | NestJS DI injection | ✓ WIRED | Line 25: `constructor(..., private readonly boardGateway: BoardGateway)` + `broadcastToBoard` called after every mutation |
| BoardCanvas.tsx | useBoardDnd.ts | DragDropProvider handlers | ✓ WIRED | Lines 20-22: `useBoardDnd(board.id)` + DragDropProvider receives onDragStart/onDragOver/onDragEnd |
| useBoardDnd.ts | useMoveCard mutation | moveCard.mutate | ✓ WIRED | Line 117: `moveCard.mutate({ cardId, targetListId, newPosition })` |
| App.tsx | BoardPage | Route /board/:boardId | ✓ WIRED | Line 22: `<Route path="/board/:boardId" element={<BoardPage />} />` |
| App.tsx | ToastProvider | Context wrapper | ✓ WIRED | Lines 14/26: `<ToastProvider>` wrapping routes inside `<QueryProvider>` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| BoardPage.tsx | `board` (BoardWithLists) | useBoard → apiGet → /api/boards/:id → Prisma findUnique with nested includes | Yes — Prisma DB query | ✓ FLOWING |
| ColumnContainer.tsx | `list.cards` | Passed as prop from BoardPage → BoardCanvas → ColumnContainer | Yes — from board API response | ✓ FLOWING |
| CardDetailModal.tsx | `card`, `description` | Passed as prop from BoardPage (found in board.lists) | Yes — from board API response | ✓ FLOWING |
| useBoardSocket.ts | cache updates | Socket.io events → setQueryData | Yes — server broadcasts real mutation results | ✓ FLOWING |
| ConnectionStatus.tsx | `connectionStatus` | Zustand store ← useBoardSocket event handlers | Yes — Socket.io connection events | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| TypeScript compiles (frontend) | `cd apps/web && pnpm exec tsc --noEmit` | Exit 0, no errors | ✓ PASS |
| TypeScript compiles (backend) | `cd apps/api && pnpm exec tsc --noEmit` | Exit 0, no errors | ✓ PASS |
| TypeScript compiles (shared) | `cd packages/shared && pnpm exec tsc --noEmit` | Exit 0, no errors | ✓ PASS |
| Board E2E tests | board.e2e-spec.ts exists, 312 lines | Substantive test file | ? SKIP — requires running DB |
| No TODO/FIXME/placeholder in board code | grep scan across apps/web/src and apps/api/src/board | 0 matches | ✓ PASS |
| No empty implementations in components | grep for `return null|return {}|return []` in components | 0 matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| BORD-01 | 02-01, 02-03 | User can view a board with vertical columns and cards | ✓ SATISFIED | BoardPage → useBoard → GET /api/boards/:id → ColumnContainer + CardItem rendering |
| BORD-02 | 02-02, 02-04 | User can create, rename, and delete lists | ✓ SATISFIED | POST/PATCH/DELETE list endpoints + useCreateList/useUpdateList/useDeleteList mutations + AddListGhost + inline rename + delete confirmation |
| BORD-03 | 02-02, 02-04 | User can create cards with title in any list | ✓ SATISFIED | POST card endpoint + useCreateCard mutation + "Add a card" button in ColumnContainer |
| BORD-04 | 02-04 | User can click card to open detail modal | ✓ SATISFIED | CardItem onClick → openCard(card.id) → CardDetailModal with title, description, breadcrumb, date |
| BORD-05 | 02-04 | User can edit card title inline on the board | ✓ SATISFIED | CardItem click-to-edit title → InlineInput → useUpdateCard mutation |
| BORD-06 | 02-04 | User can delete cards | ✓ SATISFIED | CardDetailModal → delete with confirmation → useDeleteCard mutation |
| BORD-07 | 02-02, 02-03 | Demo board seeded with 5 lists and 17 cards | ✓ SATISFIED | Backend seed.ts creates demo board (verified in Phase 1). BoardPage renders all seeded data from API. |
| BORD-08 | 02-02 | Fractional indexing with FLOAT positions | ✓ SATISFIED | BoardService: createList/createCard use max+1000, moveCard uses client-calculated position, Prisma FLOAT columns |
| BORD-09 | 02-02, 02-06 | Rebalancing on precision degradation | ✓ SATISFIED | BoardService.rebalanceIfNeeded(): gap < 0.001 threshold → reassign all as (index+1)*1000 |
| DND-01 | 02-05 | Drag cards within same list | ✓ SATISFIED | useSortable with group=listId enables within-list reorder, useBoardDnd calculates fractional position |
| DND-02 | 02-05 | Drag cards across lists | ✓ SATISFIED | useSortable group prop enables cross-list sorting via @dnd-kit/react 0.3.x |
| DND-03 | 02-05 | Ghost card with lift effect | ✓ SATISFIED | CardDragOverlay: scale-1.03, rotate-2deg, shadow-card-drag, opacity-0.95, accent border |
| DND-04 | 02-02, 02-05 | Optimistic update — card appears immediately | ✓ SATISFIED | useMoveCard with onMutate: snapshot → setQueryData with new position. useBoardDnd calls mutate on dragEnd. |
| DND-05 | 02-05 | Failed move reverts with animation and toast | ✓ SATISFIED | useMoveCard onError: revert to context.previous + addToast('error', 'Card move failed...'). motion.div layout provides visual revert. |
| DND-06 | 02-06 | Remote card moves broadcast via Socket.io | ✓ SATISFIED | BoardController broadcasts card:move after moveCard. useBoardSocket handles card:move event → setQueryData updates cache → motion.div layout animates position change. |

**All 15 requirement IDs (BORD-01 through BORD-09, DND-01 through DND-06) accounted for. No orphaned requirements.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `apps/api/src/board/board.controller.ts` | 109-114 | `broadcastToBoard(boardId, 'card:move', { cardId, toListId, ... })` — missing `fromListId` field required by `CardMovePayload` type | ℹ️ Info | Type mismatch between broadcast payload and shared `CardMovePayload`. Not a functional issue: frontend handler doesn't use `fromListId`. `broadcastToBoard` accepts `data: unknown` so TypeScript doesn't catch it. |

### Human Verification Required

### 1. Visual Board Rendering

**Test:** Navigate to `http://localhost:5173/board/:boardId` with API running and seeded demo board
**Expected:** 5 vertical columns with 17 cards, colored top stripes, horizontal scrolling, proper dark theme styling per DESIGN.md
**Why human:** Visual layout, color rendering, responsive scrolling, and design system conformance require visual inspection

### 2. Drag-and-Drop Interaction

**Test:** Drag a card within a list, then drag a card across lists
**Expected:** Ghost overlay follows cursor with scale + rotation + shadow. Original position shows dashed placeholder. Drop zone shows accent gap indicator. Target column highlights with accent border. Card lands immediately (optimistic). Board auto-scrolls when dragging to edges.
**Why human:** DnD visual feedback, cursor tracking smoothness, spring physics, and auto-scroll behavior require interactive testing

### 3. Move Failure Revert

**Test:** Trigger a network error during a card move (stop API server mid-operation)
**Expected:** Card reverts to original position with animation, toast notification appears at bottom-right
**Why human:** Failure scenario requires simulating network disruption during active operation

### 4. Two-Tab Real-Time Sync

**Test:** Open same board in two browser tabs, perform CRUD operations in tab 1
**Expected:** All changes (card move, create, update, delete; list create, update, delete) appear in tab 2 with smooth animations. Connection status indicator updates correctly.
**Why human:** Multi-client WebSocket sync timing and animation smoothness require live two-tab testing

### 5. Card Detail Modal Interaction

**Test:** Click a card to open detail modal. Edit title, add description, delete card.
**Expected:** Modal opens with spring animation, backdrop blur. Title is click-to-edit. Description textarea auto-saves on blur. Delete shows confirmation. Escape/overlay click closes modal.
**Why human:** Modal UX, focus trap, animation timing, and inline editing behavior need interactive testing

### Gaps Summary

No functional gaps found. All 5 roadmap success criteria are VERIFIED through code analysis:

1. **Board display** — BoardPage/ColumnContainer/CardItem fully wired with data fetching and rendering
2. **CRUD operations** — All 8 REST endpoints + 7 frontend mutations with optimistic updates
3. **Drag-and-drop** — @dnd-kit/react 0.3.x integration with ghost overlay, cross-list moves, fractional indexing
4. **Failure revert** — Snapshot-based revert with toast notification on mutation error
5. **Real-time sync** — Socket.io board rooms with 7 event handlers updating TanStack Query cache directly

One minor **Info-level** observation: the `card:move` broadcast payload from the controller is missing the `fromListId` field relative to the `CardMovePayload` shared type. This is cosmetic — the frontend consumer doesn't use that field, and the `broadcastToBoard` method accepts `unknown` data. Would be a simple fix to add `fromListId: card.listId` (the pre-move listId) to the broadcast call.

**Status is `human_needed` because 5 items require interactive testing with running servers.** All static verification passes.

---

_Verified: 2026-04-12T15:10:00Z_
_Verifier: the agent (gsd-verifier)_
