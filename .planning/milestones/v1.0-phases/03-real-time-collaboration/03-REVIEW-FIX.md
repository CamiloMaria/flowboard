---
phase: 03-real-time-collaboration
fixed_at: 2026-04-12T19:56:20Z
review_path: .planning/phases/03-real-time-collaboration/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-12T19:56:20Z
**Source review:** .planning/phases/03-real-time-collaboration/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: `flushAllDirtyDocs` is fire-and-forget — dirty documents may be lost on shutdown

**Files modified:** `apps/api/src/collab/yjs-persistence.ts`, `apps/api/src/main.ts`
**Commit:** 70c9d66
**Applied fix:** Made `flushAllDirtyDocs()` async — collects all `writeState()` promises into an array and awaits `Promise.all()`. Updated `main.ts` shutdown handler to be async, await the flush, and call `process.exit(0)` after completion. This ensures all dirty Yjs documents are persisted to PostgreSQL before the process exits.

### CR-02: Incorrect `Buffer` to `Uint8Array` conversion in WebSocket message handler

**Files modified:** `apps/api/src/websocket/yjs.setup.ts`
**Commit:** 736c3e6
**Applied fix:** Changed `new Uint8Array(data.buffer)` to `new Uint8Array(data.buffer, data.byteOffset, data.byteLength)` for Buffer instances. This prevents reading adjacent pooled buffer data when Node.js Buffer shares its underlying ArrayBuffer with other Buffer instances.

### WR-01: No input validation on `presence:cursor` payload — arbitrary values broadcast to all clients

**Files modified:** `apps/api/src/websocket/board.gateway.ts`
**Commit:** dd0e903
**Applied fix:** Added type checking (`typeof` + `Number.isFinite()`) for `data.x` and `data.y` — rejects `NaN`, `Infinity`, non-number values. Added clamping to 0-10000 bounds to prevent extreme coordinate values from reaching clients. Combined with WR-02 in same commit since both fixes are in the same `handleCursor` method.

### WR-02: Missing `boardId` validation in `handleCursor` — user can broadcast cursors to any board room

**Files modified:** `apps/api/src/websocket/board.gateway.ts`
**Commit:** dd0e903
**Applied fix:** Added check that `data.boardId` matches `(client as any).boardId` (the board the user actually joined). Returns early if they don't match, preventing cross-board cursor injection. Combined with WR-01 in same commit since both fixes are in the same `handleCursor` method.

### WR-03: Link URL from `window.prompt` is set on the editor without sanitization

**Files modified:** `apps/web/src/components/editor/FloatingToolbar.tsx`
**Commit:** 2de347c
**Applied fix:** Wrapped URL setting in a `try/catch` with `new URL()` parsing. Only allows `http:` and `https:` protocols — rejects `javascript:`, `data:`, and other potentially dangerous URI schemes. Invalid URLs are silently ignored.

### WR-04: Module-level Maps in `yjs.setup.ts` never cleaned on module hot-reload or test

**Files modified:** `apps/api/src/websocket/yjs.setup.ts`
**Commit:** 1266566
**Applied fix:** Added exported `clearDocStore()` function that destroys all `Y.Doc` instances and clears the `docs`, `awarenessMap`, and `docConnections` Maps. Available for test teardown and NestJS HMR module dispose handlers.

### WR-05: `useYjsProvider` returns `ydocRef.current` synchronously, which may be `null` on first render

**Files modified:** `apps/web/src/hooks/useYjsProvider.ts`
**Commit:** ec3e0f2
**Applied fix:** Replaced `useRef<Y.Doc | null>` and `useRef<WebsocketProvider | null>` with `useState`. Setting `ydoc` and `provider` via `setYdoc`/`setProvider` inside `useEffect` now triggers a re-render, ensuring the `CollaborativeEditor` receives the initialized instances even on slow connections where the first status event is delayed.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-12T19:56:20Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
