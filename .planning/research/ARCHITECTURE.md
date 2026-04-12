# Architecture Patterns

**Domain:** Real-time collaborative Kanban board
**Researched:** 2026-04-11
**Confidence:** HIGH (Context7 + official source code verified)

## System Overview

FlowBoard is a dual-WebSocket collaborative Kanban board. Two independent real-time transport layers run on the same NestJS HTTP server but serve fundamentally different purposes:

1. **Socket.io** — Board-level operations: card moves, list reordering, presence broadcasting, cursor positions. Request-response style with optimistic rollback.
2. **y-websocket** — Document-level CRDT sync: collaborative card description editing via TipTap/Yjs. Automatic conflict-free merge, no application-level conflict resolution needed.

This separation is the core architectural decision. Trying to route everything through one transport creates a leaky abstraction — CRDT sync has different serialization, different persistence timing, and different failure modes than event-based board operations.

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (React + Vite)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Board State  │  │  DnD (@dnd-  │  │  TipTap Editor    │ │
│  │  (Zustand)   │  │   kit)       │  │  (Yjs-backed)     │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘ │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴──┐  ┌──────────────┴──────────┐│
│  │  Socket.io Client         │  │  WebsocketProvider      ││
│  │  /socket.io/              │  │  (y-websocket client)   ││
│  │  board:*, presence:*      │  │  /yjs/{cardId}          ││
│  └──────────┬────────────────┘  └──────────┬──────────────┘│
└─────────────┼───────────────────────────────┼──────────────┘
              │ WS upgrade                    │ WS upgrade
              │ path: /socket.io/             │ path: /yjs/
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   NestJS HTTP Server (single port)          │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Socket.io Gateway   │  │  y-websocket Handler         │ │
│  │  (@WebSocketGateway) │  │  (raw WS via handleUpgrade)  │ │
│  │                      │  │                              │ │
│  │  Namespaces:         │  │  Room = card:{cardId}        │ │
│  │   / (default)        │  │  Persistence: bindState/     │ │
│  │                      │  │    writeState callbacks      │ │
│  └──────────┬───────────┘  └──────────┬───────────────────┘ │
│             │                         │                     │
│  ┌──────────┴───────────────────────┐ │                     │
│  │       NestJS Service Layer       │ │                     │
│  │  BoardService, CardService,      │ │                     │
│  │  ListService, PresenceService    │ │                     │
│  └──────────┬───────────────────────┘ │                     │
│             │                         │                     │
│  ┌──────────┴─────────────────────────┴───────────────────┐ │
│  │              Data Access Layer                         │ │
│  │  Prisma Client (PostgreSQL) │  Redis (ioredis)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. Frontend Components

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **Board Shell** | Layout container, board header, member list | Socket.io (presence), Zustand store | React |
| **List Column** | Renders list of cards, droppable container | Zustand store, @dnd-kit DragDropProvider | React + @dnd-kit |
| **Card** | Draggable card surface, click-to-edit | Zustand store, @dnd-kit useSortable | React + @dnd-kit |
| **Card Editor (Modal)** | TipTap rich text editing of card description | y-websocket provider, REST API (title PATCH) | React + TipTap + Yjs |
| **Zustand Store** | Client-side board state (lists, cards, positions) | Socket.io events (incoming), REST API (outgoing) | Zustand |
| **Socket.io Client** | Board-level real-time transport | NestJS Socket.io Gateway | socket.io-client |
| **Yjs Provider** | CRDT document sync for card descriptions | NestJS y-websocket handler | y-websocket WebsocketProvider |
| **Presence Overlay** | Cursor positions, online user avatars | Socket.io (presence events), Zustand | React + Framer Motion |

### 2. Backend Components

| Component | Responsibility | Communicates With | Technology |
|-----------|---------------|-------------------|------------|
| **AppModule** | Root module, global config | All modules | NestJS |
| **AuthModule** | JWT issue/verify, guards, guest tokens | All protected routes/gateways | NestJS + @nestjs/jwt |
| **BoardModule** | Board CRUD, list CRUD, card CRUD | Prisma, Socket.io Gateway | NestJS + Prisma |
| **RealtimeModule** | Socket.io gateway, event handlers, Redis adapter | Redis, BoardService, PresenceService | NestJS + Socket.io + @socket.io/redis-adapter |
| **CollabModule** | y-websocket server, Yjs persistence | PostgreSQL (BYTEA), raw WS connections | ws + y-websocket-server utils |
| **PresenceModule** | Heartbeat tracking, cursor broadcasting, online users | Redis, Socket.io Gateway | NestJS + ioredis |
| **DemoModule** | Bot choreography, demo board seeding | BoardService, CardService (direct service calls) | NestJS |
| **PrismaModule** | Database client singleton | PostgreSQL | Prisma |
| **RedisModule** | Redis client singleton | Redis server | ioredis |

### 3. Infrastructure Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **PostgreSQL** | Persistent storage: users, boards, lists, cards, Yjs documents (BYTEA) | PostgreSQL 16 |
| **Redis** | Ephemeral state: presence heartbeats, cursor positions, Socket.io adapter pub/sub | Redis 7 |

## Data Flow

### Flow 1: Card Drag-and-Drop (Optimistic Update Pattern)

This is the most complex data flow in the system. It must feel instant (optimistic) but handle rollback if the server rejects the move.

```
User drags card from List A position 3 → List B position 1

1. OPTIMISTIC: @dnd-kit onDragEnd fires
   → Zustand store updates immediately (new positions with fractional index)
   → UI re-renders instantly — user sees card in new position

2. EMIT: Socket.io client emits 'card:move'
   → Payload: { cardId, fromListId, toListId, newPosition: 0.5 }
   → Socket includes JWT in auth handshake (verified once on connect)

3. SERVER PROCESS: BoardGateway receives 'card:move'
   → CardService.moveCard() validates move:
     - Card exists? Board membership? List belongs to board?
   → Prisma transaction:
     UPDATE cards SET list_id = $toListId, position = $newPosition WHERE id = $cardId
   → If position too dense (check gap < 0.001), trigger rebalance:
     UPDATE cards SET position = generate_series WHERE list_id = $toListId
     ORDER BY position

4. BROADCAST: Server emits 'card:moved' to room `board:{boardId}`
   → socket.to(`board:${boardId}`).emit('card:moved', { ...fullCardState })
   → Excludes the sender (they already have optimistic state)

5. OTHER CLIENTS: Receive 'card:moved'
   → Zustand store updates with server-confirmed positions
   → UI re-renders

6. ERROR/ROLLBACK: If step 3 fails
   → Server emits 'card:move:error' to sender only
   → Zustand store rolls back to snapshot (captured at drag start)
   → UI shows brief error toast
```

### Flow 2: Collaborative Card Description Editing (CRDT)

```
User A and User B both editing card #42 description

1. CONNECT: Each user opens card editor modal
   → new WebsocketProvider('ws://host/yjs', 'card:42', ydoc)
   → Server: setupWSConnection() → getYDoc('card:42')
     → If first connection: persistence.bindState('card:42', doc)
       reads BYTEA from PostgreSQL, applies to server Y.Doc

2. SYNC: Yjs sync protocol (automatic, handled by y-websocket)
   → Client sends SyncStep1 (state vector)
   → Server responds SyncStep2 (diff)
   → Client is now synced

3. EDIT: User A types in TipTap
   → TipTap → Yjs XmlFragment update → y-websocket broadcasts
   → Server receives update, forwards to User B
   → User B's TipTap renders User A's changes (no conflict)

4. PERSIST: Debounced + last-disconnect
   → Server doc.on('update') starts 30-second debounce timer
   → On timer fire: Y.encodeStateAsUpdate(doc) → Prisma update cards
     SET yjs_state = $binaryUpdate WHERE id = $cardId
   → On last client disconnect (doc.conns.size === 0):
     persistence.writeState() → same Prisma write → doc.destroy()
```

### Flow 3: Presence (Cursors + Online Users)

```
1. CONNECT: User connects Socket.io
   → socket.join(`board:${boardId}`)
   → PresenceService.setOnline(userId, boardId) → Redis HSET
   → Server emits 'presence:join' to room with user info

2. HEARTBEAT: Every 5 seconds
   → Client emits 'presence:heartbeat'
   → PresenceService.refreshHeartbeat(userId) → Redis EXPIRE reset
   → Server-side interval checks for expired heartbeats (stale > 15s)
     → Emits 'presence:leave' for expired users

3. CURSOR: On mousemove (throttled to 50ms)
   → Client emits 'presence:cursor' { x, y, cardId? }
   → Server broadcasts to room (excluding sender)
   → Other clients render colored cursor at position

4. DISCONNECT: Socket disconnects
   → PresenceService.setOffline(userId, boardId) → Redis HDEL
   → Server emits 'presence:leave' to room
```

## WebSocket Architecture: Dual Transport on Single HTTP Server

### How Socket.io and y-websocket Coexist

**Confidence: HIGH** — Verified from NestJS official docs (Context7) and y-websocket-server source code.

They use different URL paths on the same HTTP server, which means they handle the WebSocket upgrade request independently based on the request path.

```typescript
// main.ts — NestJS bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Socket.io: Handled by NestJS IoAdapter (or RedisIoAdapter)
  //    Automatically handles upgrades on /socket.io/ path
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // 2. y-websocket: Manual upgrade handler on /yjs/ path
  //    Intercept HTTP upgrade BEFORE the default handler
  const httpServer = app.getHttpServer();
  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', (ws, req) => {
    // Extract room name from URL: /yjs/card:42 → "card:42"
    const docName = req.url.replace('/yjs/', '').split('?')[0];
    setupWSConnection(ws, req, { docName });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/yjs/')) {
      // Verify JWT from query params before upgrade
      const token = new URL(request.url, 'http://localhost').searchParams.get('token');
      // ... verify token ...
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Socket.io handles its own upgrades on /socket.io/ — NestJS IoAdapter does this
  });

  await app.listen(3000);
}
```

**Key insight from y-websocket-server source:** The server uses `{ noServer: true }` on the `ws.Server` and handles upgrades manually via `httpServer.on('upgrade')`. This is how it coexists with Socket.io — Socket.io's adapter claims `/socket.io/` upgrades, and the manual handler claims `/yjs/` upgrades. They never conflict because the path check happens before the upgrade is accepted.

**NestJS-specific note:** NestJS's `@WebSocketGateway()` decorator creates a Socket.io server attached to the HTTP server. The `IoAdapter` (or `RedisIoAdapter`) handles the Socket.io transport. For y-websocket, bypass NestJS's gateway system entirely — use a raw `ws.Server` with `noServer: true` and hook into the HTTP server's `upgrade` event. This is cleaner than trying to force y-websocket into NestJS's gateway abstraction, which assumes Socket.io's message protocol.

### Socket.io Gateway Structure (NestJS)

**Confidence: HIGH** — Verified from NestJS Context7 docs.

```typescript
// board.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' }, // configure per environment
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private cardService: CardService,
    private presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    // JWT verified via middleware/guard
    const user = client.data.user;
    const boardId = client.handshake.query.boardId;
    client.join(`board:${boardId}`);
    await this.presenceService.setOnline(user.id, boardId);
    this.server.to(`board:${boardId}`).emit('presence:join', { user });
  }

  @SubscribeMessage('card:move')
  async handleCardMove(client: Socket, payload: CardMoveDto) {
    const result = await this.cardService.moveCard(payload);
    // Broadcast to room, exclude sender
    client.to(`board:${payload.boardId}`).emit('card:moved', result);
    return { event: 'card:move:ack', data: result }; // ACK to sender
  }
}
```

**Register in module:**
```typescript
@Module({
  providers: [BoardGateway, CardService, PresenceService],
})
export class RealtimeModule {}
```

### Redis Adapter for Socket.io Scaling

**Confidence: HIGH** — Verified from NestJS Context7 docs (RedisIoAdapter example).

Even for a portfolio project with single-instance deployment, use the Redis adapter because:
1. It stores room membership durably (survives server restart)
2. The same Redis instance is already needed for presence
3. It's the production pattern recruiters expect to see

```typescript
// redis-io.adapter.ts
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

## Persistence Layer

### Yjs Document Persistence to PostgreSQL

**Confidence: HIGH** — Verified from y-websocket-server source code (`utils.js` — `setPersistence`, `bindState`, `writeState` callbacks, `closeConn` function).

The y-websocket-server exposes a `setPersistence()` function that accepts an object with two callbacks:

```typescript
interface YjsPersistence {
  bindState: (docName: string, ydoc: WSSharedDoc) => void;
  writeState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
  provider: any;
}
```

- **`bindState(docName, ydoc)`** — Called when a document is first requested (first client connects). Load existing state from PostgreSQL and apply to the Y.Doc.
- **`writeState(docName, ydoc)`** — Called when the last client disconnects (`doc.conns.size === 0` in `closeConn`). Encode document state and persist to PostgreSQL.

**Implementation for PostgreSQL via Prisma:**

```typescript
import { setPersistence, WSSharedDoc } from '@y/websocket-server/utils';
import * as Y from 'yjs';

setPersistence({
  bindState: async (docName: string, ydoc: WSSharedDoc) => {
    // docName format: "card:{cardId}"
    const cardId = docName.split(':')[1];
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { yjsState: true },
    });
    if (card?.yjsState) {
      // yjsState is Bytes (BYTEA) → Prisma returns Uint8Array (Buffer in Node)
      Y.applyUpdate(ydoc, new Uint8Array(card.yjsState));
    }
  },
  writeState: async (docName: string, ydoc: WSSharedDoc) => {
    const cardId = docName.split(':')[1];
    const state = Y.encodeStateAsUpdate(ydoc);
    await prisma.card.update({
      where: { id: cardId },
      data: { yjsState: Buffer.from(state) },
    });
  },
  provider: null,
});
```

**Additional debounced persistence (30-second timer):**

The source code shows that `writeState` is only called on last-disconnect. For durability during active editing, add a debounced `doc.on('update')` listener that writes to PostgreSQL every 30 seconds:

```typescript
// In CollabModule setup
const debouncedWrite = new Map<string, NodeJS.Timeout>();

doc.on('update', () => {
  const existing = debouncedWrite.get(doc.name);
  if (existing) clearTimeout(existing);
  debouncedWrite.set(doc.name, setTimeout(async () => {
    const cardId = doc.name.split(':')[1];
    const state = Y.encodeStateAsUpdate(doc);
    await prisma.card.update({
      where: { id: cardId },
      data: { yjsState: Buffer.from(state) },
    });
    debouncedWrite.delete(doc.name);
  }, 30_000));
});
```

### Prisma Schema for BYTEA

**Confidence: HIGH** — Verified from Prisma Context7 docs (Bytes type maps to PostgreSQL `bytea`, represented as `Uint8Array` in client).

```prisma
model Card {
  id          String   @id @default(cuid())
  title       String
  position    Float    // Fractional indexing
  listId      String   @map("list_id")
  list        List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  yjsState    Bytes?   @map("yjs_state") // PostgreSQL BYTEA — null until first edit
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([listId, position])
  @@map("cards")
}
```

### Redis Presence Schema

```
# Online users per board (Hash)
presence:board:{boardId}  →  { [userId]: JSON({ name, color, lastSeen }) }

# Cursor positions (volatile, String with TTL)
cursor:{boardId}:{userId}  →  JSON({ x, y, cardId? })
                               TTL: 10 seconds (auto-expire stale cursors)
```

## Fractional Indexing with FLOAT Positions

**Confidence: MEDIUM** — Well-established pattern, but rebalancing threshold (50 dense insertions) is a project-specific decision.

### How It Works

Cards have a `position: Float` column. When inserting between two cards:
- Card A at position 1.0, Card B at position 2.0
- New card gets position 1.5
- Next insertion between A and new: position 1.25
- And so on...

### When to Rebalance

FLOAT64 gives ~15 decimal digits of precision. After many insertions in the same gap, positions converge. Rebalance when:
- Gap between adjacent positions < 0.001 (detection threshold)
- OR every 50 insertions into the same list (proactive)

**Rebalance operation:**
```sql
-- Reassign evenly spaced positions to all cards in a list
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY position) * 1000.0 AS new_pos
  FROM cards WHERE list_id = $listId
)
UPDATE cards SET position = ordered.new_pos
FROM ordered WHERE cards.id = ordered.id;
```

This is a Prisma raw query (`prisma.$executeRaw`) because Prisma doesn't support window functions in typed queries.

**After rebalance:** Broadcast `list:rebalanced` event so all clients get new positions. This replaces any optimistic positions.

### Why FLOAT over String-based Fractional Indexing

String-based approaches (like `fractional-indexing` npm package) generate keys like "a0", "a0V", "a0Vz" that never need rebalancing. However:
- FLOAT is simpler: standard SQL `ORDER BY position` works directly
- FLOAT is faster: no string comparison overhead
- Rebalancing is rare and atomic (single UPDATE)
- For a portfolio project with <100 cards per list, precision exhaustion is nearly impossible
- The rebalancing logic is itself a nice engineering showcase for recruiters

## NestJS Module Structure

**Confidence: HIGH** — Based on NestJS official patterns from Context7.

```
packages/api/src/
├── main.ts                     # Bootstrap, dual WS setup, Redis adapter
├── app.module.ts               # Root module
│
├── auth/
│   ├── auth.module.ts          # JWT strategy, guards
│   ├── auth.controller.ts      # POST /auth/register, /auth/login, /auth/guest
│   ├── auth.service.ts         # JWT sign/verify, password hash
│   ├── jwt.strategy.ts         # Passport JWT strategy
│   ├── jwt-auth.guard.ts       # REST route guard
│   └── ws-auth.guard.ts        # WebSocket connection guard
│
├── board/
│   ├── board.module.ts         # Board, List, Card services + controllers
│   ├── board.controller.ts     # CRUD: GET/POST/PATCH/DELETE boards
│   ├── board.service.ts        # Board business logic
│   ├── list.controller.ts      # CRUD: lists within a board
│   ├── list.service.ts
│   ├── card.controller.ts      # CRUD: cards within a list
│   ├── card.service.ts         # moveCard(), rebalancePositions()
│   └── dto/                    # Validation DTOs
│
├── realtime/
│   ├── realtime.module.ts      # Socket.io gateway + Redis adapter registration
│   ├── board.gateway.ts        # @WebSocketGateway — card:move, list:reorder events
│   └── redis-io.adapter.ts     # Extended IoAdapter with Redis pub/sub
│
├── collab/
│   ├── collab.module.ts        # y-websocket server setup
│   ├── collab.service.ts       # setupWSConnection, persistence callbacks
│   └── yjs-persistence.ts      # bindState/writeState PostgreSQL implementation
│
├── presence/
│   ├── presence.module.ts      # Presence tracking
│   ├── presence.service.ts     # Redis heartbeats, cursor state
│   └── presence.gateway.ts     # Could be merged into board.gateway or separate
│
├── demo/
│   ├── demo.module.ts          # Bot choreography
│   ├── demo.service.ts         # Bot behavior scripts
│   └── demo.scheduler.ts       # @Cron or setInterval for bot actions
│
├── prisma/
│   ├── prisma.module.ts        # Global Prisma client
│   └── prisma.service.ts       # onModuleInit → $connect, onModuleDestroy → $disconnect
│
└── redis/
    ├── redis.module.ts         # Global Redis client
    └── redis.service.ts        # ioredis wrapper
```

### Module Dependency Graph

```
AppModule
├── AuthModule (global guard)
├── PrismaModule (global)
├── RedisModule (global)
├── BoardModule
│   └── imports: PrismaModule
├── RealtimeModule
│   └── imports: BoardModule, PresenceModule
├── CollabModule
│   └── imports: PrismaModule
├── PresenceModule
│   └── imports: RedisModule
└── DemoModule
    └── imports: BoardModule
```

## Patterns to Follow

### Pattern 1: Optimistic Update with Rollback

**What:** Apply UI changes immediately, revert if server rejects.
**When:** Any board mutation (card move, list reorder, card create).
**Why:** Sub-50ms perceived latency regardless of network.

```typescript
// Zustand store
const useBoardStore = create<BoardState>((set, get) => ({
  moveCard: async (payload: CardMovePayload) => {
    // 1. Snapshot
    const snapshot = get().cards;
    // 2. Optimistic apply
    set(state => applyCardMove(state, payload));
    // 3. Emit to server
    socket.emit('card:move', payload, (ack) => {
      if (ack.error) {
        // 4. Rollback
        set({ cards: snapshot });
        toast.error('Move failed');
      }
    });
  },
}));
```

### Pattern 2: Room-Scoped Broadcasting

**What:** All Socket.io events scoped to `board:{boardId}` rooms.
**When:** Every board-level event.
**Why:** Users only receive events for boards they're viewing.

### Pattern 3: Service-Layer Bots (No WebSocket Connections)

**What:** Demo bots call `CardService.moveCard()` directly, then manually emit Socket.io events.
**When:** Demo mode bot actions.
**Why:** No connection overhead, no auth complexity, deterministic behavior.

```typescript
// demo.service.ts
async botMoveCard(botUser: BotUser, payload: CardMovePayload) {
  const result = await this.cardService.moveCard(payload);
  // Manually broadcast as if the bot were a connected client
  this.server.to(`board:${payload.boardId}`).emit('card:moved', {
    ...result,
    movedBy: botUser,
  });
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Routing Yjs Through NestJS Gateway

**What:** Trying to use `@WebSocketGateway` for y-websocket.
**Why bad:** NestJS gateways assume Socket.io's event-based protocol. y-websocket uses a binary sync protocol (lib0 encoding) incompatible with Socket.io's message framing. You'd fight the framework at every step.
**Instead:** Use raw `ws` server with `noServer: true`, hook into HTTP server's `upgrade` event. Keep it outside NestJS's gateway system but inside a NestJS service for DI access to Prisma.

### Anti-Pattern 2: Persisting Yjs State on Every Update

**What:** Writing to PostgreSQL on every keystroke/update.
**Why bad:** Yjs updates fire on every character typed. A user typing a paragraph generates hundreds of updates. Writing each to PostgreSQL creates massive I/O and kills performance.
**Instead:** Debounce writes to 30-second intervals + write on last-disconnect. The y-websocket server holds state in memory between persists.

### Anti-Pattern 3: Using Socket.io for Card Description Sync

**What:** Building custom OT/CRDT logic over Socket.io for collaborative text editing.
**Why bad:** You'd be reimplementing what Yjs already provides. Conflict resolution, cursor positioning, undo/redo — all solved by Yjs + TipTap's collaboration extension.
**Instead:** Let Yjs handle document sync (descriptions), Socket.io handles everything else (moves, presence, CRUD notifications).

### Anti-Pattern 4: Client-Side Fractional Index Generation

**What:** Computing the new position value on the client.
**Why bad:** Two users simultaneously inserting between the same cards could compute the same midpoint, creating duplicate positions. The server must be the single source of truth for position values.
**Instead:** Client sends intent (`insertAfter: cardId` or `moveTo: { listId, afterCardId }`), server computes the fractional position.

## Scalability Considerations

| Concern | At 5 users (demo) | At 100 users | At 1K users |
|---------|-------------------|--------------|-------------|
| **Socket.io connections** | In-memory, no adapter needed | Redis adapter, single server | Redis adapter + sticky sessions + multiple servers |
| **Yjs documents** | All in memory | In memory with LRU eviction | y-redis backend (separate service) |
| **PostgreSQL** | Single connection | Connection pooling (Prisma default) | Read replicas, connection pooling |
| **Cursor broadcasting** | Every event to all | Throttle to 50ms, volatile emit | Spatial partitioning (only broadcast to nearby cursors) |
| **Demo bots** | 3 bots, direct service calls | Same | Bot actions become queue-based |

**For this portfolio project:** Only the "5 users" column matters. But the Redis adapter and room-scoped architecture demonstrate awareness of the "100 users" column, which is what impresses recruiters.

## Build Order Recommendations

Based on component dependencies, the recommended build order is:

### Phase 1: Foundation (no real-time yet)
- **Monorepo scaffold** — Turborepo, pnpm workspaces, shared types
- **PrismaModule + schema** — Database tables, migrations
- **AuthModule** — JWT, guards (needed by everything)
- **BoardModule** — REST CRUD for boards, lists, cards

*Rationale:* Everything depends on auth + data access. REST API gives you a testable baseline before adding real-time complexity.

### Phase 2: Socket.io Layer
- **RedisModule** — Redis client singleton
- **RealtimeModule** — Socket.io gateway, Redis adapter
- **PresenceModule** — Heartbeats, online users
- Card move events, optimistic update pattern

*Rationale:* Socket.io gateway depends on BoardModule services. Presence depends on Redis. This phase adds the "live" feel.

### Phase 3: CRDT Collaboration
- **CollabModule** — y-websocket server on `/yjs/` path
- **yjs-persistence** — PostgreSQL BYTEA read/write
- TipTap editor integration on frontend
- Card description collaborative editing

*Rationale:* Most complex subsystem. Depends on auth (JWT verification on upgrade) and Prisma (persistence). Isolated from Socket.io — can be developed independently.

### Phase 4: Drag-and-Drop + Fractional Indexing
- @dnd-kit integration with multi-list sortable
- Fractional index computation on server
- Optimistic update + rollback wiring
- Rebalance logic

*Rationale:* Depends on Socket.io (broadcast moves) and CardService (position computation). @dnd-kit provides the UI primitives.

### Phase 5: Demo Mode
- Bot choreography service
- Demo board seeding
- Guest JWT flow
- 60-second scripted sequence + random weighted behavior

*Rationale:* Depends on all other systems being stable. Bots exercise the full stack.

### Phase 6: Polish + Deploy
- Framer Motion animations
- Cursor glow effects
- Dark theme polish
- Railway + Vercel deploy
- README with architecture diagram

*Rationale:* Visual polish is last — don't polish what might change.

## Sources

- NestJS WebSocket Gateway docs — Context7 `/nestjs/docs.nestjs.com` (HIGH confidence)
- NestJS Redis IoAdapter example — Context7 `/nestjs/docs.nestjs.com` adapter docs (HIGH confidence)
- Yjs document sync API — Context7 `/yjs/yjs` and `/yjs/docs` (HIGH confidence)
- y-websocket-server source code — GitHub `yjs/y-websocket-server` `src/utils.js`, `src/server.js` (HIGH confidence)
- Socket.io Redis adapter and rooms — Context7 `/websites/socket_io` v4 docs (HIGH confidence)
- Prisma Bytes type (BYTEA) — Context7 `/websites/prisma_io` (HIGH confidence)
- @dnd-kit multi-list sortable — Context7 `/websites/dndkit` (HIGH confidence)
- y-websocket README — GitHub `yjs/y-websocket` (HIGH confidence)
