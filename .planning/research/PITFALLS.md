# Domain Pitfalls

**Project:** FlowBoard — Real-time Collaborative Kanban Board
**Domain:** Real-time collaborative web application (WebSockets, CRDTs, drag-and-drop)
**Researched:** 2026-04-11
**Overall Confidence:** HIGH (Context7 + official docs for all critical claims)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or the demo failing in front of a recruiter.

---

### Pitfall 1: Socket.io + y-websocket HTTP Upgrade Handler Collision

**What goes wrong:** Both Socket.io and y-websocket (which uses the `ws` library) attach their own `upgrade` listeners to the HTTP server. Node.js HTTP servers only support one `upgrade` handler by default. If both libraries try to handle the same `upgrade` event, one silently swallows the other's connections — typically y-websocket connections never establish, or Socket.io falls back to HTTP long-polling permanently.

**Severity:** CRITICAL

**Why it happens:** Socket.io's Engine.IO layer and the `ws` WebSocket.Server both call `server.on('upgrade', ...)`. The first listener registered gets priority. Socket.io's `handleUpgrade` will reject upgrade requests not matching its path, but by that point the `ws` server never sees the request.

**Warning signs:**
- y-websocket clients connect but never fire the `sync` event
- Socket.io logs show `transport: "polling"` instead of `"websocket"`
- Collaborative editing works in one browser tab but not across tabs/browsers
- Console shows `WebSocket connection to 'ws://...' failed` for one of the two paths

**Prevention strategy:**
1. Create the HTTP server manually (`http.createServer()`)
2. Remove all default upgrade listeners: `httpServer.removeAllListeners('upgrade')`
3. Add a single upgrade dispatcher that routes by URL path:
   - `/socket.io/*` → `io.engine.handleUpgrade(req, socket, head)`
   - `/yjs/*` → `wss.handleUpgrade(req, socket, head, cb)`
   - All other paths → `socket.destroy()`

This pattern is documented in the official Socket.io Server API docs (verified via Context7, HIGH confidence):

```javascript
httpServer.removeAllListeners("upgrade");
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/socket.io/")) {
    io.engine.handleUpgrade(req, socket, head);
  } else if (req.url.startsWith("/yjs/")) {
    yjsWss.handleUpgrade(req, socket, head, (ws) => {
      yjsWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});
```

4. **NestJS complication:** NestJS's `@nestjs/platform-socket.io` adapter creates the HTTP server internally. You must get the underlying HTTP server via `app.getHttpServer()` and wire the upgrade dispatcher **after** NestJS initializes but **before** calling `app.listen()`. Test this in the very first phase.

**Detection:** Write an integration test that opens both a Socket.io and y-websocket connection simultaneously. If either fails to connect within 2 seconds, the upgrade handler is misconfigured.

**Phase relevance:** Phase 2 (Dual WebSocket Integration) — this is the #1 blocker. Get this working before anything else.

**Confidence:** HIGH — verified against Socket.io official docs via Context7, plus NestJS custom adapter documentation.

---

### Pitfall 2: Yjs Document Data Loss on Last-Disconnect Persistence

**What goes wrong:** The project plans to persist Yjs state "on last-disconnect + 30s debounce." If the server crashes, the last user disconnects during a debounce window, or the server restarts between disconnect and flush, all edits since the last persist are **permanently lost**. Yjs updates are binary-encoded and append-only — there's no way to recover unflushed state.

**Severity:** CRITICAL

**Why it happens:** The y-websocket server keeps the Yjs doc in memory. Persistence callbacks run asynchronously. The "last disconnect" event fires, a 30-second timer starts, and if the process dies before the timer fires, those bytes never reach the database. On Railway, deploys trigger process restarts.

**Warning signs:**
- Users report "my edits disappeared" after a deploy
- Card descriptions revert to older versions intermittently
- Database BYTEA column contains stale data compared to what users see in-browser

**Prevention strategy:**
1. **Persist on every update, debounced to 2-5 seconds** — not just on disconnect. Use `ydoc.on('update', debounced(persist, 2000))` as the primary persistence mechanism.
2. **Also persist on disconnect** as a safety flush (no debounce — immediate).
3. **Also persist on `SIGTERM`/`SIGINT`** — Railway sends SIGTERM before killing the process. Flush all dirty docs synchronously.
4. **Merge updates before storing:** Use `Y.mergeUpdates()` to compact the binary state before writing to the BYTEA column. This prevents the stored state from growing unboundedly (verified via Context7: Yjs update merging is commutative, associative, idempotent).
5. **Test the crash scenario:** Kill the server mid-edit, restart, verify state survived.

**Detection:** Log every persist operation with a timestamp. If the gap between last-edit-timestamp and last-persist-timestamp exceeds 5 seconds, the debounce is too aggressive.

**Phase relevance:** Phase 6 (Yjs Collaborative Editing) — must be designed correctly from day one. Retrofitting persistence is painful because the binary encoding is opaque.

**Confidence:** HIGH — Yjs persistence patterns verified via Context7 docs; y-websocket LevelDB persistence and state encoding confirmed.

---

### Pitfall 3: @dnd-kit State Desync with Real-Time Server Updates

**What goes wrong:** While User A is mid-drag, User B moves a card via Socket.io. The server broadcasts the new card order. The React state updates, @dnd-kit's internal DOM position tracking diverges from React's virtual DOM, and the drag either: (a) snaps the card to the wrong position, (b) creates a visual "jump" where the dragged card teleports, or (c) the drop commits an incorrect position because the indices shifted underneath the active drag.

**Severity:** CRITICAL

**Why it happens:** @dnd-kit's `OptimisticSortingPlugin` physically moves DOM elements during drag without triggering React re-renders. When an external state update (from Socket.io) causes React to re-render the list, the DOM mutations conflict. The `index` the drag started with no longer matches the `index` after the remote update.

**Warning signs:**
- Cards "jump" or "flash" during drag when another user is active
- Dropped card ends up in the wrong position (off by one or more)
- Console warnings about React DOM mismatch or state update during render
- Works fine single-user, breaks only with concurrent edits

**Prevention strategy:**
1. **Lock the list during active drag:** When a drag starts (`onDragStart`), set a `isDragging` ref. While `isDragging` is true, **queue** incoming Socket.io card-order updates instead of applying them. On `onDragEnd`, flush the queue.
2. **Use a snapshot/rollback pattern:** Capture the board state on `onDragStart`. If the drag is canceled (verified via `event.canceled` in onDragEnd — confirmed in Context7 dnd-kit docs), restore from snapshot.
3. **Separate visual order from data order:** Keep the drag overlay (the visual card being dragged) as a `DragOverlay` component, separate from the list items. This prevents the dragged card from being affected by list re-renders.
4. **Debounce position broadcasts:** Don't broadcast card positions on every `onDragOver` — only broadcast the final position on `onDragEnd`.
5. **Consider disabling `OptimisticSortingPlugin`** and managing all DOM updates through React state, which gives full control over when re-renders happen (Context7 confirms this is a supported configuration).

**Detection:** Run two browser windows side-by-side. Have both drag cards simultaneously. If either window shows a card in a position different from what the server reports, there's a desync.

**Phase relevance:** Phase 8 (Drag-and-Drop) — this is the hardest frontend problem. Plan for 2-3x the time estimate.

**Confidence:** HIGH — @dnd-kit OptimisticSortingPlugin behavior verified via Context7; the concurrent update problem is inherent to the architecture.

---

### Pitfall 4: Fractional Indexing FLOAT Precision Collapse

**What goes wrong:** Using `FLOAT` (IEEE 754 double) for card positions works for the first ~50-100 insertions between two adjacent cards. After that, the midpoint between two positions becomes indistinguishable from one of them due to floating-point precision limits. Cards then sort incorrectly — two cards with "different" positions compare as equal.

**Severity:** CRITICAL

**Why it happens:** IEEE 754 doubles have 52 bits of mantissa (~15-17 significant decimal digits). Repeatedly halving the gap between two positions (e.g., inserting between 1.0 and 2.0 gives 1.5, then 1.25, 1.125...) exhausts precision after ~52 halvings in the worst case, but much sooner if positions aren't powers of 2. In practice, with typical board usage patterns (frequent insert-at-top or insert-between-same-two-cards), precision fails after 30-50 dense insertions.

**Warning signs:**
- Cards reorder themselves seemingly randomly
- `ORDER BY position ASC` returns cards in wrong order
- Two cards have identical `position` values in the database when they shouldn't
- The demo bot's repeated card moves cause ordering issues after running for several minutes

**Prevention strategy:**
1. **Rebalancing trigger:** After any insert, check if `Math.abs(newPosition - neighborPosition) < 1e-10`. If true, trigger a rebalance.
2. **Rebalance algorithm:** Assign evenly-spaced positions to all cards in the list: `position = (index + 1) * 1000`. Use a gap of 1000 (not 1) to give room for future insertions.
3. **Rebalance scope:** Only rebalance the affected list, not the entire board. Wrap in a database transaction.
4. **Broadcast after rebalance:** The rebalance changes multiple card positions — broadcast all updated positions to all clients in one batch event.
5. **Bot-specific guard:** The demo bots move cards in loops. Add a counter: if a bot has done >20 moves in the same list without a rebalance, force one.
6. **Alternative consideration:** The project decision says "rebalancing after 50 dense insertions." Change this to a gap-check trigger instead of a count trigger — it's more robust because the count doesn't account for WHERE the insertions happen.

**Detection:** Add a database constraint: `UNIQUE(list_id, position)` — this will catch precision collisions immediately as constraint violations instead of silent sorting bugs.

**Phase relevance:** Phase 8 (Drag-and-Drop) — implement fractional indexing with the rebalance from the start. Don't bolt it on later.

**Confidence:** HIGH — IEEE 754 precision limits are mathematical fact; the rebalancing pattern is well-established in production Kanban apps (Trello, Linear use similar approaches).

---

## High Pitfalls

Mistakes that cause significant debugging time or degraded user experience.

---

### Pitfall 5: NestJS WebSocket Gateway vs Manual Upgrade Handler Conflict

**What goes wrong:** NestJS's `@WebSocketGateway()` decorator auto-creates a Socket.io server and attaches it to the HTTP server. If you also manually create a `ws.Server` for y-websocket, NestJS's internal wiring and your manual setup fight over the upgrade handler. The gateway may silently override your manual dispatcher on hot-reload during development.

**Severity:** HIGH

**Why it happens:** NestJS's `IoAdapter` (the default Socket.io adapter, verified via Context7) calls `createIOServer()` internally, which binds to the HTTP server. The gateway decorator triggers this during module initialization. If you've already set up a manual upgrade dispatcher, NestJS replaces it.

**Warning signs:**
- Works after a full restart but breaks on NestJS hot-reload (HMR)
- Socket.io connects fine but y-websocket stops working after a code change
- Multiple `upgrade` listeners on the HTTP server (check with `httpServer.listeners('upgrade').length`)

**Prevention strategy:**
1. **Create a custom NestJS WebSocket adapter** that extends `IoAdapter` and overrides `createIOServer()` to use `{ noServer: true }` for Socket.io. This prevents Socket.io from touching the upgrade handler.
2. **Wire the upgrade dispatcher in `main.ts`** after `app.init()` but before `app.listen()`. NestJS lifecycle docs confirm this ordering (Context7 verified).
3. **Set `{ transports: ['websocket'] }`** on both Socket.io server and client — this disables the HTTP long-polling fallback, reducing the surface area for connection issues. For a portfolio demo with modern browsers, long-polling is unnecessary.
4. **Do NOT use `@WebSocketGateway({ path: '/socket.io/' })`** to set the path — instead, set the path in the adapter's `createIOServer()` options.

**Detection:** Add a startup log that prints `httpServer.listeners('upgrade').length`. If it's more than 1, something is double-binding.

**Phase relevance:** Phase 2 (Dual WebSocket Integration) — decide adapter strategy before writing any gateway code.

**Confidence:** HIGH — NestJS WebSocket adapter docs and lifecycle hooks verified via Context7.

---

### Pitfall 6: Optimistic Updates + Socket.io Broadcast Race Conditions

**What goes wrong:** User A moves a card (optimistic update applied locally). The API request reaches the server, which broadcasts the update to all clients including User A. User A receives the broadcast and applies it again, causing a visual "flash" (card briefly disappears and reappears) or a duplicate state update.

**Severity:** HIGH

**Why it happens:** Socket.io's `emit` to a room includes the sender by default. The client applies the optimistic update immediately, then receives the server's broadcast confirmation and applies it again.

**Warning signs:**
- Cards briefly flicker or "double-move" when the user who initiated the action sees the broadcast
- List counts momentarily show incorrect numbers
- Animation library (Framer Motion) plays the entrance animation twice for the same card

**Prevention strategy:**
1. **Exclude sender from broadcast:** Use `socket.to(room).emit(event, data)` instead of `io.to(room).emit(event, data)`. The `.to()` method on a socket instance excludes that socket from the broadcast (Socket.io docs, HIGH confidence).
2. **Server acknowledgment pattern:** Emit to room (excluding sender) + send an `ack` callback to the sender. The sender's optimistic update stays; others get the broadcast.
3. **Idempotent state updates:** Design state updates so applying the same update twice is harmless. Use `setCards(prev => prev.map(c => c.id === updated.id ? {...c, ...updated} : c))` instead of push/splice operations.
4. **Sequence numbers:** Attach a monotonically increasing sequence number to each event. Clients ignore events with a sequence number they've already processed.

**Detection:** Add a `console.warn` when a state update is applied for a card whose local version already matches the incoming version.

**Phase relevance:** Phase 5 (Board CRUD), Phase 8 (Drag-and-Drop) — both involve broadcasting state changes.

**Confidence:** HIGH — Socket.io broadcasting behavior verified via Context7 (`socket.to(room).emit` vs `io.to(room).emit` distinction is documented).

---

### Pitfall 7: Redis Presence Heartbeat Timing — Stale Users and Ghost Cursors

**What goes wrong:** The presence system uses Redis to track who's online and where their cursor is. If heartbeat intervals are too long, disconnected users appear online for too long (ghost avatars). If too short, Redis gets hammered with writes and cursor updates lag.

**Severity:** HIGH

**Why it happens:** Socket.io's built-in heartbeat (`pingInterval`/`pingTimeout`) detects transport-level disconnects, but it doesn't feed into a custom Redis presence store. You need a separate application-level heartbeat. The default Socket.io `pingInterval` is 25 seconds — way too slow for presence (verified via Context7: Socket.io disconnection detection uses configurable `pingInterval` and `pingTimeout` parameters).

**Warning signs:**
- User closes browser tab, their avatar stays for 30+ seconds
- Cursors "teleport" instead of moving smoothly (heartbeat too infrequent)
- Redis `KEYS` command shows stale presence entries from hours ago
- CPU/memory spike from too-frequent Redis writes

**Prevention strategy:**
1. **Two-tier heartbeat:**
   - **Cursor position:** Broadcast via Socket.io memory (no Redis) at 50-100ms throttle. Cursors are ephemeral — they don't need persistence.
   - **Online/offline status:** Write to Redis with a TTL of 10 seconds. Client sends a heartbeat every 5 seconds (2x safety margin).
2. **Use `SETEX` (or `SET ... EX`)** for presence keys: `presence:{boardId}:{userId}` with a 10-second TTL. No cleanup needed — stale keys auto-expire.
3. **Listen to Socket.io's `disconnect` event** to immediately remove the presence key (don't wait for TTL expiry).
4. **Don't store cursor positions in Redis** — broadcast them directly through Socket.io rooms. Only avatars/online-status go to Redis.

**Detection:** Disconnect a client (close tab), measure how long their avatar persists. Target: <3 seconds visibility after disconnect.

**Phase relevance:** Phase 7 (Presence System) — design the two-tier approach upfront.

**Confidence:** HIGH — Socket.io heartbeat mechanics verified via Context7; Redis TTL patterns are standard.

---

### Pitfall 8: Demo Bots That Feel Robotic

**What goes wrong:** The scripted 60-second bot choreography + random weighted behavior produces bots that act too predictably (same timing intervals, mechanical cursor paths, instant text typing). A recruiter notices the "collaboration" is fake within 10 seconds, undermining the entire demo.

**Severity:** HIGH

**Why it happens:** Developers implement bots as `setInterval` + `Math.random()` — uniform random timing is the most unnatural thing possible. Real humans have bursts of activity, pauses to read, variable typing speeds, and hesitation before actions.

**Warning signs:**
- Bots always type at exactly X characters per second
- Cards move at perfectly regular intervals
- Multiple bots active at exactly the same time (real users have asymmetric activity patterns)
- Cursor movements are straight lines (real cursor paths are slightly curved/wobbly)

**Prevention strategy:**
1. **Gaussian timing, not uniform:** Use a normal distribution for action delays (mean: 3s, stddev: 1.5s) with a minimum of 0.5s. `delay = Math.max(500, normalRandom(3000, 1500))`.
2. **Burst/idle cycles:** Bots should alternate between active (3-8 actions, 1-3 second gaps) and idle (5-15 second pause) phases. Model this as a simple state machine.
3. **Typing simulation:** Type character-by-character with variable speed (50-150ms per char) and occasional pauses at word boundaries (200-500ms).
4. **Cursor path interpolation:** Use Bezier curves or add small random offsets to linear cursor paths. Real cursors slightly overshoot targets.
5. **Bot personality:** Each bot (Maria, Carlos, Ana) should have different timing parameters. Maria is fast and decisive, Carlos is methodical, Ana pauses to think.
6. **Choreography overlap:** During the 60-second script, ensure bots don't all act simultaneously. Stagger start times by 2-5 seconds so a recruiter can follow the action.

**Detection:** Record a 60-second screen recording and show it to someone unfamiliar with the project. If they identify the bots as automated within 15 seconds, the timing needs work.

**Phase relevance:** Phase 9 (Demo Mode) — allocate serious design time for bot behavior. This is the recruiter-facing deliverable.

**Confidence:** MEDIUM — bot behavior patterns are based on UX research principles, not library-specific documentation. The implementation details are subjective.

---

## Moderate Pitfalls

Mistakes that cause hours of debugging or minor UX issues.

---

### Pitfall 9: Monorepo Shared Types Package Build Ordering

**What goes wrong:** The `@flowboard/shared` types package isn't built before the API and frontend try to import from it. TypeScript compilation fails with "Cannot find module '@flowboard/shared'" or types resolve to `any`.

**Severity:** MODERATE

**Why it happens:** Turborepo needs explicit `dependsOn` configuration in `turbo.json` to know that `api#build` and `web#build` depend on `shared#build`. Without this, Turborepo may build them in parallel, and the shared package's `dist/` directory doesn't exist yet when consumers import from it.

**Warning signs:**
- `pnpm build` works on second run but fails on first (clean) run
- Types show as `any` in the IDE but the app runs fine (IDE reads source, runtime reads dist)
- CI builds fail intermittently (race condition in parallel builds)

**Prevention strategy:**
1. **Use Turborepo's Just-in-Time Packages pattern** (verified via Context7): Point `main` and `types` in the shared package's `package.json` directly at the source TypeScript files (`./src/index.ts`), not compiled output. This eliminates the build step entirely for internal packages.

```json
{
  "name": "@flowboard/shared",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

2. **If you do need a build step** (e.g., for runtime validation with Zod), configure `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

The `^build` syntax means "build my dependencies first" (Context7 verified).

3. **Use `workspace:*` protocol** in pnpm for internal deps (Context7 verified):

```json
{ "@flowboard/shared": "workspace:*" }
```

4. **Configure TypeScript `references`** in each consumer's `tsconfig.json` pointing to the shared package, so the IDE resolves types from source even during development.

**Detection:** Run `pnpm build` in CI with a clean cache (`turbo --force`). If it fails, the dependency graph is misconfigured.

**Phase relevance:** Phase 1 (Monorepo Scaffold) — get this right from the start. Fixing it later requires touching every import path.

**Confidence:** HIGH — Turborepo internal packages and Just-in-Time pattern verified via Context7.

---

### Pitfall 10: Yjs Document Size Growth (Tombstone Accumulation)

**What goes wrong:** Yjs is a CRDT — it never truly deletes data. Deleted content becomes "tombstones" that remain in the document forever (unless garbage collection is enabled). Over time, especially with the demo bots constantly editing card descriptions, the BYTEA blob grows from kilobytes to megabytes, slowing down initial sync and increasing database storage.

**Severity:** MODERATE

**Why it happens:** CRDTs maintain causal history to resolve conflicts. Yjs's default garbage collection (`gc: true`) collects tombstones, but only if no snapshots reference them. If `gc: false` (required for undo/redo or snapshots), tombstones accumulate indefinitely.

**Warning signs:**
- Initial page load gets slower over days/weeks as the demo runs
- Database BYTEA column size grows monotonically
- `Y.encodeStateAsUpdate(ydoc)` returns progressively larger buffers
- Browser memory usage increases over a long session

**Prevention strategy:**
1. **Keep `gc: true`** (the default). FlowBoard doesn't need time-travel or undo-beyond-current-session.
2. **Periodically compact:** Run `Y.encodeStateAsUpdate(ydoc)` → store the result → create a fresh `Y.Doc()` → `Y.applyUpdate(freshDoc, storedState)`. This removes garbage.
3. **Reset the demo board daily** (or on a schedule). A cron job that resets the demo board's Yjs state to a known-good seed state prevents unbounded growth.
4. **Monitor blob size:** Add a metric that tracks the BYTEA column size. Alert if any card's Yjs state exceeds 100KB (a card description should never be that large).

**Detection:** After 24 hours of demo bot activity, check the size of Yjs state blobs. If any exceed 50KB, the compaction strategy needs tuning.

**Phase relevance:** Phase 6 (Yjs Collaborative Editing) for initial setup, Phase 9 (Demo Mode) for the demo board reset.

**Confidence:** HIGH — Yjs garbage collection and encoding verified via Context7; tombstone behavior is fundamental to CRDT design.

---

### Pitfall 11: Socket.io Reconnection Storms After Deploy

**What goes wrong:** When the server restarts (Railway deploy), all connected clients disconnect simultaneously. They all try to reconnect at the same time with Socket.io's automatic reconnection. The server gets overwhelmed by hundreds of simultaneous handshakes, WebSocket upgrades, and room re-joins.

**Severity:** MODERATE

**Why it happens:** Socket.io's client-side reconnection uses exponential backoff, but the initial reconnection attempt from all clients happens within the same 1-second window. For a portfolio project with <10 concurrent users this is minor, but it still causes a visible "everyone disconnected" flash.

**Warning signs:**
- All presence avatars disappear and reappear simultaneously after a deploy
- Server logs show a burst of connection events
- Yjs documents briefly show as "disconnected" for all users

**Prevention strategy:**
1. **Enable `connectionStateRecovery`** on the Socket.io server (verified via Context7, added in v4.6.0):

```javascript
const io = new Server({
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});
```

This allows clients to resume their session (including rooms and socket ID) after a brief disconnect, avoiding the full re-handshake.

2. **Add jitter to client reconnection:** Configure the client with `randomizationFactor`:

```javascript
const socket = io({
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5, // spreads reconnection attempts
});
```

3. **Handle `socket.recovered` on the server:** If the socket recovered, don't re-join rooms or re-fetch state. If it didn't recover, do the full initialization.

4. **Graceful shutdown:** On `SIGTERM`, persist Yjs docs, then wait 2 seconds for clients to receive the disconnect, then exit. This gives clients time to start their reconnection backoff staggered from the restart.

**Detection:** Deploy and watch the client console. If you see more than one reconnection attempt per client, the recovery isn't working.

**Phase relevance:** Phase 11 (Deploy + README) — test this explicitly before recording the demo GIF.

**Confidence:** HIGH — Socket.io connectionStateRecovery verified via Context7 with version and configuration details.

---

### Pitfall 12: JWT Auth for WebSocket Connections — Middleware vs Handshake

**What goes wrong:** REST API endpoints use NestJS guards to validate JWTs from the `Authorization` header. WebSocket connections don't have HTTP headers after the initial handshake. Developers either (a) skip auth for WebSocket entirely, (b) only auth on connect but not on subsequent messages, or (c) try to use HTTP middleware which doesn't apply to WebSocket events.

**Severity:** MODERATE

**Why it happens:** Socket.io's connection happens in two phases: the HTTP handshake (where headers exist) and the WebSocket transport (where they don't). NestJS's `@UseGuards()` on `@SubscribeMessage()` works, but you must extract the token from `socket.handshake.auth` or `socket.handshake.headers`, not from `request.headers` (verified via Context7: NestJS WebSocket guards use `context.switchToWs()`, not `context.switchToHttp()`).

**Warning signs:**
- Auth guard throws "Cannot read property 'headers' of undefined" on WebSocket events
- WebSocket connections work without a token (auth is silently bypassed)
- Token refresh doesn't propagate to the WebSocket connection (user gets disconnected after token expires)

**Prevention strategy:**
1. **Auth in the Socket.io middleware** (runs once on connect):

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = jwtService.verify(token);
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});
```

2. **Send the token from the client** in the `auth` option:

```typescript
const socket = io({ auth: { token: getAccessToken() } });
```

3. **Handle token refresh:** Listen for the `connect_error` event on the client. If the error is auth-related, refresh the token and reconnect:

```typescript
socket.on('connect_error', (err) => {
  if (err.message === 'Unauthorized') {
    refreshToken().then((newToken) => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

4. **Guest users:** Generate a guest JWT (with `role: "guest"`) on page load. The same auth middleware works for both registered and guest users — just check the role for write permissions.

5. **y-websocket auth:** Pass the JWT as a URL parameter: `ws://server/yjs/room-name?token=xxx`. Validate in the `upgrade` handler before calling `wss.handleUpgrade()`.

**Detection:** Open the app in an incognito window without logging in. If WebSocket events work, auth is missing.

**Phase relevance:** Phase 4 (JWT Auth) — must be designed with both REST and WebSocket in mind from the start.

**Confidence:** HIGH — NestJS WebSocket guard behavior and Socket.io middleware pattern verified via Context7.

---

### Pitfall 13: Railway/Vercel WebSocket Deployment Split-Brain

**What goes wrong:** Deploying the NestJS backend (with WebSocket support) on Railway and the Vite React frontend on Vercel creates a cross-origin WebSocket connection. Vercel doesn't support WebSocket connections at all — it's a serverless/edge platform. If any WebSocket logic accidentally ends up in the Vercel deployment, it silently fails.

**Severity:** MODERATE

**Why it happens:** Vercel's serverless functions have a max execution time (10-60 seconds) and don't support persistent connections. Railway does support WebSockets, but requires the app to bind to `0.0.0.0:$PORT` (verified via Railway docs). CORS misconfigurations between the two domains cause WebSocket handshake failures.

**Warning signs:**
- WebSocket connections fail in production but work locally
- Browser console shows CORS errors on the WebSocket handshake
- Socket.io falls back to HTTP long-polling (which works through Vercel's proxy but shouldn't be used)
- `Application failed to respond` (502) on Railway if not binding to `0.0.0.0`

**Prevention strategy:**
1. **Railway backend:** Bind NestJS to `0.0.0.0:${process.env.PORT || 3000}` (Railway injects `PORT`).
2. **Explicit CORS on Socket.io server:**

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL, // e.g., https://flowboard.vercel.app
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket'], // disable polling for cleaner behavior
});
```

3. **Frontend connects to Railway URL explicitly:**

```typescript
const socket = io(import.meta.env.VITE_API_URL); // not relative path
```

4. **Railway WebSocket timeout:** Railway's proxy has a default idle timeout. Send periodic pings to keep the connection alive (Socket.io does this automatically with `pingInterval`).
5. **Don't use Vercel rewrites to proxy WebSocket** — Vercel doesn't support this. The frontend must connect directly to the Railway domain.
6. **Docker Compose for local dev** should mirror this split (separate ports for API and frontend) to catch cross-origin issues early.

**Detection:** Deploy to staging and test WebSocket connections from the Vercel-hosted frontend. If it falls back to polling, check CORS and transport config.

**Phase relevance:** Phase 11 (Deploy + README) — but set up the local Docker Compose in Phase 1 to mirror the production topology.

**Confidence:** HIGH — Railway hosting requirements verified via official docs; Vercel WebSocket limitations are well-documented.

---

## Minor Pitfalls

Issues that cause small annoyances or minor technical debt.

---

### Pitfall 14: TipTap + Yjs Cursor Position Jank

**What goes wrong:** When two users edit the same card description simultaneously with TipTap + y-prosemirror, the non-typing user's cursor jumps to the beginning of the document or to an incorrect position after the remote user types.

**Severity:** MINOR (for FlowBoard — only one card is edited at a time typically)

**Why it happens:** ProseMirror's cursor position is tracked as an integer offset. When a remote insert happens before the cursor, the offset needs to be adjusted. The y-prosemirror binding does this, but edge cases exist (e.g., typing at the exact same position, or the document being empty).

**Prevention strategy:**
1. Use `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-cursor` — they handle the Yjs binding correctly.
2. Test with two browser windows editing the same card simultaneously.
3. Accept minor jank as a tradeoff — perfect cursor tracking is a deep rabbit hole.

**Phase relevance:** Phase 6 (Yjs Collaborative Editing).

**Confidence:** MEDIUM — TipTap + Yjs integration is well-established but edge cases exist.

---

### Pitfall 15: Framer Motion Layout Animations + Dynamic Lists

**What goes wrong:** Using `<AnimatePresence>` and `layout` animations on card lists causes cards to animate when they shouldn't (e.g., a card moving in a different list triggers layout animations in an unrelated list).

**Severity:** MINOR

**Why it happens:** Framer Motion's `layout` prop triggers an animation whenever the component's layout position changes in the DOM. Adding or removing a card in one list can shift the position of the next list, triggering animations on cards that didn't actually move.

**Prevention strategy:**
1. Use `layoutId` with unique, stable IDs (card UUIDs).
2. Wrap each list column in its own `<LayoutGroup>` to isolate layout animations.
3. Use `layout="position"` instead of `layout={true}` to only animate position, not size changes.
4. Set `layoutDependency` to the list's own card count, not the global board state.

**Phase relevance:** Phase 10 (Polish).

**Confidence:** MEDIUM — Framer Motion layout animation behavior is based on training data, not Context7-verified.

---

### Pitfall 16: Prisma Client Generation in Monorepo

**What goes wrong:** `prisma generate` outputs the Prisma Client to `node_modules/.prisma/client` by default. In a pnpm monorepo with hoisting, the generated client might end up in the root `node_modules/` where the frontend can accidentally import it, or in the API's `node_modules/` where the shared types package can't find it.

**Severity:** MINOR

**Why it happens:** pnpm's strict module resolution + hoisting configuration can place the generated client in an unexpected location. Turborepo caching can also serve a stale Prisma Client if the schema changed but the cache wasn't invalidated.

**Prevention strategy:**
1. Set a custom output path in `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

2. Add `prisma generate` to the API's `build` script with `dependsOn` in turbo.json.
3. Add `.prisma/` and `generated/` to Turborepo's `outputs` for caching.
4. Never import Prisma Client from the shared types package — keep it API-only.

**Phase relevance:** Phase 1 (Monorepo Scaffold), Phase 3 (Database Schema).

**Confidence:** MEDIUM — Prisma in monorepo is a known pain point; specific resolution behavior depends on pnpm version and configuration.

---

## Phase-Specific Warnings Summary

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| 1: Monorepo Scaffold | #9 Shared types build order, #16 Prisma generation | Moderate/Minor | Use Just-in-Time pattern; custom Prisma output |
| 2: Dual WebSocket | #1 Upgrade handler collision, #5 NestJS gateway conflict | Critical/High | Manual upgrade dispatcher; custom adapter with `noServer: true` |
| 3: Database Schema | #4 FLOAT precision (schema design) | Critical | Add UNIQUE constraint on (list_id, position) |
| 4: JWT Auth | #12 WebSocket auth middleware | Moderate | Auth in Socket.io middleware + handshake.auth |
| 5: Board CRUD | #6 Optimistic update races | High | Exclude sender from broadcast; idempotent updates |
| 6: Yjs Editing | #2 Data loss on disconnect, #10 Tombstone growth, #14 Cursor jank | Critical/Moderate/Minor | Debounced persist + SIGTERM flush; gc: true; TipTap collab extensions |
| 7: Presence | #7 Heartbeat timing | High | Two-tier: cursors via Socket.io memory, status via Redis TTL |
| 8: Drag-and-Drop | #3 State desync during drag, #4 FLOAT precision | Critical | Lock-and-queue pattern; rebalancing on gap check |
| 9: Demo Mode | #8 Robotic bots, #10 Tombstone growth | High/Moderate | Gaussian timing + personality; daily demo reset |
| 10: Polish | #15 Layout animation bleed | Minor | LayoutGroup isolation |
| 11: Deploy | #11 Reconnection storms, #13 Railway/Vercel split | Moderate | connectionStateRecovery; explicit CORS + direct WS connection |

---

## Sources

| Source | Confidence | Used For |
|--------|------------|----------|
| Socket.io Official Docs (via Context7 `/websites/socket_io`) | HIGH | Pitfalls 1, 5, 6, 7, 11 |
| Yjs Docs (via Context7 `/yjs/yjs`, `/yjs/docs`) | HIGH | Pitfalls 2, 10 |
| y-websocket Docs (via Context7 `/yjs/y-websocket`) | HIGH | Pitfalls 1, 2 |
| @dnd-kit Docs (via Context7 `/websites/dndkit`) | HIGH | Pitfalls 3 |
| NestJS Docs (via Context7 `/nestjs/docs.nestjs.com`) | HIGH | Pitfalls 5, 12 |
| Turborepo Docs (via Context7 `/vercel/turborepo`) | HIGH | Pitfall 9 |
| Railway Official Docs (via WebFetch) | HIGH | Pitfall 13 |
| IEEE 754 floating-point specification | HIGH | Pitfall 4 |
| Framer Motion behavior | MEDIUM | Pitfall 15 (training data only) |
| Bot UX design patterns | MEDIUM | Pitfall 8 (training data + UX principles) |
