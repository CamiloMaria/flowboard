# Requirements: FlowBoard

**Defined:** 2026-04-11
**Core Value:** A recruiter opens the URL and sees live collaboration within 5 seconds, without signing up.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FNDN-01**: Monorepo scaffold with Turborepo + pnpm workspaces (NestJS API, Vite React frontend, shared types package)
- [ ] **FNDN-02**: `pnpm dev` runs both apps concurrently with hot reload
- [ ] **FNDN-03**: PostgreSQL database with Prisma 7 schema (users, boards, lists, cards tables)
- [ ] **FNDN-04**: Database migrations run cleanly from fresh clone
- [ ] **FNDN-05**: Dual WebSocket server — Socket.io on `/socket.io/` and y-websocket on `/yjs/` coexisting on same NestJS HTTP server
- [ ] **FNDN-06**: WebSocket upgrade handler routes requests by URL path without conflict

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User can log in and receive JWT access + refresh tokens
- [ ] **AUTH-03**: Refresh token rotation via HTTP-only cookies
- [ ] **AUTH-04**: Auth guards protect API endpoints and WebSocket connections
- [ ] **AUTH-05**: Guest user receives temporary read-only JWT (no DB row, 24h expiry, `role: "guest"`) when visiting demo board
- [ ] **AUTH-06**: Guest auto-assigned random name and color from palette

### Board Management

- [ ] **BORD-01**: User can view a board with vertical columns (lists) and cards stacked in each
- [ ] **BORD-02**: User can create, rename, and delete lists on their board
- [ ] **BORD-03**: User can create cards with title in any list
- [ ] **BORD-04**: User can click a card to open detail modal showing full description
- [ ] **BORD-05**: User can edit card title inline on the board
- [ ] **BORD-06**: User can delete cards
- [ ] **BORD-07**: Demo board seeded with 5 lists (Backlog, To Do, In Progress, Review, Done) and 17 cards
- [ ] **BORD-08**: Fractional indexing with FLOAT positions for card and list ordering
- [ ] **BORD-09**: Rebalancing triggered when position precision degrades after dense insertions

### Drag and Drop

- [ ] **DND-01**: User can drag cards to reorder within the same list
- [ ] **DND-02**: User can drag cards across lists (e.g., To Do -> In Progress)
- [ ] **DND-03**: Drag overlay (ghost card) follows cursor during drag with lift effect (scale + shadow)
- [ ] **DND-04**: Card appears in new position immediately (optimistic update), syncs to server async
- [ ] **DND-05**: Failed move reverts card to original position with ease-out animation and toast notification
- [ ] **DND-06**: Remote card moves broadcast via Socket.io — all connected clients see card animate to new position in real-time

### Collaborative Editing

- [ ] **COLLAB-01**: Card description uses TipTap rich-text editor with Yjs CRDT sync via y-websocket
- [ ] **COLLAB-02**: Two users editing same card description see character-level sync in real-time
- [ ] **COLLAB-03**: Each user's text cursor and selection highlighted in their assigned color with name label (CollaborationCaret)
- [ ] **COLLAB-04**: Yjs document state persists to `description_yjs` BYTEA column on last-user-disconnect
- [ ] **COLLAB-05**: Yjs document state also persists on 30-second debounce during active editing
- [ ] **COLLAB-06**: Plaintext fallback (`description_text`) updated on each persistence for search/display contexts

### Presence

- [ ] **PRES-01**: Board header shows online user avatars with colored borders
- [ ] **PRES-02**: User join/leave triggers avatar animation (scale in/out)
- [ ] **PRES-03**: Remote user cursors visible on board canvas with user color and name label
- [ ] **PRES-04**: Cursor glow effect (drop-shadow in user color) with idle breathe animation
- [ ] **PRES-05**: Redis-backed heartbeats track who is online per board
- [ ] **PRES-06**: Cursor position broadcast throttled appropriately for smooth rendering

### Demo Mode

- [ ] **DEMO-01**: 3 server-side bots (Maria, Carlos, Ana) operate via direct service calls (no WebSocket connections)
- [ ] **DEMO-02**: 60-second scripted choreography showcasing: card moves, collaborative editing with two cursors, label additions, independent cursor movement
- [ ] **DEMO-03**: After scripted sequence, bots switch to random weighted behavior (Maria prefers moves, Carlos prefers typing, Ana prefers labels)
- [ ] **DEMO-04**: Bots have colored cursors, avatars, and names in the presence system (indistinguishable from real users)
- [ ] **DEMO-05**: Zero-friction demo entry — `/demo` route auto-creates guest JWT and shows live board with bots active
- [ ] **DEMO-06**: `is_demo` boolean on board gates demo behavior (skip auth, prevent destructive mutations)

### Polish

- [ ] **PLSH-01**: Spring physics animations for card drag, drop settle, and layout shifts (Framer Motion)
- [ ] **PLSH-02**: Card create/archive animations (fade + scale)
- [ ] **PLSH-03**: Modal open/close animations (scale + fade with spring easing)
- [ ] **PLSH-04**: Cursor leave animation with ghost trace (fade out 400ms, glow lingers 600ms)
- [ ] **PLSH-05**: Dark theme implemented per DESIGN.md (electric cyan accent, Space Grotesk + DM Sans typography)
- [ ] **PLSH-06**: Loading skeleton screens during initial board fetch
- [ ] **PLSH-07**: Toast notifications for errors and failed operations

### Deployment

- [ ] **DPLY-01**: Backend deploys to Railway with PostgreSQL and Redis
- [ ] **DPLY-02**: Frontend deploys to Vercel with auto-deploy on push to main
- [ ] **DPLY-03**: Docker Compose config for local development
- [ ] **DPLY-04**: README with architecture diagram (dual WebSocket paths, Yjs CRDT flow, Redis presence)
- [ ] **DPLY-05**: README with GIF/video recording of live demo
- [ ] **DPLY-06**: README with "Why I Built This" section explaining technical decisions
- [ ] **DPLY-07**: Codebase builds and deploys cleanly from fresh clone

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Presence

- **PRES-07**: "Who's viewing this card" indicator (avatar badge on cards when another user has the detail panel open)
- **PRES-08**: Typing indicator outside editor (e.g., "Carlos is editing..." below card)

### Board Enhancements

- **BORD-10**: Drag-and-drop list reordering (horizontal column drag)
- **BORD-11**: Card labels with colors (card_labels and card_label_assignments tables)
- **BORD-12**: Keyboard shortcuts (N to create, Escape to close, arrow keys to navigate)

### Architecture Showcase

- **ARCH-01**: Time-travel replay mode (record every CRDT operation, timeline slider to replay)
- **ARCH-02**: Interactive architecture deep-dive page explaining CRDT, presence, fractional indexing

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Comments/activity log | CRUD filler that doesn't demonstrate real-time skills |
| File attachments/uploads | S3 infrastructure complexity for zero recruiter-visible wow |
| Due dates/calendars | Entire feature vertical that doesn't showcase WebSockets or CRDTs |
| Notifications/email | Push notification infrastructure for a project with ~0 DAU |
| OAuth/social login | Provider setup complexity with minimal value beyond "they can use Passport" |
| Mobile responsiveness | Touch DnD is a different beast; desktop-only lets us focus on premium DnD/animation |
| Light mode toggle | Dark-only is deliberate design position; dual theming doubles CSS work |
| User settings/profile | Least impressive CRUD; hardcode colors on registration |
| Search/filter cards | Irrelevant for a 17-card demo board |
| Multiple boards per user | Board management UI is CRUD boilerplate; one personal + one demo is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | Phase 1: Foundation & Auth | Pending |
| FNDN-02 | Phase 1: Foundation & Auth | Pending |
| FNDN-03 | Phase 1: Foundation & Auth | Pending |
| FNDN-04 | Phase 1: Foundation & Auth | Pending |
| FNDN-05 | Phase 1: Foundation & Auth | Pending |
| FNDN-06 | Phase 1: Foundation & Auth | Pending |
| AUTH-01 | Phase 1: Foundation & Auth | Pending |
| AUTH-02 | Phase 1: Foundation & Auth | Pending |
| AUTH-03 | Phase 1: Foundation & Auth | Pending |
| AUTH-04 | Phase 1: Foundation & Auth | Pending |
| AUTH-05 | Phase 1: Foundation & Auth | Pending |
| AUTH-06 | Phase 1: Foundation & Auth | Pending |
| BORD-01 | Phase 2: Board Core | Pending |
| BORD-02 | Phase 2: Board Core | Pending |
| BORD-03 | Phase 2: Board Core | Pending |
| BORD-04 | Phase 2: Board Core | Pending |
| BORD-05 | Phase 2: Board Core | Pending |
| BORD-06 | Phase 2: Board Core | Pending |
| BORD-07 | Phase 2: Board Core | Pending |
| BORD-08 | Phase 2: Board Core | Pending |
| BORD-09 | Phase 2: Board Core | Pending |
| DND-01 | Phase 2: Board Core | Pending |
| DND-02 | Phase 2: Board Core | Pending |
| DND-03 | Phase 2: Board Core | Pending |
| DND-04 | Phase 2: Board Core | Pending |
| DND-05 | Phase 2: Board Core | Pending |
| DND-06 | Phase 2: Board Core | Pending |
| COLLAB-01 | Phase 3: Real-time Collaboration | Pending |
| COLLAB-02 | Phase 3: Real-time Collaboration | Pending |
| COLLAB-03 | Phase 3: Real-time Collaboration | Pending |
| COLLAB-04 | Phase 3: Real-time Collaboration | Pending |
| COLLAB-05 | Phase 3: Real-time Collaboration | Pending |
| COLLAB-06 | Phase 3: Real-time Collaboration | Pending |
| PRES-01 | Phase 3: Real-time Collaboration | Pending |
| PRES-02 | Phase 3: Real-time Collaboration | Pending |
| PRES-03 | Phase 3: Real-time Collaboration | Pending |
| PRES-04 | Phase 3: Real-time Collaboration | Pending |
| PRES-05 | Phase 3: Real-time Collaboration | Pending |
| PRES-06 | Phase 3: Real-time Collaboration | Pending |
| DEMO-01 | Phase 4: Demo Mode & Polish | Pending |
| DEMO-02 | Phase 4: Demo Mode & Polish | Pending |
| DEMO-03 | Phase 4: Demo Mode & Polish | Pending |
| DEMO-04 | Phase 4: Demo Mode & Polish | Pending |
| DEMO-05 | Phase 4: Demo Mode & Polish | Pending |
| DEMO-06 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-01 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-02 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-03 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-04 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-05 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-06 | Phase 4: Demo Mode & Polish | Pending |
| PLSH-07 | Phase 4: Demo Mode & Polish | Pending |
| DPLY-01 | Phase 5: Deploy & Documentation | Pending |
| DPLY-02 | Phase 5: Deploy & Documentation | Pending |
| DPLY-03 | Phase 5: Deploy & Documentation | Pending |
| DPLY-04 | Phase 5: Deploy & Documentation | Pending |
| DPLY-05 | Phase 5: Deploy & Documentation | Pending |
| DPLY-06 | Phase 5: Deploy & Documentation | Pending |
| DPLY-07 | Phase 5: Deploy & Documentation | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after roadmap creation*
