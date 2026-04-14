# FlowBoard

## What This Is

A real-time collaborative Kanban board that demonstrates mastery of WebSockets, presence systems, CRDTs, and complex frontend interactions. Built as a portfolio project that impresses recruiters in 30 seconds via a demo mode with simulated bot collaborators -- no second user required.

## Core Value

A recruiter opens the URL and sees live collaboration (colored cursors, simultaneous card editing, drag-and-drop sync) within 5 seconds, without signing up.

## Requirements

### Validated

- [x] Monorepo scaffold (Turborepo + pnpm workspaces, NestJS API, Vite React frontend, shared types) — Validated in Phase 1: foundation-auth
- [x] Dual WebSocket integration (Socket.io on `/socket.io/` + y-websocket on `/yjs/`) — Validated in Phase 1: foundation-auth
- [x] Database schema (PostgreSQL + Prisma: users, boards, lists, cards) — Validated in Phase 1: foundation-auth
- [x] JWT auth (register, login, refresh tokens, guards, guest user flow for demo) -- v1.0 Phase 1
- [x] Board/list/card CRUD with REST API, seed demo board (5 lists, 17 cards) -- v1.0 Phase 2
- [x] Drag-and-drop with @dnd-kit, fractional indexing, optimistic updates + snapshot rollback -- v1.0 Phase 2
- [x] Real-time Socket.io broadcasting with room isolation and cache invalidation -- v1.0 Phase 2
- [x] TipTap + Yjs CRDT collaborative editing via y-websocket with character-level sync -- v1.0 Phase 3
- [x] Yjs persistence to BYTEA column on last-disconnect + 30s debounce -- v1.0 Phase 3
- [x] Cursor presence with colored labels, Redis heartbeats, online user avatars -- v1.0 Phase 3
- [x] Demo mode: 60s scripted bot choreography + random weighted behavior loop -- v1.0 Phase 4
- [x] Dark theme with Motion animations, cursor glow effects, card shimmer -- v1.0 Phase 4
- [x] Docker multi-stage build, CI/CD pipeline, Nginx reverse proxy -- v1.0 Phase 5
- [x] Vercel frontend deployment with VITE_API_URL support -- v1.0 Phase 5
- [x] Portfolio README with Mermaid architecture diagram, live demo link, technical narrative -- v1.0 Phase 5

### Active

(None -- all v1.0 requirements shipped)

### Out of Scope

- OAuth (Google login) -- JWT-only auth sufficient for portfolio; OAuth adds provider setup complexity with minimal recruiter-visible value
- Mobile responsiveness -- desktop-only for initial launch; "Best viewed on desktop" notice on mobile
- Comments/attachments/activity logs -- CRUD filler that doesn't demonstrate real-time skills
- Time-travel replay -- high wow factor but 3-4x time investment risks never shipping
- Light mode -- dark-only is a deliberate design position per DESIGN.md

## Context

**Current state:** v1.0 shipped. 8,706 LOC TypeScript across 112 source files. 5 phases, 27 plans, 191 commits. Deployed to Oracle Cloud (backend) + Vercel (frontend).

**Purpose:** Portfolio project to demonstrate real-time collaboration engineering for job applications. Not a SaaS product. The 30-second first impression (demo + README + code quality) is the primary optimization target.

**Architecture:** Monorepo (Turborepo + pnpm) with NestJS backend, Vite React frontend, shared types package. Dual WebSocket servers -- Socket.io for board-level sync (card moves, presence) and y-websocket for CRDT document sync (collaborative card editing). Redis for presence state. PostgreSQL + Prisma for persistence.

**Design system:** Documented in `DESIGN.md`. Dark-only theme with electric cyan accent (#22D3EE). Space Grotesk + DM Sans typography. Spring physics animations. Colored cursor glow effects. Visual thesis: "Technical warmth on a dark stage -- collaboration performs in light."

**Demo mode:** Shared demo board with 3 server-side bots (Maria, Carlos, Ana). 60-second scripted choreography followed by random weighted behavior. Guests join as read-only observers with temporary JWTs (no DB row). Bots call service methods directly -- no WebSocket connections.

**Deployment:** Oracle Cloud VM running Docker (API + PostgreSQL + Redis) behind Nginx reverse proxy with dual WebSocket paths. Frontend on Vercel CDN. CI/CD via GitHub Actions SSH deploy on push to main.

**Known issues / tech debt:**
- Prisma CLI as devDependency in Docker prod image (workaround: copy from builder stage)
- E2E tests require running database (4 suites skipped in CI without Docker)
- 13 human verification items pending across phases 1, 2, and 5

## Constraints

- **Timeline**: Solo developer, 6-8 weeks (~80-100 hours). The dual WebSocket integration and demo bot choreography each have sharp edges that will eat debugging time.
- **Tech stack**: NestJS + React + PostgreSQL + Redis + Prisma (decided). See design doc for full stack table.
- **Deployment**: Oracle Cloud VM (backend + PostgreSQL + Redis via Docker) + Vercel (frontend). Docker Compose for local dev. CI/CD via GitHub Actions.
- **Code quality**: Recruiters will open random source files. Clean, well-typed code with consistent patterns is a hard constraint.
- **Design**: Dark-only theme per DESIGN.md. No light mode toggle.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Approach B: "Full-Stack Demo" over minimal or maximal approaches | Balances wow-factor with shipping speed; auth proves backend capability; demo proves real-time magic | Validated (Phase 1) |
| Dual WebSocket (Socket.io + y-websocket) on same HTTP server | Clear responsibility boundary; Socket.io for board sync, y-websocket for CRDT editing; separate paths avoid conflict | Validated (Phase 1 — E2E spike passed) |
| Prisma over TypeORM | Better type safety, cleaner migrations, more readable schema | Validated (Phase 1) |
| FLOAT fractional indexing over string-based keys | Simpler implementation, standard SQL ordering, rebalancing handles precision limits | Validated (Phase 2) |
| Server-side bots (direct service calls) over WebSocket-connected bots | No connection limits, no auth setup, deterministic actions, simpler implementation | Validated (Phase 4) |
| Shared demo board over per-recruiter boards | Avoids N bot processes; 0-5 concurrent visitors doesn't justify per-recruiter complexity | Validated (Phase 4) |
| Dark-only design | Colored cursors and presence indicators pop against dark canvas; differentiation from white-background competitors | Validated (Phase 4) |
| Oracle Cloud VM over Railway PaaS | Self-hosted Docker shows infrastructure knowledge; more control over WebSocket proxying | Validated (Phase 5) |
| Live demo link over GIF/video | Zero-friction, always current; recruiter sees real collaboration, not a recording | Validated (Phase 5) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after v1.0 milestone completion*
