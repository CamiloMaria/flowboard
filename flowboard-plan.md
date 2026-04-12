# FlowBoard — Complete Architecture Plan

## Project Overview

**FlowBoard** is a real-time collaborative Kanban board where teams can create boards, organize tasks into lists with drag-and-drop, and edit cards simultaneously — seeing each other's cursors and avatars live. Think Trello with Figma's real-time collaboration.

**Portfolio goal:** Demonstrate mastery of real-time collaboration (WebSockets, presence, CRDT), complex frontend (drag-and-drop with optimistic updates), and system design that scales to multiple concurrent users. Complements NotifyHub by showcasing the opposite side of full-stack: advanced frontend + real-time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | NestJS (TypeScript) |
| Database | PostgreSQL + TypeORM |
| Real-time | Socket.io (@nestjs/websockets) |
| CRDT (collaborative editing) | Yjs + y-websocket |
| Cache | Redis (presence state, room management) |
| Auth | JWT (access + refresh tokens) |
| File Storage | Cloudinary (avatars, card attachments) |
| API Docs | Swagger (@nestjs/swagger) |
| Validation | class-validator + class-transformer |
| Config | @nestjs/config + Joi schema validation |
| Frontend | React + Vite + TailwindCSS + Tanstack Query |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Rich Text Editor | TipTap (ProseMirror-based, integrates with Yjs) |
| Presence UI | Custom (avatars + animated cursors with Framer Motion) |
| State Management | Zustand (local) + Tanstack Query (server) |
| Router | React Router v7 |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy Backend | Railway / Render |
| Deploy Frontend | Vercel |
| Containerization | Docker + docker-compose (local development) |

---

## The Star Feature: Live Collaboration

### What a Recruiter Sees in 30 Seconds

1. **Opens the board** → sees avatars of other connected users in the header with a green "online" indicator
2. **Someone moves a card** → the card smoothly animates to its new position on your screen automatically
3. **Opens a card** → sees a cursor with another user's name and color typing in the description in real time (Google Docs style)
4. **Hovers over a list** → sees a subtle indicator "María is viewing this list"
5. **Demo mode** → simulated bots that move cards, type, and navigate the board so the recruiter sees the magic without needing a second user

### How It Works Under the Hood

**Presence System (Redis + Socket.io):**
```
- Each user connected to a board emits their position every 2s
- Redis stores: { boardId → [{ userId, name, avatar, color, cursor: {x,y}, viewing: "card_123", lastSeen }] }
- Socket.io broadcasts to everyone in the room: "presence:update"
- If a user doesn't emit in 10s → marked offline and cleaned up from Redis
```

**Collaborative Editing (Yjs + TipTap):**
```
- Each card description is a Y.Doc (CRDT document)
- When a user opens a card, they connect to a y-websocket room
- Yjs syncs changes character-by-character between all editors
- Other users' cursors are shown inline with their color
- When the card is closed, the Y.Doc is persisted to PostgreSQL as binary state
- Conflict-free: two users can edit the same description without conflicts
```

**Board Sync (Socket.io — Optimistic Updates):**
```
1. User A drags card from "To Do" → "In Progress"
2. Frontend updates immediately (optimistic)
3. Sends socket event: "card:move" { cardId, fromList, toList, newIndex }
4. Backend validates, persists to DB, broadcasts to room
5. All other clients apply the animated change
6. If backend rejects → frontend reverts (rollback)
```

---

## Database Schema (PostgreSQL)

### Table: `users`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| avatar_url | VARCHAR(500) | NULLABLE |
| color | VARCHAR(7) | Hex color for cursor/avatar, auto-assigned |
| is_verified | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### Table: `workspaces`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE, for clean URLs |
| owner_id | UUID | FK → users.id |
| logo_url | VARCHAR(500) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### Table: `workspace_members`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id, ON DELETE CASCADE |
| role | ENUM | 'owner', 'admin', 'member', 'viewer' |
| joined_at | TIMESTAMP | DEFAULT now() |

**Constraint:** UNIQUE (workspace_id, user_id)

### Table: `boards`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, ON DELETE CASCADE |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULLABLE |
| background_color | VARCHAR(7) | Board hex color |
| background_image | VARCHAR(500) | NULLABLE, image URL |
| is_archived | BOOLEAN | DEFAULT false |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

**Index:** `idx_boards_workspace_id` ON (workspace_id)

### Table: `lists`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| board_id | UUID | FK → boards.id, ON DELETE CASCADE |
| name | VARCHAR(100) | NOT NULL |
| position | FLOAT | For flexible ordering (fractional indexing) |
| is_archived | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

**Index:** `idx_lists_board_position` ON (board_id, position)

**Note on `position` as FLOAT:**
Fractional indexing is used to avoid renumbering all lists on reorder.
- List A: position 1.0
- List B: position 2.0
- Insert between A and B: position 1.5
- Insert between A and new: position 1.25
- When precision runs out (after ~50 dense insertions) → batch rebalancing

### Table: `cards`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| list_id | UUID | FK → lists.id, ON DELETE CASCADE |
| title | VARCHAR(255) | NOT NULL |
| description_text | TEXT | Plaintext fallback of the description |
| description_yjs | BYTEA | Binary state of the Y.Doc (CRDT) |
| position | FLOAT | Fractional indexing within the list |
| cover_color | VARCHAR(7) | NULLABLE, card header color |
| cover_image | VARCHAR(500) | NULLABLE |
| due_date | TIMESTAMP | NULLABLE |
| is_completed | BOOLEAN | DEFAULT false |
| is_archived | BOOLEAN | DEFAULT false |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

**Indexes:**
- `idx_cards_list_position` ON (list_id, position)
- `idx_cards_due_date` ON (due_date) WHERE due_date IS NOT NULL AND is_archived = false

### Table: `card_labels`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| board_id | UUID | FK → boards.id, ON DELETE CASCADE |
| name | VARCHAR(50) | NOT NULL |
| color | VARCHAR(7) | NOT NULL |

### Table: `card_label_assignments`

| Column | Type | Notes |
|---|---|---|
| card_id | UUID | FK → cards.id, ON DELETE CASCADE |
| label_id | UUID | FK → card_labels.id, ON DELETE CASCADE |

**Constraint:** PK (card_id, label_id)

### Table: `card_assignees`

| Column | Type | Notes |
|---|---|---|
| card_id | UUID | FK → cards.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id, ON DELETE CASCADE |
| assigned_at | TIMESTAMP | DEFAULT now() |

**Constraint:** PK (card_id, user_id)

### Table: `card_comments`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| card_id | UUID | FK → cards.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

**Index:** `idx_comments_card_created` ON (card_id, created_at DESC)

### Table: `card_attachments`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| card_id | UUID | FK → cards.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id |
| filename | VARCHAR(255) | NOT NULL |
| url | VARCHAR(500) | NOT NULL (Cloudinary URL) |
| file_size | INTEGER | Bytes |
| mime_type | VARCHAR(100) | |
| created_at | TIMESTAMP | DEFAULT now() |

### Table: `card_activity`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| card_id | UUID | FK → cards.id, ON DELETE CASCADE |
| user_id | UUID | FK → users.id |
| action | VARCHAR(50) | 'moved', 'assigned', 'label_added', 'commented', etc. |
| metadata | JSONB | Change details: { from_list, to_list }, etc. |
| created_at | TIMESTAMP | DEFAULT now() |

**Index:** `idx_activity_card_created` ON (card_id, created_at DESC)

### Entity Relationship Diagram

```
users (1) ──→ (N) workspace_members ←── (N) workspaces
                                              │
                                              └──→ (N) boards
                                                        │
                                        ┌──→ (N) card_labels
                                        │
                                        └──→ (N) lists
                                                   │
                                                   └──→ (N) cards
                                                             │
                                              ┌──────────────┼──────────────┐──────────────┐
                                              │              │              │              │
                                        card_assignees  card_comments  card_attachments  card_activity
                                              │
                                        card_label_assignments
```

---

## API Endpoints

### Auth

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

### Workspaces

```
POST   /api/workspaces                          # Create workspace
GET    /api/workspaces                          # List my workspaces
GET    /api/workspaces/:slug                    # Detail
PATCH  /api/workspaces/:id                      # Update
DELETE /api/workspaces/:id                      # Delete
POST   /api/workspaces/:id/invite               # Invite member (email)
GET    /api/workspaces/:id/members              # List members
PATCH  /api/workspaces/:id/members/:userId      # Change role
DELETE /api/workspaces/:id/members/:userId      # Remove member
```

### Boards

```
POST   /api/workspaces/:wsId/boards             # Create board
GET    /api/workspaces/:wsId/boards             # List boards
GET    /api/boards/:id                          # Full board (lists + cards)
PATCH  /api/boards/:id                          # Update
DELETE /api/boards/:id                          # Archive/delete
```

### Lists

```
POST   /api/boards/:boardId/lists               # Create list
PATCH  /api/lists/:id                           # Update (name, position)
DELETE /api/lists/:id                           # Archive list
POST   /api/boards/:boardId/lists/reorder       # Reorder lists (batch)
```

### Cards

```
POST   /api/lists/:listId/cards                 # Create card
GET    /api/cards/:id                           # Card detail (with comments, activity)
PATCH  /api/cards/:id                           # Update card
DELETE /api/cards/:id                           # Archive card
POST   /api/cards/:id/move                      # Move card (between lists or within list)
POST   /api/boards/:boardId/cards/reorder       # Batch reorder
```

### Card Sub-resources

```
POST   /api/cards/:id/comments                  # Add comment
PATCH  /api/cards/:cardId/comments/:commentId   # Edit comment
DELETE /api/cards/:cardId/comments/:commentId   # Delete comment

POST   /api/cards/:id/assignees                 # Assign user
DELETE /api/cards/:id/assignees/:userId          # Unassign

POST   /api/cards/:id/labels                    # Add label
DELETE /api/cards/:id/labels/:labelId            # Remove label

POST   /api/cards/:id/attachments               # Upload file
DELETE /api/cards/:id/attachments/:attId         # Delete file

GET    /api/cards/:id/activity                  # Activity history
```

### Labels (Board-level)

```
POST   /api/boards/:boardId/labels              # Create label
PATCH  /api/boards/:boardId/labels/:id          # Update
DELETE /api/boards/:boardId/labels/:id          # Delete
```

---

## WebSocket Events

### Connection and Rooms

```
# When opening a board, the client joins the room
ws:join-board     { boardId }     → server adds to room "board:{boardId}"
ws:leave-board    { boardId }     → server removes from room

# When opening a card (for collaborative editing)
ws:join-card      { cardId }      → server adds to room "card:{cardId}"
ws:leave-card     { cardId }      → server removes from room
```

### Presence Events

```
# Client → Server (every 2 seconds)
presence:heartbeat {
  boardId,
  cursor: { x, y },             # Mouse position on the board
  viewing: "card_abc" | null,   # Card currently open
  status: "active" | "idle"     # Idle if no mouse movement for 30s
}

# Server → Room (broadcast to all except sender)
presence:update {
  users: [
    {
      id: "user_123",
      name: "María",
      avatar: "https://...",
      color: "#E53E3E",
      cursor: { x: 450, y: 320 },
      viewing: "card_abc",
      status: "active"
    }
  ]
}

# When someone disconnects
presence:user-left { userId, boardId }
```

### Board Sync Events

```
# Server → Room (after each validated mutation)

list:created       { list }
list:updated       { listId, changes }
list:archived      { listId }
list:reordered     { positions: [{ listId, position }] }

card:created       { card, listId }
card:updated       { cardId, changes }
card:moved         { cardId, fromListId, toListId, newPosition }
card:archived      { cardId }

comment:created    { cardId, comment }
comment:updated    { cardId, commentId, content }
comment:deleted    { cardId, commentId }

assignee:added     { cardId, user }
assignee:removed   { cardId, userId }

label:added        { cardId, label }
label:removed      { cardId, labelId }
```

### Collaborative Editing (Yjs — Separate Channel)

```
# Yjs manages its own sync protocol via y-websocket
# Room name: "card-doc:{cardId}"
# The server acts as relay + persistence

# Flow:
1. User opens card → TipTap connects to y-websocket room
2. Yjs sync protocol exchanges state vectors
3. Each keystroke generates an update that is broadcast
4. Awareness cursors (name + color) are shown inline
5. On card close or every 30s → Y.Doc state is persisted to cards.description_yjs
6. description_text is updated as plaintext fallback
```

---

## Presence System — Detailed Design (Redis)

### Data Structures

```
# Hash — state of each user on a board
Key:    presence:board:{boardId}:user:{userId}
Fields: name, avatar, color, cursorX, cursorY, viewing, status, lastSeen
TTL:    15 seconds (auto-cleanup if no heartbeat)

# Set — quick list of users on a board
Key:    presence:board:{boardId}:users
Value:  Set of userIds
```

### Heartbeat Flow

```
1. Client sends presence:heartbeat every 2s
2. Server:
   a. HSET presence:board:{boardId}:user:{userId} ... (update fields)
   b. EXPIRE presence:board:{boardId}:user:{userId} 15
   c. SADD presence:board:{boardId}:users {userId}
   d. SMEMBERS presence:board:{boardId}:users → get all users
   e. For each userId: HGETALL → build presence array
   f. Broadcast presence:update to the room (except sender)

3. Cleanup (cron every 10s):
   - For each board with active users
   - Check TTL of each user key
   - If expired → SREM from set + broadcast presence:user-left
```

---

## Drag & Drop — Detailed Design

### Fractional Indexing

Instead of using integers for positions (which require renumbering everything on move), we use floats:

```
Example: List with 3 cards
  Card A: position 1.0
  Card B: position 2.0
  Card C: position 3.0

Move Card C between A and B:
  Card C: position = (1.0 + 2.0) / 2 = 1.5

Insert new card between A and C:
  New Card: position = (1.0 + 1.5) / 2 = 1.25

After ~50 dense insertions → trigger rebalancing:
  Recalculate all positions to uniform intervals (1.0, 2.0, 3.0, ...)
```

### Optimistic Update Flow

```
1. User drags Card X from "To Do" (position 2.0) → "In Progress" (between cards at position 1.0 and 3.0)

2. Frontend (immediate):
   a. Calculates new position: (1.0 + 3.0) / 2 = 2.0
   b. Moves card in local state → UI updates instantly
   c. Sends: POST /api/cards/:id/move { toListId, newPosition: 2.0 }
   d. Also emits socket: card:move (so others see immediately)

3. Backend:
   a. Validates permissions
   b. Updates card.list_id and card.position in DB
   c. Logs in card_activity: "moved from 'To Do' to 'In Progress' by María"
   d. Socket broadcast: card:moved (confirmation to all)
   e. Responds 200 to HTTP request

4. If it fails:
   a. Frontend receives error
   b. Reverts local state (rollback)
   c. Shows toast: "Couldn't move the card. Try again."

5. Other clients:
   a. Receive card:moved via socket
   b. Apply smooth animation (Framer Motion layoutId)
```

---

## Project Structure (Monorepo)

```
flowboard/
│
├── apps/
│   ├── api/                                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── workspace-role.decorator.ts    # @Roles('admin', 'member')
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── workspace-member.guard.ts       # Verifies membership
│   │   │   │   │   ├── workspace-role.guard.ts         # Verifies minimum role
│   │   │   │   │   └── board-access.guard.ts           # Verifies board access
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── transform.interceptor.ts
│   │   │   │   │   └── activity-log.interceptor.ts     # Auto-logs card_activity
│   │   │   │   └── utils/
│   │   │   │       ├── fractional-index.util.ts        # Position calculation
│   │   │   │       └── pagination.util.ts
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── jwt.config.ts
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── seeds/                              # Demo workspace + board + cards
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   └── entities/
│   │   │   │   │       └── user.entity.ts
│   │   │   │   │
│   │   │   │   ├── workspaces/
│   │   │   │   │   ├── workspaces.module.ts
│   │   │   │   │   ├── workspaces.controller.ts
│   │   │   │   │   ├── workspaces.service.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── workspace.entity.ts
│   │   │   │   │   │   └── workspace-member.entity.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── boards/
│   │   │   │   │   ├── boards.module.ts
│   │   │   │   │   ├── boards.controller.ts
│   │   │   │   │   ├── boards.service.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── board.entity.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── lists/
│   │   │   │   │   ├── lists.module.ts
│   │   │   │   │   ├── lists.controller.ts
│   │   │   │   │   ├── lists.service.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   └── list.entity.ts
│   │   │   │   │   └── dto/
│   │   │   │   │
│   │   │   │   ├── cards/
│   │   │   │   │   ├── cards.module.ts
│   │   │   │   │   ├── cards.controller.ts
│   │   │   │   │   ├── cards.service.ts
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── card.entity.ts
│   │   │   │   │   │   ├── card-label.entity.ts
│   │   │   │   │   │   ├── card-comment.entity.ts
│   │   │   │   │   │   ├── card-attachment.entity.ts
│   │   │   │   │   │   └── card-activity.entity.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-card.dto.ts
│   │   │   │   │       ├── update-card.dto.ts
│   │   │   │   │       └── move-card.dto.ts
│   │   │   │   │
│   │   │   │   ├── labels/
│   │   │   │   │   ├── labels.module.ts
│   │   │   │   │   ├── labels.controller.ts
│   │   │   │   │   └── labels.service.ts
│   │   │   │   │
│   │   │   │   ├── presence/
│   │   │   │   │   ├── presence.module.ts
│   │   │   │   │   ├── presence.service.ts            # Redis presence management
│   │   │   │   │   └── presence.gateway.ts            # WebSocket handler
│   │   │   │   │
│   │   │   │   ├── collaboration/
│   │   │   │   │   ├── collaboration.module.ts
│   │   │   │   │   ├── collaboration.service.ts       # Yjs document persistence
│   │   │   │   │   └── yjs-websocket.adapter.ts       # y-websocket server setup
│   │   │   │   │
│   │   │   │   └── gateway/
│   │   │   │       ├── gateway.module.ts
│   │   │   │       └── board.gateway.ts               # Board sync WebSocket events
│   │   │   │
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   │
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                                   # React + Vite Frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/                        # Base components
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Modal.tsx
│       │   │   │   ├── Avatar.tsx
│       │   │   │   ├── AvatarGroup.tsx
│       │   │   │   ├── Badge.tsx
│       │   │   │   ├── Dropdown.tsx
│       │   │   │   ├── Input.tsx
│       │   │   │   └── Toast.tsx
│       │   │   │
│       │   │   ├── layout/
│       │   │   │   ├── AppLayout.tsx
│       │   │   │   ├── Sidebar.tsx
│       │   │   │   └── Header.tsx
│       │   │   │
│       │   │   ├── board/
│       │   │   │   ├── BoardView.tsx              # The full board
│       │   │   │   ├── BoardHeader.tsx            # Name + online members
│       │   │   │   ├── List.tsx                   # A column
│       │   │   │   ├── ListHeader.tsx             # Editable name + menu
│       │   │   │   ├── Card.tsx                   # A card in the list
│       │   │   │   ├── CardPreview.tsx            # Compact card in list
│       │   │   │   ├── AddCard.tsx                # Input for new card
│       │   │   │   ├── AddList.tsx                # Button/input for new list
│       │   │   │   └── DragOverlay.tsx            # "Ghost" card while dragging
│       │   │   │
│       │   │   ├── card-detail/
│       │   │   │   ├── CardModal.tsx              # Full card modal
│       │   │   │   ├── CardTitle.tsx              # Inline editable title
│       │   │   │   ├── CardDescription.tsx        # Collaborative TipTap editor
│       │   │   │   ├── CardSidebar.tsx            # Labels, assignees, due date
│       │   │   │   ├── CardComments.tsx           # Comments list
│       │   │   │   ├── CardAttachments.tsx        # File attachments
│       │   │   │   ├── CardActivity.tsx           # Change history
│       │   │   │   └── CardChecklist.tsx          # Optional: checklist inside card
│       │   │   │
│       │   │   ├── presence/
│       │   │   │   ├── OnlineUsers.tsx            # Avatars in board header
│       │   │   │   ├── UserCursor.tsx             # Animated cursor with name
│       │   │   │   ├── UserCursorsLayer.tsx       # Overlay of all cursors
│       │   │   │   └── ViewingIndicator.tsx       # "María is editing..." on card
│       │   │   │
│       │   │   ├── workspace/
│       │   │   │   ├── WorkspaceSelector.tsx
│       │   │   │   ├── WorkspaceSettings.tsx
│       │   │   │   └── MembersList.tsx
│       │   │   │
│       │   │   └── demo/
│       │   │       ├── DemoBanner.tsx             # "You're in demo mode"
│       │   │       └── SimulatedUsers.tsx         # Bots that move cards/type
│       │   │
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── RegisterPage.tsx
│       │   │   ├── workspace/
│       │   │   │   ├── WorkspacesPage.tsx
│       │   │   │   └── WorkspaceDetailPage.tsx
│       │   │   ├── board/
│       │   │   │   └── BoardPage.tsx              # The main view
│       │   │   └── invite/
│       │   │       └── AcceptInvitePage.tsx
│       │   │
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useSocket.ts                   # Connection + rooms
│       │   │   ├── usePresence.ts                 # Heartbeat + other users' state
│       │   │   ├── useBoardSync.ts                # Listen to board events
│       │   │   ├── useCollaborativeEditor.ts      # Yjs + TipTap setup
│       │   │   ├── useDragAndDrop.ts              # dnd-kit setup
│       │   │   └── useOptimisticUpdate.ts         # Helper for optimistic + rollback
│       │   │
│       │   ├── services/
│       │   │   ├── api.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── boards.service.ts
│       │   │   ├── cards.service.ts
│       │   │   └── socket.service.ts
│       │   │
│       │   ├── stores/
│       │   │   ├── auth.store.ts
│       │   │   ├── board.store.ts                 # Local board state
│       │   │   └── presence.store.ts              # Online users
│       │   │
│       │   ├── types/
│       │   │   └── index.ts
│       │   │
│       │   ├── App.tsx
│       │   ├── router.tsx
│       │   └── main.tsx
│       │
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── board.types.ts
│       │   │   ├── card.types.ts
│       │   │   ├── presence.types.ts
│       │   │   ├── socket-events.types.ts          # Typed socket events
│       │   │   └── api-response.types.ts
│       │   ├── constants/
│       │   │   ├── roles.ts
│       │   │   └── colors.ts                       # Color palette for users
│       │   └── index.ts
│       └── package.json
│
├── docker-compose.yml                              # PostgreSQL + Redis
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
└── README.md
```

---

## Demo Mode — Detailed Design

Demo mode is what will take a recruiter from "interesting" to "wow."

### Simulated Users (Bots)

```typescript
// Bots simulate realistic behavior:
const DEMO_USERS = [
  { name: "María G.", avatar: "...", color: "#E53E3E" },
  { name: "Carlos R.", avatar: "...", color: "#3182CE" },
  { name: "Ana T.",    avatar: "...", color: "#38A169" },
];

// Random actions every 3-8 seconds:
const BOT_ACTIONS = [
  "move_card",          // Move a card to another list
  "type_in_card",       // Open card and type in description
  "add_comment",        // Add comment
  "move_cursor",        // Move cursor around the board
  "add_label",          // Assign label to card
  "idle",               // Stay still for a moment
];

// "María" bot prefers moving cards from "In Progress" → "Review"
// "Carlos" bot tends to add comments
// This makes it feel organic, not robotic
```

### Demo Board Template

```
Workspace: "Acme Engineering"
Board: "Q2 Sprint — Mobile App Redesign"

Lists:
├── Backlog (5 cards)
│   ├── "Research competitor onboarding flows"
│   ├── "Define new color palette with design team"
│   ├── "Audit current analytics events"
│   ├── "Write migration script for user preferences"
│   └── "Set up Storybook for new components"
│
├── To Do (4 cards)
│   ├── "Implement new navigation drawer"
│   ├── "Create onboarding carousel component"
│   ├── "Add dark mode toggle to settings"
│   └── "Write unit tests for auth flow"
│
├── In Progress (3 cards)
│   ├── "Build profile settings page" → assigned to María, labels: [Frontend, P1]
│   ├── "API: user preferences endpoint" → assigned to Carlos, labels: [Backend, P1]
│   └── "Design system: Button variants" → assigned to Ana, labels: [Design]
│
├── Review (2 cards)
│   ├── "Push notification permissions flow"
│   └── "Responsive layout for tablet"
│
└── Done (3 cards)
    ├── "Setup CI/CD pipeline" ✓
    ├── "Database schema migration" ✓
    └── "Authentication flow with biometrics" ✓
```

---

## README — Case Study Structure

```markdown
# FlowBoard — Real-time Collaborative Kanban

[hero screenshot: board with visible cursors + online avatars]
[GIF: card being dragged while another user types in a card description]

**FlowBoard** is a collaborative project management tool where teams
organize work on Kanban boards with real-time sync, live cursors,
and collaborative editing.

## Why I Built This
Collaboration is the hardest problem in web apps. I wanted to prove
I could build a system where multiple users interact with the same
data simultaneously — handling conflicts, presence, and sync.

## Key Technical Challenges

### 1. Real-time Presence System
[architecture diagram]
Redis-backed presence with heartbeats, cursor tracking, and auto
cleanup. Every user sees live cursors and who's viewing what.

### 2. Conflict-Free Collaborative Editing
Using Yjs (CRDT) with TipTap, multiple users edit the same card
description without conflicts. No operational transform needed.

### 3. Optimistic Drag & Drop
Cards move instantly on drag. The server validates and broadcasts.
If validation fails, the UI rolls back seamlessly.

### 4. Fractional Indexing
Positions use floats to avoid renumbering on every reorder.
Auto-rebalancing triggers when precision degrades.

## Tech Stack
[table]

## Live Demo
- App: [link]
- Click "Try Demo" — watch 3 simulated users collaborating live
- No signup required

## Architecture
[full diagram]

## Running Locally
[docker-compose instructions]

## What I Learned
- CRDTs are powerful but Yjs persistence needs careful handling
- Optimistic updates require thoughtful rollback UX
- Presence heartbeats at 2s intervals balance responsiveness vs load
```

---

## Important Technical Notes

### Performance
- Board query: single query with JOINs for lists + cards (avoid N+1)
- Fractional indexing eliminates massive UPDATEs on reorder
- Redis presence avoids PostgreSQL hits on each heartbeat
- Yjs sync is peer-to-peer-like (server is relay, doesn't process docs)

### Security
- WorkspaceMemberGuard on all board endpoints
- RoleGuard for destructive actions (admin/owner only)
- WebSocket auth via JWT in handshake
- Yjs rooms validated against board membership
- Rate limiting on WebSocket events (max 50 events/second per user)

### UX Details That Matter
- Cursors disappear with fade-out when user leaves
- Cards have elevated shadow while being dragged
- Typing indicator ("María is typing...") on card description
- Smooth layout animations with Framer Motion layoutId
- Keyboard shortcuts for power users
- Mobile responsive: cards tap to open, no drag on mobile
