---
phase: 03-real-time-collaboration
verified: 2026-04-12T19:30:22Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Two browser tabs on same board show each other's cursors on canvas"
    expected: "Colored cursor with name pill appears on Tab B when mouse moves in Tab A"
    why_human: "Requires two live browser sessions, WebSocket round-trip, and visual rendering verification"
  - test: "Collaborative editing: character-level sync in TipTap editor"
    expected: "Typing in Tab A's card description appears in real-time in Tab B's TipTap editor"
    why_human: "Requires y-websocket server running, Yjs CRDT sync working end-to-end, visual TipTap rendering"
  - test: "Online user avatars appear in board header with join/leave animation"
    expected: "Both tabs show colored avatar circles in header; closing one tab triggers leave animation"
    why_human: "Requires visual verification of animated avatar join/leave spring physics"
  - test: "Cursor glow breathe animation after 3s idle"
    expected: "Cursor glow oscillates (8px→14px→8px drop-shadow) after mouse stops for 3 seconds"
    why_human: "CSS animation timing and visual quality requires human eye"
  - test: "Yjs state persists to database on disconnect"
    expected: "Edit card description, close all tabs, reopen — content is still there"
    why_human: "Requires server running with PostgreSQL, full lifecycle verification"
  - test: "Floating toolbar appears on text selection"
    expected: "Select text in editor → floating toolbar with Bold/Italic/Strikethrough/Code/Link buttons appears"
    why_human: "Visual positioning and interaction requires human verification"
  - test: "Reconnect banner on y-websocket disconnect"
    expected: "Stop API server → 'Reconnecting...' banner above editor; restart → banner disappears"
    why_human: "Requires server restart and visual verification of reconnection behavior"
---

# Phase 3: Real-time Collaboration Verification Report

**Phase Goal:** Multiple users can simultaneously edit card descriptions with character-level sync, see each other's cursors on the board, and know who's online
**Verified:** 2026-04-12T19:30:22Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Two users editing the same card description see character-level changes appear in real-time via TipTap + Yjs | ✓ VERIFIED (code) | CollaborativeEditor.tsx uses TipTap with `Collaboration.configure({ document: ydoc, field: 'description' })` + `CollaborationCursor`; useYjsProvider.ts creates `WebsocketProvider` connecting to `/yjs/card:{cardId}`; yjs.setup.ts implements full y-protocols sync with MESSAGE_SYNC and MESSAGE_AWARENESS; bindState loads, writeState persists. All wired end-to-end. |
| 2 | Each user's cursor and selection in the editor is highlighted in their assigned color with name label | ✓ VERIFIED (code) | CollaborativeEditor.tsx configures `CollaborationCursor.configure({ provider, user: { name, color } })`; app.css defines `.collaboration-cursor__caret` (2px border in currentColor) and `.collaboration-cursor__label` (DM Sans 12px, white text, rounded pill at -1.4em top offset) |
| 3 | Board header shows online user avatars with colored borders, animating on join/leave | ✓ VERIFIED (code) | OnlineUsers.tsx reads `usePresenceStore`, renders up to 5 UserAvatar (size='md') with -8px overlap and "+N" overflow pill; motion.div with `layout` prop, spring(300,20) join, easeIn exit; BoardHeader.tsx renders `<OnlineUsers />` left of `<ConnectionStatus />`; useBoardSocket.ts handles `presence:users`, `presence:join`, `presence:leave` events updating Zustand store |
| 4 | Remote user cursors are visible on the board canvas with colored glow effect and name label | ✓ VERIFIED (code) | CursorOverlay.tsx renders inside BoardCanvas.tsx (absolute, inset-0, pointer-events-none, z-40); RemoteCursor.tsx renders 16×20 SVG arrow with `fill={color}` and `filter: drop-shadow(0 0 8px ${color})`; name pill with user color bg and white text; idle breathe after 3s via `.cursor-breathe` CSS keyframe; usePresence.ts emits `presence:cursor` throttled at 50ms; BoardGateway handles `@SubscribeMessage('presence:cursor')` and broadcasts |
| 5 | Yjs document state persists to database on last-user-disconnect and on 30-second debounce during active editing | ✓ VERIFIED (code) | yjs-persistence.ts: `writeState()` calls `prisma.card.update({ data: { descriptionYjs: Buffer.from(state), descriptionText: plaintext } })`; `setupDebouncedPersistence()` uses 30_000ms debounce timer; yjs.setup.ts ws `close` handler calls `writeState()` when `connections.size === 0`; `flushAllDirtyDocs()` called on SIGTERM/SIGINT in main.ts; 15/15 tests passing |

**Score:** 5/5 truths verified (code-level)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/presence.types.ts` | Presence type definitions | ✓ VERIFIED | 43 lines, exports 6 interfaces: OnlineUser, CursorPosition, PresenceCursorPayload, PresenceJoinPayload, PresenceLeavePayload, CoEditorInfo |
| `packages/shared/src/ws-events.types.ts` | Updated WsEventMap with presence payloads | ✓ VERIFIED | Imports from `./presence.types`, WsEventMap includes `presence:cursor`, `presence:join`, `presence:leave` with typed payloads |
| `packages/shared/src/index.ts` | Barrel re-exports | ✓ VERIFIED | Re-exports all 6 presence types from `./presence.types` |
| `apps/api/src/collab/yjs-persistence.ts` | PostgreSQL BYTEA persistence callbacks | ✓ VERIFIED | 196 lines. bindState with BYTEA load + D-15 plaintext migration; writeState with BYTEA + plaintext extraction; setupDebouncedPersistence with 30_000ms; flushAllDirtyDocs for shutdown; UUID validation |
| `apps/api/src/collab/collab.service.ts` | NestJS service for collaboration | ✓ VERIFIED | 25 lines. Injectable, exposes PrismaService via getPrisma() |
| `apps/api/src/collab/collab.module.ts` | NestJS module | ✓ VERIFIED | 14 lines. Provides and exports CollabService |
| `apps/api/src/websocket/yjs.setup.ts` | y-protocols WebSocket sync | ✓ VERIFIED | 298 lines. Full y-protocols sync (MESSAGE_SYNC/MESSAGE_AWARENESS), in-memory doc cache, awareness forwarding, JWT validation on upgrade, dual WebSocket dispatcher |
| `apps/api/src/presence/presence.service.ts` | Redis-backed presence tracking | ✓ VERIFIED | 40 lines. setOnline (HSET+EXPIRE 10), setOffline (HDEL), getOnlineUsers (HGETALL), refreshHeartbeat (EXPIRE 10) |
| `apps/api/src/presence/presence.module.ts` | NestJS module for presence | ✓ VERIFIED | 8 lines. Provides and exports PresenceService |
| `apps/api/src/websocket/board.gateway.ts` | Socket.io gateway with presence handlers | ✓ VERIFIED | 157 lines. @SubscribeMessage for presence:cursor, presence:heartbeat; handleJoinBoard with setOnline + broadcast + initial users; handleDisconnect with setOffline + broadcast leave |
| `apps/web/src/components/editor/CollaborativeEditor.tsx` | TipTap editor with Yjs CRDT sync | ✓ VERIFIED | 77 lines. StarterKit (history:false), Collaboration (field:'description'), CollaborationCursor (provider+user), Placeholder, Link. Renders ReconnectBanner + FloatingToolbar + EditorContent |
| `apps/web/src/components/editor/FloatingToolbar.tsx` | Notion-style floating format toolbar | ✓ VERIFIED | 96 lines. BubbleMenu with 5 buttons: Bold, Italic, Strikethrough, Code, Link. Correct aria-labels per UI-SPEC. Active state uses accent color |
| `apps/web/src/components/editor/CoEditorAvatars.tsx` | Avatar strip in modal header | ✓ VERIFIED | 41 lines. Max 3 visible + overflow pill. AnimatePresence with scale animation. Returns null when empty |
| `apps/web/src/components/editor/ReconnectBanner.tsx` | Connection status banner above editor | ✓ VERIFIED | 53 lines. Shows "Reconnecting..." (yellow) or "Connection lost" (red) with "Copy content" button for failed state. AnimatePresence slide-down |
| `apps/web/src/hooks/useYjsProvider.ts` | Yjs WebSocket provider lifecycle hook | ✓ VERIFIED | 104 lines. Creates Y.Doc + WebsocketProvider, sets awareness, tracks status with 6-attempt failure threshold, tracks coEditors from awareness, destroys on unmount |
| `apps/web/src/stores/presence.store.ts` | Zustand store for ephemeral presence | ✓ VERIFIED | 48 lines. onlineUsers + cursorPositions (Record). setOnlineUsers, addOnlineUser, removeOnlineUser, updateCursor, removeCursor |
| `apps/web/src/components/presence/CursorOverlay.tsx` | Board-level cursor rendering layer | ✓ VERIFIED | 51 lines. absolute inset-0 pointer-events-none z-40. Filters out own user. Maps to RemoteCursor with AnimatePresence |
| `apps/web/src/components/presence/RemoteCursor.tsx` | Single remote cursor with glow + breathe | ✓ VERIFIED | 108 lines. 16×20 SVG arrow, name pill, glow drop-shadow, idle breathe after 3s, reduced motion support, exit animation via motion.div |
| `apps/web/src/components/presence/OnlineUsers.tsx` | Avatar strip in board header | ✓ VERIFIED | 83 lines. Max 5 visible + overflow pill. motion.div with layout prop, spring join/leave, reduced motion support. aria-label with user count |
| `apps/web/src/components/presence/UserAvatar.tsx` | Reusable colored circle avatar | ✓ VERIFIED | 36 lines. sm (24px) / md (32px) sizes. Initials extraction. Color fill + --bg-base border. aria-label |
| `apps/web/src/hooks/usePresence.ts` | Cursor emission + heartbeat | ✓ VERIFIED | 53 lines. 50ms timestamp throttle on mousemove, coordinates relative to board canvas, 5s heartbeat interval |
| `apps/web/src/hooks/useBoardSocket.ts` | Socket.io presence event handlers | ✓ VERIFIED | 238 lines. Handlers for presence:users, presence:join, presence:leave, presence:cursor updating Zustand store. Cleanup on unmount |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ws-events.types.ts` | `presence.types.ts` | `import type` | ✓ WIRED | Line 10-14: imports PresenceCursorPayload, PresenceJoinPayload, PresenceLeavePayload |
| `yjs.setup.ts` | `yjs-persistence.ts` | `setupWSConnection` calls | ✓ WIRED | Line 11-14: imports bindState, writeState, setupDebouncedPersistence; called in setupWSConnection function |
| `yjs-persistence.ts` | `prisma.service.ts` | `prisma.card.update/findUnique` | ✓ WIRED | bindState: prisma.card.findUnique (line 77); writeState: prisma.card.update (line 126) |
| `CardDetailModal.tsx` | `CollaborativeEditor.tsx` | `<CollaborativeEditor>` replaces textarea | ✓ WIRED | Line 7: import; Line 165: renders `<CollaborativeEditor cardId={card.id} ...>`. No textarea remains |
| `useYjsProvider.ts` | y-websocket server | `WebsocketProvider` to `/yjs/card:{cardId}` | ✓ WIRED | Line 37: `new WebsocketProvider(wsUrl, 'card:${cardId}', ydoc, { params: { token } })` |
| `useBoardSocket.ts` | `presence.store.ts` | Socket.io events → Zustand | ✓ WIRED | Lines 70-76: destructures store actions; Lines 78-97: handlers update store; Lines 99-102: socket.on listeners registered |
| `board.gateway.ts` | `presence.service.ts` | gateway calls presenceService | ✓ WIRED | Line 25: constructor injection; Lines 46, 71, 91, 129: calls setOnline, getOnlineUsers, setOffline, refreshHeartbeat |
| `BoardCanvas.tsx` | `CursorOverlay.tsx` | CursorOverlay rendered as sibling | ✓ WIRED | Line 9: import; Line 104: `<CursorOverlay boardRef={boardRef} />` rendered inside board container |
| `BoardHeader.tsx` | `OnlineUsers.tsx` | OnlineUsers in header | ✓ WIRED | Line 2: import; Line 15: `<OnlineUsers />` rendered left of `<ConnectionStatus />` |
| `app.module.ts` | `CollabModule` + `PresenceModule` | Module imports | ✓ WIRED | Lines 11-12: imports; Lines 25-26: in imports array |
| `websocket.module.ts` | `PresenceModule` | DI for BoardGateway | ✓ WIRED | Line 4: import; Line 7: in imports array |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `OnlineUsers.tsx` | `onlineUsers` | `usePresenceStore` → from Socket.io `presence:users/join/leave` | Server sends via `presenceService.getOnlineUsers()` → Redis HGETALL → real data | ✓ FLOWING |
| `CursorOverlay.tsx` | `cursorPositions` | `usePresenceStore` → from Socket.io `presence:cursor` | Server relays from board.gateway.ts handleCursor → real mouse coordinates | ✓ FLOWING |
| `CollaborativeEditor.tsx` | `ydoc` | `useYjsProvider` → `WebsocketProvider` → y-websocket server | Server loads from `prisma.card.findUnique({ descriptionYjs })` → real DB data | ✓ FLOWING |
| `CoEditorAvatars.tsx` | `coEditors` | `useYjsProvider` → awareness protocol → remote user states | Provider awareness tracks real connected clients | ✓ FLOWING |
| `RemoteCursor.tsx` | `position` | from parent `CursorOverlay` → `cursorPositions` store | Real cursor coordinates from mousemove events | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles (API) | `cd apps/api && npx tsc --noEmit` | No errors | ✓ PASS |
| TypeScript compiles (Web) | `cd apps/web && npx tsc --noEmit` | No errors | ✓ PASS |
| Yjs persistence tests pass | `npx jest --testPathPatterns="collab\|presence"` | 15/15 passed | ✓ PASS |
| All commit hashes verified | `git cat-file -t` for 10 hashes | All FOUND | ✓ PASS |
| No textarea in CardDetailModal | `grep textarea CardDetailModal.tsx` | No matches | ✓ PASS |
| Shared types importable | grep for `@flowboard/shared` imports | Used in 7+ files across api and web | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COLLAB-01 | 03-02, 03-03 | Card description uses TipTap rich-text editor with Yjs CRDT sync | ✓ SATISFIED | CollaborativeEditor.tsx with TipTap + Collaboration extension; yjs.setup.ts with y-protocols sync |
| COLLAB-02 | 03-03, 03-05 | Two users editing same card see character-level sync | ✓ SATISFIED | Yjs CRDT sync via WebsocketProvider; y-protocols message forwarding in yjs.setup.ts |
| COLLAB-03 | 03-01, 03-03 | Each user's cursor/selection highlighted in assigned color with name label | ✓ SATISFIED | CollaborationCursor extension in CollaborativeEditor.tsx; .collaboration-cursor__caret and __label CSS styles |
| COLLAB-04 | 03-02, 03-05 | Yjs document state persists to descriptionYjs BYTEA on last-disconnect | ✓ SATISFIED | yjs.setup.ts close handler calls writeState when connections.size === 0; writeState writes Buffer.from(state) |
| COLLAB-05 | 03-02, 03-05 | Yjs document state persists on 30-second debounce during active editing | ✓ SATISFIED | setupDebouncedPersistence with DEBOUNCE_MS = 30_000; tested in yjs-persistence.spec.ts |
| COLLAB-06 | 03-02 | Plaintext fallback (descriptionText) updated on each persistence | ✓ SATISFIED | writeState extracts plaintext via extractPlaintext(fragment) and writes to descriptionText |
| PRES-01 | 03-04, 03-05 | Board header shows online user avatars with colored borders | ✓ SATISFIED | OnlineUsers.tsx in BoardHeader.tsx; UserAvatar with color fill + --bg-base border |
| PRES-02 | 03-04, 03-05 | User join/leave triggers avatar animation | ✓ SATISFIED | OnlineUsers.tsx uses motion.div with spring initial/animate/exit + layout prop |
| PRES-03 | 03-01, 03-04, 03-05 | Remote user cursors visible on board canvas with user color and name label | ✓ SATISFIED | RemoteCursor.tsx with 16×20 SVG arrow in user color + name pill; CursorOverlay.tsx in BoardCanvas.tsx |
| PRES-04 | 03-04, 03-05 | Cursor glow effect with idle breathe animation | ✓ SATISFIED | RemoteCursor.tsx: `filter: drop-shadow(0 0 8px ${color})`; .cursor-breathe keyframe (8px→14px→8px over 3s) applied after 3s idle |
| PRES-05 | 03-04 | Redis-backed heartbeats track who is online per board | ✓ SATISFIED | PresenceService: HSET with EXPIRE 10; refreshHeartbeat extends TTL; usePresence.ts emits heartbeat every 5s |
| PRES-06 | 03-01, 03-04 | Cursor position broadcast throttled appropriately | ✓ SATISFIED | usePresence.ts: 50ms timestamp-based throttle; board.gateway.ts broadcasts via broadcastToBoard excluding sender |

**Orphaned requirements:** None. All 12 phase requirements (COLLAB-01 through COLLAB-06, PRES-01 through PRES-06) are covered by at least one plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No anti-patterns found | — | — |

No TODO/FIXME/HACK/PLACEHOLDER comments, no empty implementations, no stub returns, no hardcoded empty data in any phase 3 artifact.

### Human Verification Required

All 5 roadmap success criteria are verified at the code level — the right components exist, are substantive, are wired together, and data flows through the connections. However, the real-time nature of this phase means several behaviors cannot be verified without a running server and two browser tabs.

### 1. Dual-Tab Collaborative Editing

**Test:** Start dev server (`pnpm dev`). Open two browser tabs to the same board. Click a card in both tabs. Type in Tab A's description editor.
**Expected:** Characters appear in real-time in Tab B's TipTap editor (character-level Yjs CRDT sync).
**Why human:** Requires running WebSocket server, y-websocket CRDT sync, and visual TipTap rendering across two sessions.

### 2. Board Canvas Cursors

**Test:** Move mouse over the board in Tab A.
**Expected:** Colored cursor arrow with name pill and glow effect appears on Tab B's board canvas. After 3s idle, glow breathe animation starts.
**Why human:** Requires Socket.io round-trip, canvas coordinate mapping, and visual animation quality verification.

### 3. Online User Avatars

**Test:** Open two tabs to the same board. Then close one tab.
**Expected:** Both tabs show avatar circles in header. Closing a tab triggers leave animation (scale out) on the remaining tab.
**Why human:** Visual spring physics animation quality and timing.

### 4. Yjs Persistence Round-Trip

**Test:** Edit a card description, close all tabs, wait a moment, reopen.
**Expected:** Content persists (loaded from PostgreSQL BYTEA column).
**Why human:** Requires full server lifecycle with PostgreSQL.

### 5. Reconnect Banner

**Test:** While editing a card, stop the API server briefly.
**Expected:** "Reconnecting..." banner appears above editor. Restart server → banner disappears.
**Why human:** Requires server restart and visual reconnection behavior.

### 6. Floating Toolbar

**Test:** Select text in the TipTap editor.
**Expected:** Floating toolbar appears above selection with Bold, Italic, Strikethrough, Code, Link buttons.
**Why human:** Visual positioning and interaction feedback.

### 7. Editor Collaboration Cursors

**Test:** Both tabs have the same card open. Place text cursor in different positions.
**Expected:** Each user sees the other's text cursor in their assigned color with name label in the editor.
**Why human:** Visual rendering of TipTap collaboration cursors.

### Gaps Summary

No code-level gaps found. All artifacts exist, are substantive (no stubs), are properly wired, and data flows through the connections. TypeScript compiles cleanly for both apps. All 15 unit tests pass.

The only outstanding items are runtime verification of real-time behaviors that require a running server + database + Redis + two browser sessions — which cannot be verified programmatically without starting services.

---

_Verified: 2026-04-12T19:30:22Z_
_Verifier: the agent (gsd-verifier)_
