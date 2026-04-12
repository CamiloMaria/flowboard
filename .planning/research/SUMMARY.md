# Research Summary: FlowBoard

**Domain:** Real-time collaborative Kanban board (portfolio project)
**Researched:** 2026-04-11
**Overall confidence:** HIGH

## Executive Summary

FlowBoard is a real-time collaborative Kanban board designed as a portfolio showcase for WebSocket engineering, CRDT-based collaboration, and complex frontend interactions. The core architectural decision — dual WebSocket transports (Socket.io for board-level sync, y-websocket for CRDT document editing) on a single NestJS HTTP server — is both the primary differentiator and the primary risk.

The 2026 stack is mature and well-documented. NestJS 11, Prisma 7, Socket.io 4.8, Yjs 13.6, and TipTap 3.22 are all at current stable releases with HIGH confidence from npm registry verification and Context7 documentation. The one exception is `@dnd-kit/react` at version 0.3.2 (pre-1.0), which introduces a new API purpose-built for Kanban boards but carries minor version instability risk. The legacy `@dnd-kit/core` 6.x serves as a fallback if needed.

Three critical version gotchas will trip up developers relying on tutorials: Prisma 7 changed the generator provider from `prisma-client-js` to `prisma-client`, the `framer-motion` package has been renamed to `motion` (import from `motion/react`), and Tailwind CSS v4 eliminated `tailwind.config.js` in favor of CSS-first `@theme` directives. All are breaking changes from the patterns most commonly found in online tutorials and StackOverflow answers.

The demo mode with scripted bot choreography is the killer portfolio feature — a recruiter sees live collaboration without needing a second user. This requires all real-time subsystems to be stable before the bots can exercise them, dictating a bottom-up build order: foundation → real-time → collaboration → demo → polish.

## Key Findings

**Stack:** NestJS 11 + React 19 + Prisma 7 + PostgreSQL + Redis + Socket.io 4.8 + Yjs 13.6 + @dnd-kit/react 0.3 + Zustand 5 + TanStack Query 5 + TipTap 3.22 + motion 12 + Tailwind 4 + Turborepo 2.9 + pnpm 10. All versions verified via npm registry.

**Architecture:** Dual WebSocket transports on single HTTP server (Socket.io at `/socket.io/`, y-websocket at `/yjs/`). URL-based routing on HTTP upgrade. REST for mutations, Socket.io for broadcasting, Yjs for collaborative document editing. State split: Zustand (UI), TanStack Query (server), Yjs (CRDT documents).

**Critical pitfall:** HTTP upgrade handler collision between Socket.io and y-websocket. Must implement explicit URL-based routing in NestJS bootstrap or both transports silently fail. This is the #1 technical risk and should be validated in the first phase that touches WebSockets.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Monorepo Scaffold + Database Schema** - Foundation
   - Addresses: Turborepo + pnpm workspace setup, Prisma 7 schema (with `prisma-client` generator), shared types package
   - Avoids: Pitfall #9 (shared types build order) by using Just-in-Time Packages pattern
   - Avoids: Pitfall #16 (Prisma client generation in monorepo) by setting custom output path

2. **Dual WebSocket Integration** - Highest-risk phase, do early
   - Addresses: Socket.io gateway + y-websocket server coexistence
   - Avoids: Pitfall #1 (upgrade handler collision) — implement URL-based routing dispatcher
   - Avoids: Pitfall #5 (NestJS gateway vs manual handler conflict) — custom adapter with `noServer: true`
   - **Needs deeper research**: Exact NestJS adapter customization for noServer Socket.io + manual ws.Server

3. **JWT Auth + Guest Flow** - Enables everything downstream
   - Addresses: Register/login, refresh tokens, guest JWT for demo, WebSocket auth middleware
   - Avoids: Pitfall #12 (WebSocket auth middleware) — design for both REST and WS from start

4. **Board/List/Card CRUD** - REST API baseline
   - Addresses: REST endpoints, Prisma queries, fractional indexing foundation
   - Avoids: Pitfall #4 (FLOAT precision) — implement rebalancing from start, add UNIQUE constraint

5. **Drag-and-Drop + Real-time Sync** - The Kanban interaction
   - Addresses: @dnd-kit/react multi-list sortable, optimistic updates, Socket.io card:moved broadcast
   - Avoids: Pitfall #3 (DnD state desync during concurrent moves) — lock-and-queue pattern
   - Avoids: Pitfall #6 (optimistic update race) — exclude sender from broadcast

6. **Yjs Collaborative Editing** - The CRDT showcase
   - Addresses: TipTap + Yjs integration, y-websocket document persistence, BYTEA column
   - Avoids: Pitfall #2 (data loss on disconnect) — debounced persistence + SIGTERM flush
   - Avoids: Pitfall #10 (tombstone accumulation) — gc: true, periodic compaction

7. **Presence System** - The "multiplayer feel"
   - Addresses: Redis heartbeats, cursor broadcasting, online user avatars
   - Avoids: Pitfall #7 (heartbeat timing) — two-tier approach (cursors via Socket.io, status via Redis TTL)

8. **Demo Mode** - The recruiter-facing deliverable
   - Addresses: Bot choreography, scripted 60s sequence, random weighted behavior, guest entry flow
   - Avoids: Pitfall #8 (robotic bots) — Gaussian timing, burst/idle cycles, bot personality

9. **Animation Polish** - Visual quality
   - Addresses: motion layout animations, spring physics, cursor glow, AnimatePresence
   - Avoids: Pitfall #15 (layout animation bleed) — LayoutGroup isolation per column

10. **Deploy + README** - Ship it
    - Addresses: Railway backend, Vercel frontend, architecture diagram, demo GIF
    - Avoids: Pitfall #13 (Railway/Vercel WebSocket split) — explicit CORS, direct WS connection
    - Avoids: Pitfall #11 (reconnection storms) — connectionStateRecovery

**Phase ordering rationale:**
- Phase 2 (Dual WS) before phase 3 (Auth) because the upgrade handler routing is the highest technical risk — validate it works before building features on top of it
- Phase 4 (CRUD) before phase 5 (DnD) because drag-and-drop needs data to move
- Phase 6 (Yjs) after phase 5 (DnD) because both depend on the WebSocket infrastructure from phase 2
- Phase 8 (Demo) near the end because bots exercise the full stack — every other feature must be stable
- Phase 9 (Polish) and 10 (Deploy) are the finishing touches

**Research flags for phases:**
- Phase 2: **Needs deeper research** — exact NestJS custom adapter pattern for dual WebSocket with `noServer: true`
- Phase 5: **Needs deeper research** — @dnd-kit 0.3 concurrent update handling (lock-and-queue pattern)
- Phase 6: Standard patterns, well-documented (TipTap + Yjs is a documented pattern)
- Phase 8: Standard patterns, but bot behavior design is subjective — allocate design time

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All 17 packages verified via npm registry. Versions current as of 2026-04-11. |
| Features | HIGH | Table stakes, differentiators, and anti-features derived from PROJECT.md + competitor analysis. |
| Architecture | HIGH | Dual WebSocket pattern verified via NestJS Context7 + Socket.io Context7 + y-websocket docs. |
| Pitfalls | HIGH | 16 pitfalls identified. Critical/High pitfalls verified via Context7 official docs. Minor pitfalls based on training data. |
| @dnd-kit stability | MEDIUM | 0.x version. New API documented but pre-1.0. Active daily beta releases toward 0.4.0. |
| Bot behavior design | MEDIUM | UX patterns, not library-specific. Subjective design decisions. |

## Gaps to Address

- **@dnd-kit/react 0.3 → 0.4 migration path**: If 0.4.0 releases during development, assess breaking changes
- **y-websocket v3 API changes from v2**: Verified version but need to confirm persistence hook API hasn't changed
- **Prisma 7 driver adapter pattern**: New approach documented but less community coverage for NestJS integration
- **Railway WebSocket idle timeout**: Exact timeout value and keepalive requirements need phase-specific research
- **TailwindCSS v4 + Vite 8 integration**: Both are major version rewrites — test the exact plugin configuration early
