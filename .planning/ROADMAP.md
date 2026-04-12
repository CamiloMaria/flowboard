# Roadmap: FlowBoard

## Overview

FlowBoard delivers a real-time collaborative Kanban board optimized for a 30-second recruiter first impression. The build order validates the highest-risk element first (dual WebSocket coexistence), then layers board interactions, real-time collaboration, demo mode choreography, and finally deployment with documentation. Five phases, bottom-up: foundation → board core → real-time collaboration → demo & polish → deploy.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - Monorepo scaffold, dual WebSocket spike, database schema, JWT auth with guest flow
- [ ] **Phase 2: Board Core** - CRUD operations, drag-and-drop, fractional indexing, optimistic updates, Socket.io broadcasting
- [ ] **Phase 3: Real-time Collaboration** - Yjs/TipTap collaborative editing, cursor presence system, Redis heartbeats
- [ ] **Phase 4: Demo Mode & Polish** - Bot choreography, scripted + random behavior, animations, dark theme, visual effects
- [ ] **Phase 5: Deploy & Documentation** - Railway/Vercel deploy, Docker Compose, README with architecture diagram and demo recording

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Developer can run the full stack locally with both WebSocket transports working, and users can register, log in, and receive guest access to the demo board
**Depends on**: Nothing (first phase)
**Requirements**: FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05, FNDN-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. `pnpm dev` starts both NestJS API and Vite React frontend with hot reload from a fresh clone
  2. Socket.io client connects on `/socket.io/` and y-websocket client connects on `/yjs/` simultaneously without conflict
  3. User can register, log in, and access a protected endpoint with valid JWT
  4. Visiting `/demo` route auto-assigns a guest JWT with random name/color without creating a DB row
  5. Database migrations run cleanly and create users, boards, lists, cards tables
**Plans:** 6 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold with Turborepo, pnpm, Docker Compose, shared types
- [x] 01-02-PLAN.md — Prisma 7 schema, PrismaModule, RedisModule, DB push
- [x] 01-03-PLAN.md — React frontend shell with Tailwind v4, routing, API helper
- [x] 01-04-PLAN.md — Dual WebSocket spike (Socket.io + y-websocket coexistence)
- [x] 01-05-PLAN.md — JWT auth: register, login, refresh rotation, guards, WS middleware
- [x] 01-06-PLAN.md — Guest JWT flow and demo board seed script

### Phase 2: Board Core
**Goal**: Users can view, create, edit, and reorganize cards across lists with drag-and-drop, with all changes broadcast to connected clients in real-time
**Depends on**: Phase 1
**Requirements**: BORD-01, BORD-02, BORD-03, BORD-04, BORD-05, BORD-06, BORD-07, BORD-08, BORD-09, DND-01, DND-02, DND-03, DND-04, DND-05, DND-06
**Success Criteria** (what must be TRUE):
  1. User sees a board with vertical columns (lists) and stacked cards, including a seeded demo board with 5 lists and 17 cards
  2. User can create, rename, and delete lists, and create, edit title inline, and delete cards
  3. User can drag cards within and across lists with a ghost overlay, and cards land in correct position immediately (optimistic update)
  4. Failed drag operations revert with animation and show a toast notification
  5. In a second browser tab, card moves appear in real-time via Socket.io broadcast with smooth animation
**Plans:** 6 plans
**UI hint**: yes

Plans:
- [ ] 02-01-PLAN.md — Frontend infrastructure: deps, shared types, Tailwind tokens, TanStack Query, Zustand, Socket.io client
- [ ] 02-02-PLAN.md — Backend CRUD: BoardModule, REST API, fractional indexing, Socket.io broadcasting
- [ ] 02-03-PLAN.md — Board UI: BoardPage, columns, cards, skeleton, connection status
- [ ] 02-04-PLAN.md — CRUD interactions: list/card create/edit/delete, card detail modal, toast system
- [ ] 02-05-PLAN.md — Drag-and-drop: @dnd-kit integration, drag overlay, drop indicators, auto-scroll
- [ ] 02-06-PLAN.md — Real-time sync: Socket.io events, cache updates, remote animations

### Phase 3: Real-time Collaboration
**Goal**: Multiple users can simultaneously edit card descriptions with character-level sync, see each other's cursors on the board, and know who's online
**Depends on**: Phase 2
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04, COLLAB-05, COLLAB-06, PRES-01, PRES-02, PRES-03, PRES-04, PRES-05, PRES-06
**Success Criteria** (what must be TRUE):
  1. Two users editing the same card description see character-level changes appear in real-time via TipTap + Yjs
  2. Each user's cursor and selection in the editor is highlighted in their assigned color with name label
  3. Board header shows online user avatars with colored borders, animating on join/leave
  4. Remote user cursors are visible on the board canvas with colored glow effect and name label
  5. Yjs document state persists to database on last-user-disconnect and on 30-second debounce during active editing
**Plans**: TBD
**UI hint**: yes

### Phase 4: Demo Mode & Polish
**Goal**: A recruiter visits `/demo` and sees compelling live collaboration (bots moving cards, typing in editors, cursors roaming) with polished animations — all within 5 seconds of landing
**Depends on**: Phase 3
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, PLSH-01, PLSH-02, PLSH-03, PLSH-04, PLSH-05, PLSH-06, PLSH-07
**Success Criteria** (what must be TRUE):
  1. Visiting `/demo` auto-creates a guest session and shows the live board with 3 bots (Maria, Carlos, Ana) actively collaborating
  2. Bots perform a 60-second scripted choreography (card moves, collaborative editing, cursor movement), then switch to random weighted behavior
  3. Bots are indistinguishable from real users — they have colored cursors, avatars, and names in the presence system
  4. Card drag/drop, create/archive, and modal open/close all have spring physics animations (Framer Motion)
  5. The entire UI follows the DESIGN.md dark theme with electric cyan accent, Space Grotesk + DM Sans typography, cursor glow effects, and loading skeleton screens
**Plans**: TBD
**UI hint**: yes

### Phase 5: Deploy & Documentation
**Goal**: FlowBoard is live on the internet with a README that tells the full story — a recruiter can open the URL, see the demo, then read the README and understand the engineering depth
**Depends on**: Phase 4
**Requirements**: DPLY-01, DPLY-02, DPLY-03, DPLY-04, DPLY-05, DPLY-06, DPLY-07
**Success Criteria** (what must be TRUE):
  1. Backend runs on Railway (with PostgreSQL + Redis) and frontend on Vercel, both accessible via public URLs
  2. `docker compose up` starts the full stack locally from a fresh clone
  3. README includes architecture diagram showing dual WebSocket paths, Yjs CRDT flow, and Redis presence
  4. README includes GIF/video recording of the live demo and a "Why I Built This" section
  5. A fresh `git clone` → `pnpm install` → `pnpm dev` works without manual setup steps
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/6 | Planning complete | - |
| 2. Board Core | 0/TBD | Not started | - |
| 3. Real-time Collaboration | 0/TBD | Not started | - |
| 4. Demo Mode & Polish | 0/TBD | Not started | - |
| 5. Deploy & Documentation | 0/TBD | Not started | - |
