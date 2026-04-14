# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a working monorepo with NestJS API and Vite React frontend running locally via `pnpm dev`, PostgreSQL database with Prisma 7 schema (users, boards, lists, cards), dual WebSocket transports (Socket.io on `/socket.io/` + y-websocket on `/yjs/`) coexisting on the same NestJS HTTP server, and JWT auth with register/login/refresh token rotation and guest access for the demo board.

</domain>

<decisions>
## Implementation Decisions

### Monorepo Structure
- **D-01:** Standard Turborepo layout: `apps/api` (NestJS), `apps/web` (Vite React), `packages/shared` (TypeScript types/interfaces only, no runtime deps). Root `turbo.json` defines task graph (`build`, `dev`, `lint`, `test`).
- **D-02:** pnpm workspaces with `workspace:*` protocol for inter-package references. Shared package uses Just-in-Time compilation (TypeScript source imported directly, no separate build step).
- **D-03:** Root `pnpm dev` starts both apps concurrently via Turborepo. NestJS on port 3001, Vite dev server on port 5173 with proxy config forwarding `/api/*`, `/socket.io/*`, and `/yjs/*` to the backend.

### Auth Token Strategy
- **D-04:** JWT access tokens with 15-minute expiry, stored in memory (not localStorage). Refresh tokens with 7-day expiry, stored in HTTP-only secure cookies with SameSite=Lax.
- **D-05:** Refresh token rotation: each use issues a new refresh token and invalidates the old one. Refresh tokens stored in DB (or Redis) for revocation capability.
- **D-06:** Password hashing with bcrypt (12 rounds). Email field is case-insensitive (normalize to lowercase on register/login).
- **D-07:** NestJS guards pattern: `@UseGuards(JwtAuthGuard)` on protected endpoints, `@Public()` decorator for open endpoints, `@CurrentUser()` param decorator to inject user from JWT.

### Dual WebSocket Pattern
- **D-08:** Socket.io handled by NestJS `@WebSocketGateway()` with the default Socket.io adapter. y-websocket handled by a raw `ws.Server` with `noServer: true` configured in `main.ts`.
- **D-09:** Manual HTTP upgrade handler in `main.ts`: intercept `upgrade` event, route by URL path. Requests to `/yjs/*` go to the ws.Server; Socket.io handles its own `/socket.io/` upgrades automatically. Must remove conflicting upgrade listeners if NestJS adds them.
- **D-10:** The dual WebSocket spike is the highest-risk element. Validate coexistence BEFORE building any features on top. If it doesn't work, the entire architecture needs rethinking.

### Guest Flow Design
- **D-11:** Visiting `/demo` route on the frontend triggers a call to `POST /api/auth/guest` which returns a guest JWT. No DB row created. JWT contains `{ sub: uuid(), name: "Guest-{short_id}", color: randomFromPalette(), role: "guest", exp: 24h }`.
- **D-12:** Guest JWTs use the same signing key as regular JWTs. The `role: "guest"` claim is checked by guards to restrict mutations. Guests can observe but not modify board state.
- **D-13:** Guest color is randomly selected from the 8-slot user color palette defined in DESIGN.md (excluding colors already assigned to bots).

### Database Schema
- **D-14:** Prisma 7 with `prisma-client` generator (NOT `prisma-client-js` — breaking change from v6). Schema defines 4 core tables: users, boards, lists, cards. UUIDs as primary keys. FLOAT for position columns. BYTEA for `description_yjs`.
- **D-15:** Indexes: `(list_id, position)` on cards, `(board_id, position)` on lists, partial index on `boards(is_demo) WHERE is_demo = true`.
- **D-16:** Seed script creates demo board with `is_demo: true`, 5 lists (Backlog, To Do, In Progress, Review, Done), 17 cards with realistic software project titles, and 3 bot user records (Maria, Carlos, Ana with assigned colors from palette).

### Agent's Discretion
- Exact NestJS module boundaries (AuthModule, BoardModule, etc.) — follow NestJS conventions
- Docker Compose service names and network config — standard patterns
- ESLint/Prettier configuration — use NestJS defaults + Vite React defaults
- TypeScript tsconfig paths and project references — standard monorepo patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` -- Color palette (cursor colors section), typography, spacing, component patterns. Dark-only theme constraints.

### Architecture
- `design-doc.md` -- Dual WebSocket architecture decision, demo bot architecture, guest user model, fractional indexing strategy, CRDT scope, optimistic update failure modes.
- `.planning/research/ARCHITECTURE.md` -- System structure, component boundaries, data flow diagrams, NestJS module layout.

### Stack & Versions
- `.planning/research/STACK.md` -- Verified package versions (2026-04-11), installation commands, critical version gotchas (Prisma 7 generator, motion rename, Tailwind v4 config).

### Pitfalls
- `.planning/research/PITFALLS.md` -- 16 domain-specific pitfalls. Phase 1 relevant: #1 (upgrade handler collision), #5 (NestJS gateway vs manual handler), #9 (shared types build order), #12 (WebSocket auth middleware), #16 (Prisma client generation in monorepo).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None (greenfield project)

### Established Patterns
- None yet — this phase establishes the foundational patterns

### Integration Points
- Vite proxy config will forward API and WebSocket paths to NestJS backend
- Shared types package will export interfaces consumed by both apps

</code_context>

<specifics>
## Specific Ideas

- The dual WebSocket spike should be done as the FIRST implementation task — if Socket.io and y-websocket can't coexist, everything else is blocked.
- Bot user records (Maria, Carlos, Ana) are real DB rows in the users table with pre-assigned colors from the palette. They are NOT guest users — they are seeded as regular users with `is_bot: true` flag (or identified by convention).
- The demo board seed should include realistic software project card titles that feel authentic (not "Test Card 1").

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-04-11*
