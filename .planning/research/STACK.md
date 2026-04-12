# Technology Stack

**Project:** FlowBoard — Real-time Collaborative Kanban Board
**Researched:** 2026-04-11
**Overall confidence:** HIGH (all versions verified via npm registry + Context7 docs)

---

## Recommended Stack

### Backend Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NestJS | 11.1.x | API server, WebSocket gateway, auth | Progressive Node.js framework with first-class WebSocket gateway support (`@WebSocketGateway`), built-in DI, guards, and decorators. Socket.io adapter ships as `@nestjs/platform-socket.io`. NestJS 11 is current stable (verified npm: 11.1.18). | HIGH |
| `@nestjs/websockets` | 11.1.x | WebSocket gateway decorators | Provides `@WebSocketGateway()`, `@SubscribeMessage()`, `@WebSocketServer()`. Must match `@nestjs/core` version. | HIGH |
| `@nestjs/platform-socket.io` | 11.1.x | Socket.io adapter for NestJS | Default WebSocket adapter. Supports rooms, namespaces, Redis adapter for horizontal scaling. | HIGH |
| `@nestjs/jwt` | latest | JWT authentication | Signs/verifies JWTs for auth guards. Integrates with NestJS guards pattern. | HIGH |
| `@nestjs/passport` | latest | Auth strategy layer | Wraps Passport.js for NestJS. Use with `passport-jwt` strategy for guard-based auth. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | Robust relational DB. BYTEA columns for Yjs document persistence. FLOAT for fractional indexing. Native JSON support for metadata. | HIGH |
| Prisma | 7.7.x | ORM + migrations | Current stable is 7.7.0 (verified npm). **Major version jump from v6**: new `prisma-client` generator provider (was `prisma-client-js`), driver adapters now stable, output path required. Type-safe queries, declarative schema, clean migrations. | HIGH |
| `@prisma/client` | 7.7.x | Generated database client | Auto-generated from schema. Must match `prisma` CLI version. | HIGH |

**Prisma 7 Schema Change (Critical):**
```prisma
// Prisma 7 uses "prisma-client" not "prisma-client-js"
generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Caching & Presence

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Redis | 7+ | Presence state, pub/sub, caching | Heartbeat-based presence tracking, cursor state broadcasting. Socket.io Redis adapter for multi-instance. | HIGH |
| ioredis | 5.10.x | Redis client for Node.js | De facto standard Redis client. Supports Cluster, Sentinel, Streams. Verified npm: 5.10.1. Preferred over `redis` package for NestJS ecosystem. | HIGH |
| `@socket.io/redis-adapter` | 8.3.x | Socket.io horizontal scaling | Enables Socket.io to work across multiple NestJS instances via Redis pub/sub. Verified npm: 8.3.0. | HIGH |

### Real-time: Dual WebSocket Layer

#### Layer 1: Socket.io — Board-level sync (card moves, presence, CRUD broadcasts)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| socket.io | 4.8.x | Server-side WebSocket | Current stable 4.8.3 (verified npm). Rooms for per-board isolation, namespaces for logical separation. Built-in reconnection, fallback to long-polling. | HIGH |
| socket.io-client | 4.8.x | Client-side WebSocket | Must match server major version. Auto-reconnect, packet buffering. | HIGH |

**Path:** Mounted at `/socket.io/` (default).

#### Layer 2: y-websocket — CRDT document sync (collaborative card editing)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Yjs | 13.6.x | CRDT library | Current stable 13.6.30 (verified npm). High-performance CRDT for collaborative editing. Shared types (Y.Doc, Y.XmlFragment) for TipTap integration. Sub-document support. Awareness protocol for cursors. | HIGH |
| y-websocket | 3.0.x | WebSocket provider for Yjs | Current stable 3.0.0 (verified npm). **Major version jump from v2**. Client-server model for Yjs document sync. Room-based document isolation. Built-in persistence hooks. | HIGH |

**Path:** Mounted on separate HTTP upgrade path at `/yjs/` (custom). The y-websocket server runs its own `ws` WebSocket server alongside NestJS's Socket.io server on the same HTTP server, differentiated by URL path.

**Coexistence pattern:**
```typescript
// In NestJS bootstrap
const server = app.getHttpServer();
// Socket.io handles /socket.io/ path (NestJS gateway default)
// y-websocket handles /yjs/ path (custom ws server)
const wss = new WebSocket.Server({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/yjs/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      // y-websocket connection handling
    });
  }
  // Socket.io handles its own upgrades via /socket.io/ path
});
```

### Frontend Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.2.x | UI library | Current stable 19.2.5 (verified npm). React 19 with concurrent features, use() hook, server components (not needed here but stable). | HIGH |
| Vite | 8.0.x | Build tool + dev server | Current stable 8.0.8 (verified npm). Fast HMR, native ESM, React plugin. Superior DX over CRA/webpack. | HIGH |
| TypeScript | 5.7+ | Type safety | Shared types between backend/frontend in monorepo. | HIGH |

### Rich Text Editor

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@tiptap/react` | 3.22.x | React TipTap editor | Current stable 3.22.3 (verified npm). Headless, extensible, ProseMirror-based. | HIGH |
| `@tiptap/extension-collaboration` | 3.22.x | Yjs integration for TipTap | Connects TipTap to Y.Doc. Configures shared XML fragment for CRDT sync. Disables built-in undo/redo (Yjs handles it). | HIGH |
| `@tiptap/extension-collaboration-cursor` | 3.22.x | Cursor awareness in TipTap | Shows other users' cursors and selections with colors/labels. Uses Yjs Awareness protocol. | HIGH |
| `@tiptap/starter-kit` | 3.22.x | Base extensions | Paragraphs, headings, bold, italic, lists, code blocks. Disable `history` when using collaboration. | HIGH |

**TipTap + Yjs pattern:**
```typescript
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import StarterKit from '@tiptap/starter-kit'

const editor = useEditor({
  extensions: [
    StarterKit.configure({ history: false }), // Yjs handles undo/redo
    Collaboration.configure({ document: ydoc }),
    CollaborationCursor.configure({
      provider: wsProvider,
      user: { name: 'User', color: '#22D3EE' },
    }),
  ],
})
```

### Drag-and-Drop

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@dnd-kit/react` | 0.3.x | Drag-and-drop for React | Current stable 0.3.2 (verified npm, released 2026-02-19). **New API** — replaces legacy `@dnd-kit/core` + `@dnd-kit/sortable`. Uses `DragDropProvider`, `useSortable` with `ref` pattern (not `setNodeRef`). 0.4.0 in active beta. | MEDIUM |
| `@dnd-kit/helpers` | 0.3.x | Utility functions | `move()` helper for state updates. Companion to `@dnd-kit/react`. | MEDIUM |

**Why MEDIUM confidence on @dnd-kit:** Version 0.3.x is pre-1.0. The new API (`DragDropProvider`, `useSortable` with `group` property) is documented and actively maintained with daily beta releases toward 0.4.0. The API is designed specifically for Kanban boards (multi-list with `group` prop, `accept` type filtering). Risk is minor breaking changes before 1.0, but the core patterns are stable. The legacy `@dnd-kit/core` (6.3.1) + `@dnd-kit/sortable` (10.0.0) still work but the new `@dnd-kit/react` is the recommended path.

**Key Kanban pattern (new API):**
```tsx
// useSortable with group property — purpose-built for Kanban
const { ref, isDragging } = useSortable({
  id: card.id,
  index,
  group: listId,      // Groups items by column
  type: 'card',
  accept: 'card',     // Only accepts cards, not columns
});
```

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.x | Client-side state | Current stable 5.0.12 (verified npm). **Zustand v5 breaking change**: persist middleware no longer auto-stores initial state — must call `setState` explicitly after creation. Minimal boilerplate, React hook-based, middleware (devtools, persist, immer). For UI state: current board, selected card, sidebar toggle. | HIGH |
| `@tanstack/react-query` | 5.99.x | Server state + cache | Current stable 5.99.0 (verified npm). Manages REST API data fetching, caching, optimistic mutations. Automatic cache invalidation on WebSocket events. `useMutation` with `onMutate`/`onError`/`onSettled` for optimistic updates + rollback. | HIGH |

**State boundary rule:**
- **Zustand** = UI state (which card is open, sidebar position, cursor positions, connection status)
- **TanStack Query** = Server state (boards, lists, cards from REST API)
- **Yjs** = Collaborative state (card description documents only)
- **Socket.io events** = Trigger TanStack Query invalidations (e.g., `queryClient.invalidateQueries(['board', boardId])`)

### Animation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `motion` | 12.38.x | Animation library | Current stable 12.38.0 (verified npm). **Renamed from `framer-motion`** — `framer-motion` is now a re-export of `motion`. Import from `motion/react` not `framer-motion`. Layout animations for card reordering, `AnimatePresence` for mount/unmount, spring physics for drag feedback. | HIGH |

**Import change (critical):**
```typescript
// OLD (deprecated import path)
import { motion, AnimatePresence } from 'framer-motion'

// NEW (correct import)
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
```

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TailwindCSS | 4.2.x | Utility-first CSS | Current stable 4.2.2 (verified npm). **Tailwind v4 is a major rewrite** — CSS-first configuration (no `tailwind.config.js`), `@import "tailwindcss"` in CSS, `@theme` directive for custom values. Dark-only theme maps cleanly to Tailwind's dark mode utilities. | HIGH |

### Monorepo Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Turborepo | 2.9.x | Build orchestration | Current stable turbo 2.9.6 (verified npm). Task caching, parallel execution, dependency-aware builds. `turbo.json` defines task graph. | HIGH |
| pnpm | 10.33.x | Package manager | Current stable 10.33.0 (verified npm). Workspace protocol (`workspace:*`), strict dependency resolution, disk-efficient via content-addressable store. | HIGH |

**Monorepo structure:**
```
flowboard/
  apps/
    api/          # NestJS backend
    web/          # Vite + React frontend
  packages/
    shared/       # Shared TypeScript types, constants
    eslint-config/ # Shared ESLint config
    tsconfig/     # Shared TypeScript configs
  pnpm-workspace.yaml
  turbo.json
  package.json
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend | NestJS 11 | Express + custom structure | NestJS provides WebSocket gateway, DI, guards, decorators out of the box. Express would require manual architecture for same features. |
| ORM | Prisma 7 | TypeORM, Drizzle | Prisma: best type safety, cleanest schema DSL, migration tooling. TypeORM: heavier, less idiomatic TS. Drizzle: excellent but smaller ecosystem, less battle-tested with NestJS. |
| CRDT | Yjs | Automerge | Yjs: battle-tested with TipTap, larger ecosystem of providers, better performance for text editing. Automerge: better for structured data but weaker editor integration. |
| DnD | @dnd-kit/react | react-beautiful-dnd, react-dnd | react-beautiful-dnd: **deprecated/unmaintained** (Atlassian stopped development). react-dnd: lower-level, more boilerplate. @dnd-kit new API has first-class Kanban support. |
| State | Zustand + TanStack Query | Redux Toolkit, Jotai | Redux: overkill for this scope. Jotai: atomic model less intuitive for board-level state. Zustand + TanStack Query gives clean client/server state separation. |
| Animation | motion (Framer Motion) | react-spring, auto-animate | motion: best layout animation support (`layout` prop for card reordering), `AnimatePresence` for exit animations, spring physics. react-spring: good but no layout animations. |
| Build | Vite 8 | Next.js, webpack | Vite: fastest HMR, SPA is fine (no SSR needed for portfolio). Next.js: adds SSR complexity without benefit for single-board SPA. |
| CSS | Tailwind 4 | CSS Modules, styled-components | Tailwind: fastest iteration for utility-driven dark theme. Consistent spacing/color tokens. |
| DnD (legacy) | @dnd-kit/react 0.3.x | @dnd-kit/core 6.x + @dnd-kit/sortable 10.x | Legacy API works but new API is cleaner for Kanban (group prop, DragDropProvider). Migration path is documented. Risk: 0.x version, but actively maintained with daily releases. |

---

## Installation

```bash
# Root (monorepo tooling)
pnpm add -Dw turbo typescript

# Backend (apps/api)
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/websockets @nestjs/platform-socket.io @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @prisma/client ioredis @socket.io/redis-adapter
pnpm add yjs y-websocket ws
pnpm add -D prisma @types/ws @nestjs/cli

# Frontend (apps/web)
pnpm add react react-dom
pnpm add @tanstack/react-query zustand
pnpm add @dnd-kit/react @dnd-kit/helpers
pnpm add motion
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
pnpm add yjs y-websocket
pnpm add socket.io-client
pnpm add -D vite @vitejs/plugin-react tailwindcss typescript @types/react @types/react-dom

# Shared types (packages/shared)
# No runtime deps — only TypeScript interfaces/types
pnpm add -D typescript
```

---

## Version Summary Table

| Package | Verified Version | Source |
|---------|-----------------|--------|
| `@nestjs/core` | 11.1.18 | npm registry |
| `prisma` + `@prisma/client` | 7.7.0 | npm registry |
| `socket.io` / `socket.io-client` | 4.8.3 | npm registry + Context7 |
| `yjs` | 13.6.30 | npm registry |
| `y-websocket` | 3.0.0 | npm registry |
| `@dnd-kit/react` + `@dnd-kit/helpers` | 0.3.2 | npm registry |
| `zustand` | 5.0.12 | npm registry |
| `@tanstack/react-query` | 5.99.0 | npm registry |
| `@tiptap/react` | 3.22.3 | npm registry |
| `motion` | 12.38.0 | npm registry |
| `turbo` | 2.9.6 | npm registry |
| `pnpm` | 10.33.0 | npm registry |
| `vite` | 8.0.8 | npm registry |
| `tailwindcss` | 4.2.2 | npm registry |
| `react` | 19.2.5 | npm registry |
| `ioredis` | 5.10.1 | npm registry |
| `@socket.io/redis-adapter` | 8.3.0 | npm registry |

---

## Critical Version Gotchas

### 1. Prisma 7 — New Generator Provider
```prisma
// v6: provider = "prisma-client-js"
// v7: provider = "prisma-client"
generator client {
  provider = "prisma-client"
  output   = "../generated/client"  // output now required
}
```
Many tutorials still show v6 syntax. Use `prisma-client` not `prisma-client-js`.

### 2. motion — Renamed from framer-motion
```typescript
// Package name is "motion", import from "motion/react"
// "framer-motion" still works as re-export but is deprecated
import { motion, AnimatePresence } from 'motion/react'
```

### 3. @dnd-kit — New React API (0.x)
```diff
- import { useSortable } from '@dnd-kit/sortable'
- import { DndContext } from '@dnd-kit/core'
+ import { useSortable } from '@dnd-kit/react/sortable'
+ import { DragDropProvider } from '@dnd-kit/react'
```
The new API is a complete rewrite. Old tutorials won't match. Refer to dndkit.com migration guide.

### 4. Zustand v5 — Persist Middleware Change
Initial state is no longer auto-persisted. Must call `setState` explicitly after store creation if you need initial values persisted.

### 5. Tailwind CSS v4 — No Config File
```css
/* v4: CSS-first configuration, no tailwind.config.js */
@import "tailwindcss";
@theme {
  --color-cyan-accent: #22D3EE;
}
```

### 6. y-websocket v3 — Major Version
Updated from v2. Check for any API changes in provider initialization.

---

## Sources

- NestJS docs: Context7 `/nestjs/docs.nestjs.com` (HIGH reputation, 3647 snippets)
- Yjs docs: Context7 `/yjs/yjs` (HIGH reputation, benchmark 90.77)
- @dnd-kit docs: Context7 `/clauderic/dnd-kit` + `/websites/dndkit` (migration guide)
- Zustand docs: Context7 `/pmndrs/zustand` (v5 migration guide)
- TanStack Query docs: Context7 `/tanstack/query` (v5 optimistic updates)
- Turborepo docs: Context7 `/vercel/turborepo` (pnpm workspace config)
- Prisma docs: Context7 `/prisma/prisma` (v7 schema changes)
- Socket.IO docs: Context7 `/websites/socket_io` (v4.8.1+ confirmed, Redis adapter)
- TipTap docs: Context7 `/ueberdosis/tiptap-docs` (Yjs collaboration setup)
- Motion docs: Context7 `/websites/motion_dev` (layout animations, rename from framer-motion)
- All versions: npm registry (verified 2026-04-11)
