# Feature Landscape

**Domain:** Real-time collaborative Kanban board (portfolio project)
**Researched:** 2026-04-11
**Confidence:** HIGH (verified via Context7 for dnd-kit, Yjs, Socket.IO, TipTap, Framer Motion)

## Context

FlowBoard is a portfolio project optimized for a 30-second recruiter first impression. Feature decisions are driven by "does this demonstrate real-time collaboration engineering?" not "would a PM team use this daily?" This fundamentally changes what's table stakes vs. differentiating compared to a SaaS Kanban tool.

**Competitors analyzed:** Trello (board CRUD gold standard), Linear (keyboard-driven speed, real-time sync), Notion (collaborative block editing), Figma (multi-cursor presence paradigm), Asana (board views), Liveblocks demos (portfolio-grade real-time showcases).

---

## Table Stakes

Features users/recruiters expect. Missing = product feels broken or amateurish.

### Board Management

| Feature | Description | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|--------------|------------|--------------|-------|
| Board view with columns | Vertical columns (lists) with horizontal scroll, cards stacked vertically in each | Core Kanban mental model — Trello established this 12+ years ago | M | Database schema | 5 lists for demo board: Backlog, To Do, In Progress, Review, Done |
| Card CRUD | Create, read, update, delete cards with title and description | Can't demo collaboration without content to collaborate on | S | Board view | Inline "Add card" button at bottom of each list |
| List CRUD | Create, rename, reorder, delete lists (columns) | Boards feel static without list management; Trello, Linear both have this | S | Board view | Reorder lists via drag-and-drop (same DnD system as cards) |
| Card detail modal/panel | Click card to expand into a detail view showing full description | Cards need a richer view for the collaborative editor to live in | M | Card CRUD | Slide-over panel (not modal) avoids blocking the board — matches Linear/Notion pattern |
| Drag-and-drop cards within a list | Reorder cards vertically inside a single column | The defining Kanban interaction — broken DnD = broken product | L | Board view, fractional indexing | @dnd-kit `useSortable` with `group` prop for column scoping. Verified: supports multi-container sorting out of the box |
| Drag-and-drop cards across lists | Move cards between columns (e.g., "To Do" → "In Progress") | Second defining Kanban interaction; cross-list moves are the primary workflow | L | Within-list DnD | @dnd-kit `move()` helper handles cross-group transfers. Uses `onDragOver` for real-time preview placement |
| Drag overlay (ghost card) | Lifted card follows cursor during drag with visual feedback | Without this, drag feels like 2005. Trello, Linear, every modern board has it | M | DnD system | @dnd-kit `DragOverlay` renders a clone. Apply `whileDrag: { scale: 1.05, boxShadow }` via Framer Motion for lift effect |
| Optimistic drag updates | Card appears in new position immediately, syncs to server async | Latency on drag = unusable. All modern boards are optimistic | M | DnD, WebSocket | Emit Socket.IO `card:move` event, apply locally first, rollback on server rejection |
| Card title inline editing | Click card title to edit in-place (not just in detail view) | Trello has had this since launch; anything less feels restrictive | S | Card CRUD | `contentEditable` or controlled input, blur/Enter to save via REST PATCH |

### Authentication & Access

| Feature | Description | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|--------------|------------|--------------|-------|
| Register/login | Email + password authentication with JWT | Proves backend capability; recruiters expect a "real" app | M | Database | NestJS Passport + bcrypt + JWT. Refresh token rotation |
| Guest access (demo) | View demo board without signing up | **Critical path**: recruiter lands → sees collaboration in < 5 seconds. Any signup wall = bounce | S | JWT system | 24h guest JWT with `role: "guest"`, no DB row. Auto-assigned on first visit to `/demo` |
| Auth-gated boards | Only authenticated users can create/edit their own boards; guests are read-only on demo | Separation between "wow demo" and "I can actually use this" | S | Auth, board CRUD | Middleware guard checks `role` claim. Guests can observe but not mutate the demo board |

### Visual Polish (Baseline)

| Feature | Description | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|--------------|------------|--------------|-------|
| Responsive card layout | Cards fill column width, text truncates gracefully, consistent spacing | Sloppy layout = "this person can't CSS" in recruiter's mind | S | Board view | TailwindCSS grid/flex. Dark theme per DESIGN.md |
| Loading states | Skeleton screens or spinners during data fetch | Blank screens during load look like bugs | S | None | Skeleton shimmer for board layout, not spinners. Framer Motion `animate` opacity |
| Error handling UI | Toast notifications for failed operations, graceful degradation | Unhandled errors = immediate credibility loss | S | None | Toast component for API errors. Optimistic rollback on WebSocket failures |
| Smooth transitions | Page transitions, card mount/unmount animations | Static UIs feel cheap in 2026. Linear and Notion both animate everything | M | Framer Motion | `AnimatePresence` for card add/remove. Layout animations for reorder. Spring physics (`stiffness: 100, damping: 10`) per Framer Motion docs |

---

## Differentiators

Features that make FlowBoard impressive and demonstrate engineering depth. Not expected in a basic Kanban, but this is where the portfolio value lives.

### Real-Time Collaboration

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Live card position sync | When any user (or bot) drags a card, all connected clients see the card animate to its new position in real-time | **The headline demo moment.** This is what makes it "collaborative" vs. "just another Kanban" | L | DnD, Socket.IO rooms, Framer Motion layout animations | Socket.IO `card:moved` event → local state update → Framer Motion `layout` prop auto-animates the card to its new position. Verified: `layout` prop handles size/position changes smoothly |
| Collaborative rich-text editing | Multiple users edit the same card description simultaneously with character-level sync (Google Docs style) | Proves CRDT understanding — the most technically impressive feature | L | Yjs, TipTap, y-websocket | TipTap `Collaboration` extension + `CollaborationCaret` extension. Verified: works with y-websocket provider. Shows colored cursors with user names inside the editor |
| Collaborative editing cursors (in-editor) | Each user's text cursor and selection highlighted in their assigned color with name label | Visual proof that collaboration is real, not faked. Figma pioneered this; TipTap supports it natively | M | Collaborative editing | TipTap `CollaborationCaret.configure({ provider, user: { name, color } })`. Verified via Context7 — renders cursor + name label in the editor |

### Presence System

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Board-level cursor broadcasting | Each user's mouse cursor visible on the board canvas with their color and name | **Figma-style "multiplayer feel."** Most impressive at first glance. Recruiters immediately understand "this is collaborative" | L | Socket.IO, Redis presence | Throttled `mousemove` → Socket.IO `cursor:move` → render colored SVG cursors for each remote user. 50ms throttle minimum. Yjs awareness also supports this via `setLocalStateField('cursor', {mouseX, mouseY})` but Socket.IO is simpler for board-level cursors |
| Online user avatars | Row of colored avatar circles showing who's currently viewing the board | Standard presence indicator (Figma, Google Docs, Notion all have this) | S | Redis-backed heartbeats | Top-right avatar stack with `+N` overflow. Framer Motion `AnimatePresence` for smooth join/leave transitions |
| User join/leave animations | When a user (or bot) joins or leaves, their avatar animates in/out and optionally a subtle toast appears | Adds life to the presence system. "Maria joined" makes the demo feel alive | S | Online user avatars | Framer Motion `initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}` on avatar elements |
| "Who's viewing this card" indicator | When a user opens a card's detail panel, other users see a small avatar badge on that card in the board view | Shows granular presence beyond just "on the board." Linear does this for issues | M | Presence system, card detail panel | Socket.IO room per card (e.g., `card:{cardId}`). Join room on open, leave on close. Badge = stacked mini-avatars on the card component |
| Cursor glow effects | Colored glow/trail behind each remote cursor matching the user's assigned color | Pure visual delight. Dark theme makes glows pop. This is the "design system meets real-time" moment | S | Cursor broadcasting | CSS `box-shadow` or `filter: drop-shadow()` in the cursor's assigned color. Per DESIGN.md: electric cyan (#22D3EE) for primary user |

### Demo Mode

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Scripted bot choreography (60s) | 3 bots (Maria, Carlos, Ana) perform a scripted sequence: create cards, move cards across lists, edit descriptions simultaneously | **The killer portfolio feature.** A recruiter with zero setup sees "collaboration" happening. No second user required | L | All board features, bot service | Server-side bots call service methods directly (no WebSocket connections). 60s scripted sequence timed to showcase: (1) card creation, (2) cross-list drag, (3) simultaneous text editing, (4) presence cursors moving |
| Random weighted bot behavior (post-choreography) | After the scripted sequence, bots continue with weighted random actions (70% card moves, 20% edits, 10% creates) | Keeps the demo alive for recruiters who stick around past 60 seconds. Board doesn't go dead | M | Scripted choreography | Weighted random selection with cooldown timers between actions. Configurable via environment variables |
| Bot presence simulation | Bots have their own colored cursors, avatars, and names visible in the presence system | Without presence, bots are invisible — defeats the purpose. Bots need to look like real users | M | Presence system, bot service | Bots inject presence state directly into Redis (not via WebSocket). Same cursor/avatar rendering path as real users |
| Zero-friction demo entry | Landing page → one click → live demo board with bots already active | Any friction (signup, loading screen, tutorial) loses the recruiter. Figma and Liveblocks demos nail this pattern | S | Guest auth, demo board | `/demo` route auto-creates guest JWT, redirects to the shared demo board. Bots start choreography on first visitor (or are already running) |

### Polish & UX

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Spring physics animations | All card movements, list reorders, and UI transitions use spring physics (not linear easing) | Spring physics = "this person understands modern frontend." Linear and Framer's own demos use this everywhere | M | Framer Motion | `transition: { type: "spring", stiffness: 100, damping: 10 }`. Verified via Context7 — Framer Motion supports `stiffness`, `damping`, `mass`, `velocity`, `restDelta` |
| Card lift effect on drag | Card scales up slightly and gains shadow when picked up, shrinks back on drop | Micro-interaction that makes DnD feel premium. Every modern board does this | S | DnD system | `whileDrag={{ scale: 1.05, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}` via Framer Motion. Verified |
| Layout animations on reorder | When a card moves (local or remote), neighboring cards smoothly slide into their new positions | Without this, cards teleport — breaks the "real-time" illusion. Framer Motion `layout` prop handles this automatically | M | Board view, Framer Motion | Wrap each card in `<motion.div layout>`. Verified: Framer Motion auto-detects position/size changes and animates them |
| Keyboard shortcuts | At minimum: `N` to create card, `Escape` to close modals, arrow keys to navigate cards | Power-user signal for recruiter devs who will try keyboard shortcuts instinctively. Linear's keyboard shortcuts are legendary | S | Board view | Global keydown listener with a hotkey manager. 5-7 shortcuts max |
| Dark theme (DESIGN.md compliant) | Electric cyan accent (#22D3EE), Space Grotesk headings, DM Sans body, dark canvas | Already decided in DESIGN.md. Colored cursors and glows pop on dark. This IS the visual identity | M | TailwindCSS config | Single theme, no toggle. `bg-gray-950` canvas, `text-cyan-400` accent |
| Architecture diagram in README | Mermaid or hand-drawn system diagram showing dual WebSocket paths, Yjs CRDT flow, Redis presence | Recruiters who read code want to see you can architect, not just implement | S | Deploy | Mermaid diagram in README.md. Shows: Client ↔ Socket.IO ↔ NestJS ↔ PostgreSQL, Client ↔ y-websocket ↔ Yjs ↔ PostgreSQL |
| GIF/video demo in README | 10-15 second GIF showing real-time collaboration with bots | For recruiters who don't click links. GitHub README is the second most-viewed artifact after the live demo | S | Deploy, working demo | Record with Kap or LICEcap. Show: board with cursors moving, card being dragged, text being edited simultaneously |

---

## Anti-Features

Features to explicitly NOT build. Each would dilute the portfolio message or blow the timeline.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Comments/activity log on cards | CRUD filler that doesn't demonstrate real-time skills. Every tutorial Kanban has this. Zero differentiating value | Focus time on collaborative editing + presence — these ARE the differentiators |
| File attachments/uploads | Infrastructure complexity (S3, presigned URLs) for zero recruiter-visible wow. Trello has it; FlowBoard doesn't need it | Card descriptions via rich-text editor are sufficient content |
| Labels/tags/filters | PM feature, not engineering showcase. Adds complexity to card model and UI without demonstrating real-time skills | Use list columns as the primary organization mechanism |
| Due dates/calendars | Entire feature vertical (date pickers, calendar views, overdue logic) that doesn't showcase WebSockets or CRDTs | Keep cards simple: title + description + position |
| Multiple boards per user | Board management UI (create, list, delete boards) is CRUD boilerplate. One demo board + one personal board (for auth users) is sufficient | Auth users get one personal board. Demo board is shared. No board listing page needed |
| Notifications/email | Push notification infrastructure for a portfolio project with 0 daily active users. Absurd ROI | Real-time presence IS the notification — you see people on the board |
| OAuth/social login | Provider setup complexity (Google developer console, callback URLs, token exchange) for minimal recruiter-visible value beyond "they can use Passport" | JWT email/password auth proves backend auth capability. Guest flow proves UX thinking |
| Mobile responsiveness | Touch DnD is a different beast (long-press activation, scroll-vs-drag conflicts). Desktop-only lets us focus on the premium DnD/animation experience | "Best viewed on desktop" notice. Clean mobile fallback message, not a degraded experience |
| Light mode toggle | Dark-only is a deliberate design position. Dual theming doubles CSS work for zero portfolio value. Colored cursors/glows look dramatically better on dark | Commit to dark. It's a differentiator, not a limitation |
| User settings/profile management | Account settings pages are the least impressive CRUD in existence | Hardcode user colors on registration. Minimal profile in JWT claims |
| Search/filter cards | Useful for 100+ cards, irrelevant for a 17-card demo board. PM feature, not engineering showcase | Demo board is curated — cards are already organized |
| Time-travel/undo history | Incredibly impressive but 3-4x time investment (event sourcing, snapshot storage, replay UI). Risk: never ship | Mentioned in PROJECT.md as explicitly out of scope. Could be a v2 differentiator |
| Drag-and-drop list reordering | Lists/columns drag to reorder horizontally | INCLUDE if trivial with @dnd-kit (same DnD system, just `type: "column"`), EXCLUDE if it adds significant complexity. The demo only needs 5 fixed lists |

---

## Feature Dependencies

```
JWT Auth ──────────────────────────────────────────┐
  │                                                 │
  ├── Guest Auth (extends JWT with guest role)      │
  │     │                                           │
  │     └── Zero-friction Demo Entry                │
  │                                                 │
  └── Auth-gated Boards                             │
                                                    │
Database Schema ───────────────────────────────────┐│
  │                                                ││
  ├── Board/List/Card CRUD ────────────────────┐   ││
  │     │                                      │   ││
  │     ├── Card Detail Panel ─────────────┐   │   ││
  │     │     │                            │   │   ││
  │     │     └── Collaborative Editing ───┤   │   ││
  │     │           │                      │   │   ││
  │     │           └── In-editor Cursors  │   │   ││
  │     │                                  │   │   ││
  │     └── DnD (within-list) ─────────┐   │   │   ││
  │           │                        │   │   │   ││
  │           ├── DnD (across-lists) ──┤   │   │   ││
  │           │                        │   │   │   ││
  │           ├── Drag Overlay ────────┤   │   │   ││
  │           │                        │   │   │   ││
  │           └── Optimistic Updates ──┤   │   │   ││
  │                                    │   │   │   ││
  │                                    │   │   │   ││
Socket.IO Integration ────────────────┐│   │   │   ││
  │                                   ││   │   │   ││
  ├── Live Card Position Sync ────────┘│   │   │   ││
  │                                    │   │   │   ││
  ├── Cursor Broadcasting ─────────────┤   │   │   ││
  │     │                              │   │   │   ││
  │     └── Cursor Glow Effects        │   │   │   ││
  │                                    │   │   │   ││
  └── Redis Presence ──────────────────┤   │   │   ││
        │                              │   │   │   ││
        ├── Online User Avatars ───────┤   │   │   ││
        │     │                        │   │   │   ││
        │     └── Join/Leave Anims     │   │   │   ││
        │                              │   │   │   ││
        └── Card Viewing Indicator     │   │   │   ││
                                       │   │   │   ││
Yjs + y-websocket Integration ────────┘   │   │   ││
                                          │   │   ││
Framer Motion (animation layer) ──────────┘   │   ││
                                              │   ││
Demo Board Seed Data ─────────────────────────┘   ││
  │                                               ││
  └── Bot Service ────────────────────────────────┘│
        │                                          │
        ├── Scripted Choreography (60s)            │
        │     │                                    │
        │     └── Random Weighted Behavior         │
        │                                          │
        └── Bot Presence Simulation ───────────────┘
```

---

## MVP Recommendation

**Tier 1 — "It works" (Phases 1-4):**
1. Monorepo scaffold + database schema + auth (JWT + guest)
2. Board/list/card CRUD with basic UI (no animations yet)
3. Drag-and-drop within and across lists (dnd-kit, optimistic updates)
4. Card detail panel with basic description editing

**Tier 2 — "It's collaborative" (Phases 5-7):**
5. Socket.IO integration + live card position sync
6. Yjs collaborative editing in card detail (TipTap + CollaborationCaret)
7. Presence system (Redis heartbeats, cursor broadcasting, online avatars)

**Tier 3 — "It's impressive" (Phases 8-10):**
8. Demo mode (scripted bots, zero-friction entry)
9. Polish (Framer Motion animations, cursor glows, spring physics, dark theme refinement)
10. Deploy + README (architecture diagram, GIF recording, production deployment)

**Rationale:** Tier 1 establishes a working Kanban board that could demo CRUD skills alone. Tier 2 adds the real-time layer that makes it a portfolio differentiator. Tier 3 is the "wow factor" polish that turns a technical demo into a 30-second recruiter conversion. Each tier is independently demoable — if timeline gets tight, ship Tier 2 and add Tier 3 incrementally.

**Defer explicitly:**
- List drag reordering: Only if trivial with dnd-kit's `type: "column"` pattern (investigate during DnD phase)
- Keyboard shortcuts: Low-hanging fruit, add in polish phase only if time permits
- "Who's viewing this card" indicator: Nice-to-have presence refinement, not critical for demo impact

---

## Sources

- **@dnd-kit docs** (Context7, HIGH confidence): Multi-container sortable Kanban patterns, `useSortable`, `useDroppable`, `move()` helper, `DragOverlay`, collision detection
- **Yjs docs** (Context7, HIGH confidence): Awareness CRDT protocol, `setLocalState`/`setLocalStateField`, cursor/presence encoding, change listeners
- **Socket.IO docs** (Context7, HIGH confidence): Room-based broadcasting, `io.to(room).emit()`, acknowledgements, timeout patterns
- **TipTap docs** (Context7, HIGH confidence): `Collaboration` extension with Yjs, `CollaborationCaret` for colored cursors with user names, Hocuspocus provider patterns
- **Framer Motion docs** (Context7, HIGH confidence): `layout` prop, `AnimatePresence`, `Reorder.Group`, spring physics config (`stiffness`, `damping`, `mass`), `whileDrag`, drag gestures
- **Competitor analysis** (training data + partial web verification, MEDIUM confidence): Trello board/list/card patterns, Linear keyboard shortcuts and real-time sync, Figma multi-cursor presence paradigm, Notion collaborative block editing, Liveblocks portfolio demo patterns
