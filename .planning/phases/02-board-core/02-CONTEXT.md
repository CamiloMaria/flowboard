# Phase 2: Board Core - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view, create, edit, and reorganize cards across lists with drag-and-drop, with all changes broadcast to connected clients in real-time. Covers REST API CRUD for boards/lists/cards, frontend Kanban board UI, @dnd-kit drag-and-drop with fractional indexing, optimistic updates with rollback, and Socket.io event broadcasting. Collaborative editing (TipTap + Yjs) and presence (cursors, heartbeats) are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Card Appearance on Board
- **D-01:** Cards show title text with a colored top stripe from `coverColor`. Minimal density -- no avatar, no description preview, no metadata on the card face. Similar to Linear's issue cards.
- **D-02:** List names are editable by clicking directly on them (inline edit). "Add card" button at the bottom of each list.
- **D-03:** "+ Add List" ghost column at the right edge of the board. Click to type a name, Enter to create.

### Card Detail Modal
- **D-04:** Clicking a card opens a centered overlay modal with backdrop dimming. Close via Escape key, clicking outside, or X button.
- **D-05:** Modal shows: editable title (click-to-edit at top), plain textarea for description (placeholder for TipTap in Phase 3), list name breadcrumb, created date.
- **D-06:** Title is editable in both the modal and inline on the board. Both use the same PATCH endpoint.
- **D-07:** Description editor is a plain textarea in Phase 2 editing `description_text`. Gets replaced by TipTap + Yjs in Phase 3 -- the modal container and layout stay the same, only the editor component swaps.

### Inline Title Editing
- **D-08:** Agent's discretion on the exact interaction pattern (click-to-edit, pencil icon on hover, or double-click). Pick the most intuitive approach.

### DnD Visual Feedback
- **D-09:** Drag overlay is a slightly scaled-up (1.02-1.05x) clone with elevated shadow and subtle rotation (1-2 deg). Original position shows a faded placeholder. Matches DND-03 spec (lift effect).
- **D-10:** Drop zones show a colored line (accent cyan #22D3EE) between cards at the target insertion point. Target column gets a subtle border/background highlight.
- **D-11:** Board auto-scrolls horizontally when drag cursor enters a 60-80px zone at board edges. Essential for boards with enough lists to overflow the viewport.
- **D-12:** Remote card moves (from other users via Socket.io) animate smoothly from old position to new position with a spring transition (200-300ms). Other cards in the column shift smoothly via motion's layout animation.

### Real-time Sync Strategy
- **D-13:** Socket.io events carry the full updated entity. Frontend applies changes directly to TanStack Query cache via `queryClient.setQueryData`. No server refetch -- instant UI update.
- **D-14:** Socket.io events scoped to per-board rooms. Client emits `board:join` with boardId on connect. Server broadcasts only to clients in the same board room. Gateway room infrastructure already scaffolded.
- **D-15:** Optimistic updates use TanStack Query's `useMutation` with `onMutate` (snapshot + apply), `onError` (revert to snapshot with ease-out animation + toast), `onSettled` (re-sync from server).
- **D-16:** Subtle connection status indicator in board header: green/yellow/red dot showing connected/reconnecting/disconnected state.

### Agent's Discretion
- Exact inline title editing trigger pattern (D-08)
- NestJS module boundaries (BoardModule, ListModule, CardModule or combined)
- Exact card component hierarchy and file organization
- Loading skeleton design for initial board fetch
- Empty list state appearance
- Toast notification library/component choice
- Exact auto-scroll speed curve
- Card delete confirmation (inline or skip for speed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` -- Color palette (accent #22D3EE for drop indicators, cursor colors section), typography (Space Grotesk + DM Sans), spacing, component patterns. Dark-only theme constraints. Card design patterns.

### Architecture & Stack
- `design-doc.md` -- Dual WebSocket architecture, demo bot architecture, fractional indexing strategy (FLOAT with rebalancing), optimistic update failure modes.
- `.planning/research/STACK.md` -- Verified package versions: @dnd-kit/react 0.3.2 (new API: DragDropProvider, useSortable with ref pattern), zustand 5.0.12 (persist middleware breaking change), @tanstack/react-query 5.99.0 (useMutation optimistic pattern), motion 12.38.0 (import from motion/react, layout animations), socket.io-client 4.8.3.

### Pitfalls
- `.planning/research/PITFALLS.md` -- Phase 2 relevant: @dnd-kit 0.3 concurrent update handling, fractional indexing precision limits, optimistic update rollback edge cases.

### Phase 1 Foundation
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` -- Auth guard patterns (D-07: @UseGuards, @Public, @CurrentUser), DTO validation patterns, API prefix convention, dual WebSocket setup.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **API client:** `apps/web/src/lib/api.ts` -- `apiGet`, `apiPost`, `apiPut`, `apiDelete` with auto Bearer token, cookie credentials, JSON parsing
- **Socket.io client:** `socket.io-client` already in web dependencies
- **Tailwind tokens:** Custom dark theme tokens in `apps/web/src/app.css` (surface-primary, surface-secondary, surface-tertiary, text-primary, text-secondary, accent, accent-hover, font-display, font-body)
- **Auth decorators:** `@Public()`, `@CurrentUser()` in `apps/api/src/auth/decorators/`
- **WS event names:** All board events pre-defined in `packages/shared/src/ws-events.types.ts` (board:join, board:leave, card:move, card:create, card:update, card:delete, list:create, list:update, list:delete)
- **Board types:** Basic interfaces in `packages/shared/src/board.types.ts` (Board, List, Card) -- need extending with composite types and event payloads
- **Board gateway:** `apps/api/src/websocket/board.gateway.ts` -- scaffolded with auth middleware, needs room management and event handlers
- **Seed data:** `apps/api/prisma/seed.ts` -- demo board with 5 lists, 17 cards, 3 bot users. Position convention: `(index + 1) * 1000`

### Established Patterns
- NestJS modules: `@Global()` for PrismaModule and RedisModule. Feature modules imported in AppModule
- DTOs: `class-validator` decorators enforced by global `ValidationPipe` (whitelist: true, forbidNonWhitelisted: true)
- Auth: Global JwtAuthGuard (all endpoints protected by default). Use `@Public()` for open endpoints
- Testing: E2E with supertest + Jest against full AppModule. Clean tables in FK order in beforeEach. 30s timeout for beforeAll
- Prisma client import: `from '../generated/prisma/client'`

### Integration Points
- New board/list/card modules register in `apps/api/src/app.module.ts`
- New pages/routes register in `apps/web/src/App.tsx` (React Router v7)
- Board gateway handlers extend `apps/api/src/websocket/board.gateway.ts`
- Shared types extend `packages/shared/src/board.types.ts` and `ws-events.types.ts`
- New frontend deps needed: `zustand`, `@tanstack/react-query`, `@dnd-kit/react`, `@dnd-kit/helpers`, `motion`

</code_context>

<specifics>
## Specific Ideas

- Cards should feel like Linear's issue cards -- clean, not cluttered. Colored top stripe from coverColor field.
- The board is the centerpiece for recruiter demos. DnD polish (ghost card lift effect, gap indicators, smooth layout animations) directly impacts first impression.
- Remote card moves animating smoothly in a second browser tab is the key "wow moment" for Phase 2 -- invest in getting this right.
- Plain textarea for description in Phase 2 is a deliberate stepping stone. The modal layout should be designed so the TipTap editor drops in as a component swap in Phase 3.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 02-board-core*
*Context gathered: 2026-04-12*
