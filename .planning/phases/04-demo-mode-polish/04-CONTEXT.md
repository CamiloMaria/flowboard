# Phase 4: Demo Mode & Polish - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

A recruiter visits `/demo` and sees compelling live collaboration (bots moving cards, typing in editors, cursors roaming) with polished animations — all within 5 seconds of landing. Covers: server-side bot choreography (scripted 60-second sequence + random weighted behavior), demo board lifecycle (trigger, protection, shutdown), animation refinements (card drag rotation, cursor ghost trace, cascade stagger), and demo UI (banner, first-load experience). Does NOT cover new UI components, features, or pages beyond the demo flow.

</domain>

<decisions>
## Implementation Decisions

### Bot Choreography Script
- **D-01:** Parallel wow-first approach — when a guest arrives, multiple bots should already be visibly active (cursors moving, cards being dragged, typing happening simultaneously). The recruiter must hit "whoa, there are people here" within the first 3 seconds. Then layer in specific feature showcases (collaborative editing, drag sync across lists).
- **D-02:** Cursor movement style: smooth arcs with pauses. Cursors move in curved paths to their target (not straight lines), pause briefly on arrival as if reading/deciding, then act. Slightly randomized timing to mimic human mouse behavior. This sells "these are real people."
- **D-03:** After the 60-second scripted phase, bots switch to low-frequency natural behavior — one bot action every 5-10 seconds (randomized). Maria prefers card moves, Carlos prefers typing, Ana prefers labels/cursor roaming. Feels like a calm team in flow state. Won't overwhelm a recruiter who stays past 60 seconds.
- **D-04:** Collaborative editing (two cursors in same card) happens during the scripted phase ONLY — one carefully choreographed moment where Carlos opens a card and Maria joins to type simultaneously, showing character-level CRDT sync. Random phase sticks to card moves and cursor roaming (no card-opening). This avoids awkward timing conflicts in random mode.

### Demo Lifecycle & Protection
- **D-05:** Bots trigger on first guest join — detected via `board:join` in the Board Gateway when a user joins the demo board room. If bots are already running (another guest watching), the new guest sees ongoing activity as-is. No restart or reset per guest.
- **D-06:** Read-only guests — guests can observe the demo board but cannot create, edit, move, or delete anything. Guards check `role === 'guest'` on all mutation endpoints for the demo board. Clean separation: bots perform, guests watch.
- **D-07:** Grace period then stop — after the last guest disconnects from the demo board, bots continue for 30-60 seconds (grace period for tab refreshes/link sharing), then cleanly stop. Bots clear their presence from Redis on stop. Next guest joining triggers a fresh choreography from the beginning.

### Animation Refinements
- **D-08:** Implement card drag rotation per DESIGN.md — +/-2deg tilt based on horizontal drag velocity during drag. Uses `spring(1, 80, 12)` for drag follow with 40ms lag. Small detail that adds physical weight and makes the interaction feel premium.
- **D-09:** Implement full cursor ghost trace per DESIGN.md — two-phase exit animation. Phase 1: cursor arrow + name label fade out over 400ms. Phase 2: standalone glow dot at last cursor position lingers for 600ms before fading. Requires a separate "ghost" element that persists after the cursor component unmounts via AnimatePresence.
- **D-10:** Implement column card cascade stagger per DESIGN.md — when a card is added/removed from a column, sibling cards stagger their layout shift with 30ms offset between each card. Total transition 200ms. Especially visible during bot choreography when cards move between lists.

### Demo Banner & Guest UX
- **D-11:** Single "Sign Up" CTA on demo banner — no "Try Demo" button since the guest IS already in the demo. Banner text: "You're watching a live demo — real-time collaboration powered by WebSockets & CRDTs." Link goes to `/register`. Per DESIGN.md: fixed top, full-width, `bg-elevated` + `accent` left border, 40px height.
- **D-12:** Skeleton then instant activity on first load — show BoardSkeleton (already exists) during guest JWT creation + board fetch. Once board renders, bots should already be visibly active (cursors moving, presence avatars shown). No "waiting for bots to start" gap. Target: board + bots visible within 2-3 seconds of landing on `/demo`.
- **D-13:** Banner dismiss persists via sessionStorage — matches DESIGN.md spec. Dismissed within same browser session, comes back on new tabs/sessions. X button dismisses.

### Claude's Discretion
- Exact timing intervals within the 60-second choreography script (which actions at which seconds)
- Specific card targets for bot actions during choreography (which of the 17 seeded cards)
- Bot cursor path generation algorithm (Bezier curves, waypoints, etc.)
- Grace period exact duration (30-60 second range)
- NestJS module structure for DemoModule (standalone vs extending existing modules)
- Exact spring physics params for ghost trace glow fade
- Cascade stagger implementation approach (motion staggerChildren vs manual delay)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System & Animation Specs
- `DESIGN.md` — Motion system (lines 265-330): spring params for drag follow, drop settle, cursor movement, idle breathe, card cascade stagger. Demo mode visual treatment (lines 477-497): banner spec, bot indistinguishability requirement. Anti-patterns (lines 513-521): no glassmorphism, no pure white/black.

### Architecture & Bot Design
- `design-doc.md` — Demo bot architecture (server-side direct service calls), dual WebSocket architecture, CRDT scope, guest user model.
- `.planning/research/ARCHITECTURE.md` — NestJS module structure, service injection patterns, data flow diagrams.

### Stack & Versions
- `.planning/research/STACK.md` — motion 12.38.0 (import from `motion/react`), Tailwind v4 CSS-first config, AnimatePresence patterns.

### Phase Dependencies
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — D-11/D-12/D-13 (guest JWT: random name/color, no DB row, `role: "guest"`, 24h expiry), D-16 (seed: 3 bot users Maria/Carlos/Ana with colors, demo board with `isDemo: true`).
- `.planning/phases/02-board-core/02-CONTEXT.md` — D-13/D-14 (Socket.io events carry full entity, per-board rooms), D-12 (remote card moves animate via spring transition).
- `.planning/phases/03-real-time-collaboration/03-CONTEXT.md` — D-05/D-06/D-07/D-08 (Figma-style cursors with glow, idle breathe, exit animation), D-13/D-14 (Yjs modal lifecycle), D-20/D-21/D-22 (Redis presence: HSET with TTL, cursor broadcast via Socket.io).

### Requirements
- `.planning/REQUIREMENTS.md` — DEMO-01 through DEMO-06, PLSH-01 through PLSH-07.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DemoPage:** `apps/web/src/pages/DemoPage.tsx` — Guest JWT creation + redirect to demo board. Route `/demo` wired in App.tsx. Needs bot start trigger + banner addition.
- **Guest JWT:** `apps/api/src/auth/auth.service.ts:142` — `generateGuestToken()` creates ephemeral JWTs with random UUID, name, color, `role: "guest"`, 24h expiry.
- **Bot seed data:** `apps/api/prisma/seed.ts` — 3 bot users (Maria/#F472B6, Carlos/#4ADE80, Ana/#A78BFA) with `isBot: true`. Demo board UUID `00000000-0000-0000-0000-000000000000`, 5 lists, 17 cards.
- **Color constants:** `packages/shared/src/colors.ts` — BOT_COLORS (3 colors), USER_COLORS (5), GUEST_COLORS. Exported from `@flowboard/shared`.
- **BoardService:** `apps/api/src/board/board.service.ts` — `moveCard()`, `createCard()`, `updateCard()`, `deleteCard()` methods. Bots call these directly.
- **BoardGateway:** `apps/api/src/websocket/board.gateway.ts` — `broadcastToBoard(boardId, event, payload, excludeSocketId?)`. Bots call with no excludeSocketId.
- **PresenceService:** `apps/api/src/presence/presence.service.ts` — `setOnline()`, `setOffline()`, `refreshHeartbeat()`, `getOnlineUsers()`. Redis HSET with 10s TTL.
- **Toast system:** `apps/web/src/components/ui/ToastProvider.tsx` + `Toast.tsx` — Full toast system with `useToast()` hook. PLSH-07 already complete.
- **BoardSkeleton:** `apps/web/src/components/board/BoardSkeleton.tsx` — Shimmer loading skeleton. PLSH-06 already complete.
- **RemoteCursor:** `apps/web/src/components/presence/RemoteCursor.tsx` — Renders remote cursors with glow, idle breathe. Exit fade 400ms exists, ghost trace NOT yet implemented.
- **useReducedMotion:** `apps/web/src/hooks/useReducedMotion.ts` — Accessibility hook for `prefers-reduced-motion`. Used consistently.
- **CardItem motion:** `apps/web/src/components/board/CardItem.tsx` — `spring(200, 25, 0.8)` layout animation. Drag rotation NOT yet implemented.

### Established Patterns
- **Service → Gateway broadcast:** Controller calls BoardService method, then BoardGateway.broadcastToBoard(). Bots use the same pattern minus the controller layer.
- **Socket.io events:** Full entity payloads, per-board rooms, X-Socket-Id header for exclusion.
- **Animation:** `motion/react` with spring physics, AnimatePresence for enter/exit, layout prop for reflow, useReducedMotion for accessibility.
- **State split:** Zustand (UI/presence), TanStack Query (server state), Socket.io events → cache invalidation.

### Integration Points
- **New DemoModule:** `apps/api/src/demo/` — injects BoardService, BoardGateway, PresenceService, CollabService, PrismaService.
- **BoardGateway extension:** Detect demo board join in `handleJoinBoard()`, notify DemoService to start bots.
- **DemoPage enhancement:** Trigger bot start mechanism, add DemoBanner component.
- **DemoBanner:** `apps/web/src/components/demo/DemoBanner.tsx` — new component, rendered on BoardPage when `board.isDemo === true`.
- **CardItem enhancement:** Add rotation transform during drag based on velocity.
- **RemoteCursor enhancement:** Add ghost trace element for two-phase exit animation.
- **BoardCanvas enhancement:** Add stagger delay to card layout animations within columns.

</code_context>

<specifics>
## Specific Ideas

- The parallel wow-first approach means bots must be visibly active the instant the board renders. The choreography script should have bots already mid-action at t=0, not starting from idle.
- Smooth cursor arcs with reading pauses are what sell "these are real people." Straight-line teleporting cursors look robotic and break the illusion.
- The collaborative editing showcase (Carlos + Maria in the same card) should be the climax of the scripted choreography — build up to it with individual actions first, then converge on one card for the CRDT wow moment.
- The ghost trace (600ms glow linger) should feel intentional and polished, like a design choice, not like a rendering artifact. The glow should smoothly fade, not pop off.
- Card cascade stagger will be especially visible during bot choreography — when Maria drags a card out of "In Progress," the remaining cards should ripple into their new positions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-demo-mode-polish*
*Context gathered: 2026-04-13*
