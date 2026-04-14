# Phase 3: Real-time Collaboration - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Multiple users can simultaneously edit card descriptions with character-level sync via TipTap + Yjs CRDT, see each other's cursors on the board canvas in real-time, and know who's online via avatar presence in the board header. Covers: Yjs collaborative editing (TipTap integration, y-websocket sync, BYTEA persistence), cursor presence system (Redis heartbeats, board-level mouse tracking, cursor glow effects), and online user display (avatars, join/leave animations). Demo mode bots and polish animations are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### TipTap Editor Scope
- **D-01:** Minimal formatting only: bold, italic, strikethrough, bullet/ordered lists, code inline. No visible toolbar. Formatting via keyboard shortcuts (Cmd+B, etc.) and markdown shortcuts (`**` for bold). Clean look like Linear's editor. Keeps focus on the CRDT sync demo, not editor features.
- **D-02:** Agent's discretion on whether to include a floating toolbar on text selection (Notion-style pop-up with bold/italic/strikethrough/code/link). May add discoverability without cluttering the default view.
- **D-03:** Placeholder text when description is empty: "Add a description..."
- **D-04:** TipTap StarterKit with `history: false` (Yjs handles undo/redo). `@tiptap/extension-collaboration` binds to Y.Doc. `@tiptap/extension-collaboration-cursor` shows remote cursors with user color and name label inside the editor.

### Board Cursor Behavior
- **D-05:** Full mouse tracking across the entire board canvas. Figma-style multiplayer cursors. Remote user cursor positions broadcast via Socket.io, throttled at ~50ms per the architecture doc. This is the primary visual "wow" for recruiters.
- **D-06:** Cursor visual: small arrow SVG in user's color with a rounded pill label showing their name, offset below-right of the arrow. Classic Figma style. Cursor glow via CSS drop-shadow in user color (PRES-04).
- **D-07:** Idle breathe animation: drop-shadow in user color subtly pulses (opacity 0.4 to 0.7 to 0.4) on a ~2-second cycle when cursor is stationary for 3+ seconds. Stops pulsing on movement.
- **D-08:** Cursor exit animation: ghost fade out over 400ms, glow lingers for 600ms after (per PLSH-04 spec). Clean exit that feels intentional, not abrupt.

### Online Users & Presence Display
- **D-09:** Colored initials circle avatars. 32-36px diameter, filled with user's assigned color from palette. Single initial (first letter of name) or two initials. Stacked with slight overlap (-8px margin). Color matches their cursor for instant visual connection.
- **D-10:** 5 visible avatars max, then a "+N" overflow circle for additional users.
- **D-11:** Join animation: avatar scales from 0 to 1.0 with spring easing and fades in simultaneously (200-300ms). Leave animation: reverse (scale 1.0 to 0 + fade out). Avatar stack re-adjusts smoothly via motion layout animation.
- **D-12:** Agent's discretion on avatar strip position relative to ConnectionStatus in the board header. Options: right side before ConnectionStatus, or replace ConnectionStatus entirely (avatars being visible IS the connection indicator).

### Collaborative Editing Lifecycle
- **D-13:** Yjs WebSocket connection opens when card detail modal opens. Creates a `WebsocketProvider` for room `card:{cardId}`. Connection closes when modal closes. One Y.Doc per card, lifecycle tied to the modal. Clean resource management.
- **D-14:** Card modal shows small colored initial avatars in the modal header for users who have the same card open. Reinforces the "live collaboration" feel. Appears next to the card title area.
- **D-15:** Server-side Yjs migration for Phase 2 data: when y-websocket `bindState` loads a card with null `descriptionYjs` but non-null `descriptionText`, create a new Y.Doc, insert the plaintext into the Y.XmlFragment, and serve that as the initial state. One-time migration per card, transparent to the user.
- **D-16:** On y-websocket disconnection mid-edit: show a subtle "Reconnecting..." banner above the editor. User can keep typing — Yjs buffers changes locally. On reconnect, Yjs automatically merges divergent edits. If reconnection fails after N attempts, show "Connection lost" with option to copy content.

### Yjs Persistence (from architecture doc — locked)
- **D-17:** Persist Yjs state to `description_yjs` BYTEA column on last-user-disconnect via `setPersistence()` `writeState` callback.
- **D-18:** Debounced persistence every 30 seconds during active editing (COLLAB-05). Use `doc.on('update')` with debounce.
- **D-19:** Update `description_text` plaintext fallback on each persistence (COLLAB-06) for search/display contexts.

### Presence Infrastructure (from architecture doc — locked)
- **D-20:** Redis `HSET presence:board:{boardId} {userId} {JSON}` for online user tracking. TTL-based expiry (10s) with 5s heartbeat refresh.
- **D-21:** Cursor positions broadcast via Socket.io (not Redis). Board gateway receives `presence:cursor` events, broadcasts to room excluding sender. 50ms throttle on client-side emission.
- **D-22:** `presence:join` emitted on `board:join`, `presence:leave` emitted on `handleDisconnect`. Redis `HDEL` for immediate cleanup on disconnect.

### Agent's Discretion
- Floating toolbar on text selection (D-02)
- Avatar strip header layout relative to ConnectionStatus (D-12)
- Exact idle breathe animation timing and easing curve
- Cursor throttle implementation (requestAnimationFrame vs. lodash throttle)
- NestJS module boundaries for presence (PresenceModule standalone vs. extending WebSocketModule)
- Error retry count for y-websocket reconnection before showing "Connection lost"
- TipTap extension list beyond StarterKit (e.g., Placeholder extension)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Data Flow
- `.planning/research/ARCHITECTURE.md` -- Flow 2 (Collaborative Card Description Editing), Flow 3 (Presence/Cursors/Online Users), Yjs Document Persistence section, Redis Presence Schema, NestJS Module Structure (collab/ and presence/ directories)
- `design-doc.md` -- Dual WebSocket architecture, CRDT scope (Yjs for card descriptions only), optimistic update failure modes

### Design System
- `DESIGN.md` -- Cursor colors section (user color palette), dark theme constraints, component patterns, animation specs

### Stack & Versions
- `.planning/research/STACK.md` -- Verified versions: yjs 13.6.30, y-websocket 3.0.0 (major version jump from v2), @tiptap/react 3.22.3, @tiptap/extension-collaboration 3.22.3, @tiptap/extension-collaboration-cursor 3.22.3, ioredis 5.10.1, @socket.io/redis-adapter 8.3.0

### Pitfalls
- `.planning/research/PITFALLS.md` -- Pitfall #2 (CRITICAL: Yjs data loss on last-disconnect persistence), Pitfall #7 (HIGH: Redis heartbeat timing — two-tier approach), Pitfall #10 (Yjs document size growth — gc:true), Pitfall #14 (TipTap + Yjs cursor position jank)

### Phase Dependencies
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` -- D-08/D-09 (dual WebSocket pattern), D-14 (BYTEA column), D-11/D-12/D-13 (guest JWT with name/color/role)
- `.planning/phases/02-board-core/02-CONTEXT.md` -- D-07 (textarea → TipTap swap, modal layout stays), D-13/D-14 (Socket.io per-board rooms, full entity in events)

### Requirements
- `.planning/REQUIREMENTS.md` -- COLLAB-01 through COLLAB-06 (collaborative editing), PRES-01 through PRES-06 (presence system)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **y-websocket server:** `apps/api/src/websocket/yjs.setup.ts` — upgrade routing and JWT auth complete. Phase 3 placeholder at line 25: "y-websocket setupWSConnection will be wired here in Phase 3"
- **Board gateway:** `apps/api/src/websocket/board.gateway.ts` — room management (`board:join`/`board:leave`), `broadcastToBoard()` helper, auth middleware already injecting `socket.data.user` with name/color/role
- **Card detail modal:** `apps/web/src/components/board/CardDetailModal.tsx` — textarea at line 160 is the swap target for TipTap. Modal structure, title editing, animations all in place
- **Socket.io client singleton:** `apps/web/src/lib/socket.ts` — `connectSocket()` with JWT auth, reconnect config. `getAccessToken()` available for y-websocket URL
- **Board socket hook:** `apps/web/src/hooks/useBoardSocket.ts` — established pattern for adding event listeners and updating TanStack Query cache
- **Redis service:** `apps/api/src/redis/redis.service.ts` — extends ioredis.Redis directly, all commands available (HSET, HDEL, SETEX, EXPIRE, HGETALL). Global module, injectable anywhere
- **WS event names:** `packages/shared/src/ws-events.types.ts` — `presence:cursor`, `presence:join`, `presence:leave` already in WsEventType union (payloads TBD)
- **Color palette:** `packages/shared/src/colors.ts` — USER_COLORS (5), BOT_COLORS (3), GUEST_COLORS for cursor and avatar rendering
- **Vite proxy:** `apps/web/vite.config.ts` — `/yjs` proxy already configured with `ws: true`
- **Prisma schema:** `descriptionYjs Bytes?` column already exists in Card model

### Established Patterns
- Socket.io events carry full entity, update TanStack Query cache via `queryClient.setQueryData` (no refetch)
- Per-board rooms via `board:join` — presence events will use the same room infrastructure
- X-Socket-Id header for broadcast exclusion (prevent optimistic + broadcast duplication)
- Zustand for UI-only state, TanStack Query for server state
- motion.div with layout + spring for animated transitions (already used in card reorder)

### Integration Points
- **Modal:** Replace `<textarea>` in `CardDetailModal.tsx` with TipTap `<EditorContent>`
- **Board gateway:** Add `@SubscribeMessage('presence:cursor')` handler, inject PresenceService
- **Board gateway:** Add presence:join/leave emissions in existing `board:join` and `handleDisconnect`
- **Board header:** Add `<OnlineUsers>` component alongside/replacing `<ConnectionStatus>`
- **Board page:** Add `<CursorOverlay>` layer on the board canvas for remote cursor rendering
- **Shared types:** Add presence payload interfaces to `board.types.ts`, map in `WsEventMap`
- **useBoardSocket:** Add listeners for `presence:join`, `presence:leave`, `presence:cursor`
- **Zustand store:** Add presence state (online users, cursor positions) — new store or extend existing

</code_context>

<specifics>
## Specific Ideas

- Board-level cursors should feel like Figma's multiplayer — the arrow + name pill pattern is the gold standard. This is the #1 visual signal of real-time collaboration for the recruiter demo.
- The TipTap editor should be minimal and clean like Linear's — the focus is on the CRDT sync demo, not rich text features. A recruiter opening two tabs and seeing character-level sync is the wow moment.
- Ghost fade on cursor exit (400ms fade, 600ms glow linger) should feel intentional and polished, not like a rendering glitch.
- The co-editor avatars in the card modal header create a "someone else is here" moment that reinforces collaboration even before the user sees the remote cursor in the editor.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-real-time-collaboration*
*Context gathered: 2026-04-12*
