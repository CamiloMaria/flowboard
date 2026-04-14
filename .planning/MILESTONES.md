# Milestones

## v1.0 MVP (Shipped: 2026-04-14)

**Phases completed:** 5 phases, 27 plans, 51 tasks

**Key accomplishments:**

- Turborepo + pnpm monorepo with NestJS API (health endpoint), Vite React frontend (proxy config), shared types package, and Docker Compose for PostgreSQL 16 + Redis 7
- Prisma 7 schema with 5 models (User, Board, List, Card, RefreshToken), global PrismaModule and RedisModule for NestJS DI, and prisma.config.ts for Prisma 7 datasource configuration
- React Router v7 with 4 routes, Tailwind v4 CSS-first dark theme tokens from DESIGN.md, and typed API fetch helper with in-memory Bearer token storage
- Socket.io and y-websocket coexist on same NestJS HTTP server via capture-then-remove upgrade dispatcher pattern, validated by 4 E2E tests
- Full JWT auth with bcrypt 12-round password hashing, refresh token rotation via HTTP-only cookies, global APP_GUARD with @Public() bypass, and Socket.io handshake auth middleware
- Guest JWT endpoint (POST /api/auth/guest) with 24h ephemeral tokens and idempotent seed script creating 3 bots, demo board, 5 lists, 17 cards
- Frontend infrastructure with Zustand UI store, TanStack Query provider, Socket.io client singleton, extended shared types (BoardWithLists, WsEventMap), and full DESIGN.md Tailwind v4 token system
- Board/list/card REST API with fractional indexing, position rebalancing, and Socket.io event broadcasting to per-board rooms
- Read-only board page with TanStack Query data fetching, 280px column layout, coverColor-striped cards, shimmer skeleton, and 3-state connection indicator
- Full list/card CRUD with TanStack Query optimistic mutations, inline editing, card detail modal with editable title/description/delete, toast notifications, and AddListGhost column
- @dnd-kit/react 0.3.x cross-list card sorting with fractional indexing, drag overlay ghost card, drop zone indicators, optimistic moves with revert toast, board auto-scroll, and motion layout animations
- Socket.io board room connection with 7 event handlers updating TanStack Query cache directly, AnimatePresence animations for remote card/list mutations, and useReducedMotion accessibility hook
- Socket.io broadcast exclusion via X-Socket-Id header eliminates cross-list card duplication, success-only cache invalidation prevents page crash on move failure, and disabled useSortable placeholder enables drops into empty lists
- Presence type contracts (OnlineUser, CursorPosition, PresenceCursorPayload, CoEditorInfo) in @flowboard/shared with fully typed WsEventMap
- CollabModule with y-protocols sync, PostgreSQL BYTEA persistence (last-disconnect + 30s debounce), plaintext fallback, and D-15 migration
- TipTap CRDT editor with Yjs sync, floating format toolbar, co-editor avatars, and reconnect banner replacing textarea in CardDetailModal
- Redis-backed presence tracking with Figma-style remote cursors (glow + idle breathe) and animated online user avatars in board header
- TypeScript compilation passes for both API and Web apps, Prisma schema in sync, dev server boots successfully — ready for manual real-time collaboration testing
- Velocity-based card drag rotation, cursor ghost traces, and column cascade stagger — premium animations for the bot choreography demo
- NestJS DemoModule with 3-bot lifecycle (start on guest join, 45s grace period), guest read-only guards on all mutations, and AbortController for choreography
- 60-second scripted choreography with Bezier cursor arcs, parallel card moves, CRDT editing climax, and perpetual random weighted behavior
- DemoBanner with live demo text, Sign Up CTA, sessionStorage dismiss, and skeleton-to-board seamless transition
- Auto-approved: demo mode infrastructure complete with all TypeScript checks passing and unit tests green
- Multi-stage Dockerfile with auto-migrate/seed, production Docker Compose with health-gated startup, and enhanced /api/health endpoint checking DB + Redis connectivity
- GitHub Actions CI/CD pipeline, manual deploy script, and Nginx reverse proxy with three proxy locations (REST, Socket.io WebSocket, y-websocket CRDT) for Oracle Cloud deployment
- Vercel SPA config with immutable asset caching and VITE_API_URL environment variable wired into api.ts, socket.ts, and useYjsProvider.ts for cross-origin production deployment
- Portfolio-quality README with hero demo link, Shield.io badges, first-person technical narrative, Mermaid architecture diagram showing dual WebSocket paths, and numbered getting started guide

---
