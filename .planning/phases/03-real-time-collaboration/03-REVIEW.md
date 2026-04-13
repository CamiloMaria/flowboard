---
phase: 03-real-time-collaboration
reviewed: 2026-04-12T19:24:56Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - packages/shared/src/presence.types.ts
  - packages/shared/src/ws-events.types.ts
  - packages/shared/src/index.ts
  - apps/api/src/collab/yjs-persistence.ts
  - apps/api/src/collab/collab.service.ts
  - apps/api/src/collab/collab.module.ts
  - apps/api/src/collab/yjs-persistence.spec.ts
  - apps/api/src/websocket/yjs.setup.ts
  - apps/api/src/websocket/board.gateway.ts
  - apps/api/src/websocket/websocket.module.ts
  - apps/api/src/presence/presence.service.ts
  - apps/api/src/presence/presence.module.ts
  - apps/api/src/presence/presence.service.spec.ts
  - apps/api/src/app.module.ts
  - apps/api/src/main.ts
  - apps/web/src/hooks/useYjsProvider.ts
  - apps/web/src/hooks/usePresence.ts
  - apps/web/src/hooks/useBoardSocket.ts
  - apps/web/src/stores/presence.store.ts
  - apps/web/src/lib/user.ts
  - apps/web/src/components/editor/CollaborativeEditor.tsx
  - apps/web/src/components/editor/FloatingToolbar.tsx
  - apps/web/src/components/editor/ReconnectBanner.tsx
  - apps/web/src/components/editor/CoEditorAvatars.tsx
  - apps/web/src/components/presence/UserAvatar.tsx
  - apps/web/src/components/presence/CursorOverlay.tsx
  - apps/web/src/components/presence/RemoteCursor.tsx
  - apps/web/src/components/presence/OnlineUsers.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-12T19:24:56Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 03 implements the complete real-time collaboration stack: shared presence types, Yjs CRDT persistence with y-protocols wire protocol, TipTap collaborative editor, Redis-backed presence tracking, and Figma-style remote cursors. The architecture is solid — dual WebSocket upgrade dispatcher, types-first shared contracts, and clean separation between Socket.io (board events) and raw WebSocket (Yjs CRDT sync).

Key concerns: (1) The `flushAllDirtyDocs` shutdown handler is fire-and-forget async — the process may exit before writes complete, causing data loss. (2) The `yjs.setup.ts` `Buffer` conversion of incoming WebSocket messages has an incorrect offset when the data is a Node.js `Buffer` with a shared `ArrayBuffer`. (3) Missing input validation on `presence:cursor` payload allows arbitrary numbers through Socket.io to all clients. Several warnings around missing cleanup of module-level state and a URL injection surface in the link toolbar.

## Critical Issues

### CR-01: `flushAllDirtyDocs` is fire-and-forget — dirty documents may be lost on shutdown

**File:** `apps/api/src/collab/yjs-persistence.ts:183-195`
**Issue:** `flushAllDirtyDocs()` calls `writeState()` (which is async) with `.catch()` but does not await the promises. The shutdown handler in `main.ts:41-46` calls `flushAllDirtyDocs()` synchronously, then the process exits. Node.js SIGTERM/SIGINT handlers don't keep the event loop alive for dangling promises — dirty documents may never be persisted if there are multiple documents or the DB is slow to respond.
**Fix:**
```typescript
// yjs-persistence.ts — make flushAllDirtyDocs async and return a promise
export async function flushAllDirtyDocs(): Promise<void> {
  for (const [docName, timer] of debounceTimers.entries()) {
    clearTimeout(timer);
    debounceTimers.delete(docName);
  }

  const flushPromises: Promise<void>[] = [];
  for (const [docName, { ydoc, prisma }] of dirtyDocs.entries()) {
    flushPromises.push(
      writeState(docName, ydoc, prisma).catch((err) =>
        logger.error(`Failed to flush ${docName}: ${err}`),
      ),
    );
    dirtyDocs.delete(docName);
  }

  await Promise.all(flushPromises);
}

// main.ts — await the flush and delay exit
const shutdownHandler = async () => {
  new Logger('Bootstrap').log('Flushing dirty Yjs documents before shutdown...');
  await flushAllDirtyDocs();
  process.exit(0);
};
process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);
```

### CR-02: Incorrect `Buffer` to `Uint8Array` conversion in WebSocket message handler

**File:** `apps/api/src/websocket/yjs.setup.ts:121`
**Issue:** When `data` is a Node.js `Buffer`, the code does `new Uint8Array(data.buffer)`. A Node.js `Buffer` may share its underlying `ArrayBuffer` with other `Buffer` instances (due to Buffer pooling). Using `data.buffer` directly gives access to the entire pooled `ArrayBuffer`, not just the slice belonging to this `Buffer`. This means `decoding.createDecoder` may read bytes from adjacent buffers, causing corrupt/misinterpreted messages.
**Fix:**
```typescript
ws.on('message', (data: ArrayBuffer | Buffer) => {
  try {
    const message = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const decoder = decoding.createDecoder(message);
```

## Warnings

### WR-01: No input validation on `presence:cursor` payload — arbitrary values broadcast to all clients

**File:** `apps/api/src/websocket/board.gateway.ts:100-121`
**Issue:** The `handleCursor` method trusts `data.x` and `data.y` from the client without validation. A malicious client could send `NaN`, `Infinity`, negative numbers, or extremely large values. These get broadcast to all other clients in the room, which could cause rendering issues (cursors flying offscreen, NaN propagation in motion/react transitions).
**Fix:**
```typescript
@SubscribeMessage('presence:cursor')
handleCursor(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { x: number; y: number; boardId: string },
): void {
  const user = client.data.user;
  if (!user) return;

  // Validate cursor coordinates
  if (typeof data.x !== 'number' || typeof data.y !== 'number'
    || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
    return;
  }

  // Clamp to reasonable bounds (e.g., 0-10000)
  const x = Math.max(0, Math.min(10000, data.x));
  const y = Math.max(0, Math.min(10000, data.y));

  this.broadcastToBoard(
    data.boardId,
    'presence:cursor',
    { userId: user.sub, name: user.name ?? 'Anonymous', color: user.color ?? '#22D3EE', x, y, boardId: data.boardId },
    client.id,
  );
}
```

### WR-02: Missing `boardId` validation in `handleCursor` — user can broadcast cursors to any board room

**File:** `apps/api/src/websocket/board.gateway.ts:100-121`
**Issue:** `handleCursor` accepts any `boardId` from the client payload and broadcasts to that room, but never checks if the user actually joined that board. A client that joined `board:A` can send cursor events to `board:B`'s room by setting `data.boardId = B`. The `handleJoinBoard` stores the boardId on the socket (`(client as any).boardId`), but `handleCursor` ignores it and trusts `data.boardId`.
**Fix:**
```typescript
@SubscribeMessage('presence:cursor')
handleCursor(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { x: number; y: number; boardId: string },
): void {
  const user = client.data.user;
  if (!user) return;

  // Only allow cursor events for the board the user joined
  const joinedBoardId = (client as any).boardId;
  if (data.boardId !== joinedBoardId) return;

  // ... rest of broadcast
}
```

### WR-03: Link URL from `window.prompt` is set on the editor without sanitization

**File:** `apps/web/src/components/editor/FloatingToolbar.tsx:82-84`
**Issue:** The URL entered via `window.prompt` is passed directly to `editor.chain().focus().setLink({ href: url })`. While TipTap's Link extension has some built-in protocol checking, if `openOnClick` were ever enabled (or the user inspects HTML), a `javascript:` URI could execute arbitrary code. The current config has `openOnClick: false`, which mitigates this, but the unvalidated URL is still stored in the document CRDT and shared with all collaborators.
**Fix:**
```typescript
const url = window.prompt('Enter URL:');
if (url) {
  // Only allow http/https URLs
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      editor.chain().focus().setLink({ href: url }).run();
    }
  } catch {
    // Invalid URL — ignore
  }
}
```

### WR-04: Module-level Maps in `yjs.setup.ts` never cleaned on module hot-reload or test

**File:** `apps/api/src/websocket/yjs.setup.ts:24-26`
**Issue:** `docs`, `awarenessMap`, and `docConnections` are module-level `Map` instances. In NestJS dev mode with HMR, or in tests, these Maps persist across module reloads, potentially holding stale `Y.Doc` instances. This can cause subtle bugs where old document state leaks into new connections. Consider exposing a cleanup function or moving to NestJS-managed lifecycle.
**Fix:**
```typescript
// Add a cleanup function for testing and HMR
export function clearDocStore(): void {
  for (const [, doc] of docs) doc.destroy();
  docs.clear();
  awarenessMap.clear();
  docConnections.clear();
}
```

### WR-05: `useYjsProvider` returns `ydocRef.current` synchronously, which may be `null` on first render

**File:** `apps/web/src/hooks/useYjsProvider.ts:98-103`
**Issue:** The hook returns `ydocRef.current` and `providerRef.current`. On the initial render, the `useEffect` hasn't fired yet, so these are `null`. The `CollaborativeEditor` handles this via conditional extension arrays (`ydoc ? [...] : []`), but there's a timing issue: when the effect fires and populates `ydocRef.current`, there's no state update to trigger a re-render — the component only re-renders when `status` or `coEditors` changes. On a fast connection where the first `status` event fires immediately, this works. On a slow connection, the editor may render without the Collaboration extension and never recover.
**Fix:**
```typescript
// Add ydoc/provider as state (not just refs) to trigger re-render
const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
const [provider, setProvider] = useState<WebsocketProvider | null>(null);

useEffect(() => {
  const doc = new Y.Doc();
  // ...setup...
  setYdoc(doc);
  setProvider(prov);

  return () => {
    prov.destroy();
    doc.destroy();
    setYdoc(null);
    setProvider(null);
  };
}, [cardId, user.name, user.color]);

return { ydoc, provider, status, coEditors };
```

## Info

### IN-01: `(client as any).boardId` and `(client as any).user` — type-unsafe socket properties

**File:** `apps/api/src/websocket/board.gateway.ts:39,43,85,89,127`
**Issue:** Multiple places cast `client as any` to attach `boardId` and `user` properties. This is fragile — a typo in the property name would silently fail. Consider defining a typed Socket interface.
**Fix:**
```typescript
interface BoardSocket extends Socket {
  boardId?: string;
  user?: { sub: string; name?: string; color?: string; role?: string };
}
```

### IN-02: `getCurrentUser()` is called on every `CursorOverlay` render

**File:** `apps/web/src/components/presence/CursorOverlay.tsx:21`
**Issue:** `getCurrentUser()` parses the JWT on every render (it calls `atob` + `JSON.parse` each time). Since `CursorOverlay` re-renders on every cursor move (high frequency), this adds unnecessary parsing. Consider memoizing or lifting the user out.
**Fix:** Move `getCurrentUser()` to a parent component and pass `currentUserId` as a prop, or memoize with `useMemo`.

### IN-03: Presence heartbeat refreshes the entire board key TTL, not the individual user

**File:** `apps/api/src/presence/presence.service.ts:36-39`
**Issue:** `refreshHeartbeat` calls `redis.expire(key, 10)` on the entire `presence:board:{boardId}` hash. This extends the TTL for ALL users in the board, not just the heartbeating user. If User A disconnects without cleanup (crash/network drop) but User B keeps heartbeating, User A's presence entry never expires because User B's heartbeats keep refreshing the whole key. The stale entry persists until User B also leaves.
**Fix:** Consider using per-user keys (`presence:board:{boardId}:user:{userId}`) with individual TTLs, or use Redis HEXPIRE (Redis 7.4+) for per-field expiry, or implement server-side cleanup of stale users based on `lastSeen` timestamps.

### IN-04: `docName` extracted from URL without percent-decoding

**File:** `apps/api/src/websocket/yjs.setup.ts:212`
**Issue:** `req.url?.replace('/yjs/', '').split('?')[0]` extracts the docName from the URL path. If the client sends a percent-encoded docName (e.g., `card%3Aabc`), it won't match the expected `card:uuid` format. While `WebsocketProvider` from y-websocket probably sends the name unencoded, this is a minor robustness issue.
**Fix:** Add `decodeURIComponent()`:
```typescript
const raw = req.url?.replace('/yjs/', '').split('?')[0] || 'default';
const docName = decodeURIComponent(raw);
```

---

_Reviewed: 2026-04-12T19:24:56Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
