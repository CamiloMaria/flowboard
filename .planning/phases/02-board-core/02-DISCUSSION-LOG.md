# Phase 2: Board Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 02-board-core
**Areas discussed:** Card appearance on board, Card detail modal, DnD visual feedback, Real-time sync strategy

---

## Card Appearance on Board

| Option | Description | Selected |
|--------|-------------|----------|
| Title + color stripe | Clean minimal card: title text with colored top border/stripe from coverColor. Compact density, lets the board breathe. Similar to Linear's issue cards. | yes |
| Title + color + assignee | Title, color stripe, and small avatar circle for card creator. More context but adds visual noise. | |
| Title + color + preview | Title, color stripe, and 1-2 lines of truncated description. Richer but taller cards. | |

**User's choice:** Title + color stripe (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline + bottom button | List name editable by clicking directly. '+ Add card' button at bottom of each list. Trello-like convention. | yes |
| Inline + top button | List name editable by clicking. '+ Add card' button at top of each list. | |
| You decide | Agent picks standard Kanban convention. | |

**User's choice:** Inline + bottom button (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Click to open modal, pencil icon to edit inline | Clicking card opens detail modal. Pencil icon (visible on hover) triggers inline title editing. | |
| Double-click for inline edit | Single click opens modal, double-click enters inline edit mode. | |
| You decide | Agent picks the most intuitive interaction pattern. | yes |

**User's choice:** You decide
**Notes:** Agent has discretion on inline title editing trigger pattern.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, '+ Add List' column at end | Ghost column at right edge with '+ Add List' placeholder. Click to type, Enter to create. | yes |
| No, fixed 5 lists only | Demo board has exactly 5 lists. No add-list UI. | |
| You decide | Agent decides based on CRUD completeness. | |

**User's choice:** Yes, '+ Add List' column at end (Recommended)
**Notes:** None

---

## Card Detail Modal

| Option | Description | Selected |
|--------|-------------|----------|
| Plain textarea | Simple textarea for description_text. Gets replaced by TipTap in Phase 3. Clean upgrade path. | yes |
| Read-only display | Show description as read-only. No editing until Phase 3. | |
| Basic Markdown textarea | Textarea with Markdown rendering preview. Gets thrown away when TipTap arrives. | |

**User's choice:** Plain textarea (Recommended)
**Notes:** Placeholder for TipTap + Yjs in Phase 3.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Editable in both places | Title is click-to-edit in modal AND inline on board. Both use same PATCH endpoint. | yes |
| Board inline only | Title only editable on board. Modal shows static heading. | |

**User's choice:** Editable in both places (Recommended)
**Notes:** Standard Kanban pattern (Trello, Linear).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay + Escape/click-outside | Centered overlay modal with backdrop dimming. Close via Escape, click outside, or X button. | yes |
| Slide-in panel from right | Panel slides from right edge (like Linear). Board visible underneath. | |
| You decide | Agent picks standard approach. | |

**User's choice:** Overlay + Escape/click-outside (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Title + description + list name + created date | Shows which list the card belongs to and when created. Minimal metadata. | yes |
| Title + description only | Bare minimum. No metadata. | |
| Title + description + list + date + cover color picker | Includes color picker for coverColor. More interactive. | |

**User's choice:** Title + description + list name + created date (Recommended)
**Notes:** None

---

## DnD Visual Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Lifted clone with shadow + slight tilt | Scaled-up (1.02-1.05x) clone with elevated shadow and subtle rotation (1-2 deg). Faded placeholder at original position. | yes |
| Semi-transparent clone | 60-70% opacity clone following cursor. Empty gap at original position. | |
| You decide | Agent picks for maximum recruiter wow-factor. | |

**User's choice:** Lifted clone with shadow + slight tilt (Recommended)
**Notes:** Matches DND-03 spec.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Gap indicator line + column highlight | Colored line (accent cyan) between cards at target position. Target column gets subtle highlight. | yes |
| Column highlight only | Target column highlighted but no specific gap indicator. | |
| You decide | Agent picks based on @dnd-kit capabilities. | |

**User's choice:** Gap indicator line + column highlight (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, smooth auto-scroll | Drag cursor in 60-80px edge zone triggers smooth horizontal scroll. | yes |
| No auto-scroll | User scrolls manually. | |
| You decide | Agent decides based on viewport vs list count. | |

**User's choice:** Yes, smooth auto-scroll (Recommended)
**Notes:** Essential for boards with overflow.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth layout animation to new position | Card animates from old to new position with spring transition (200-300ms). Other cards shift smoothly. | yes |
| Instant position swap | Card appears in new position immediately. No animation. | |
| You decide | Agent picks matching DND-06 spec. | |

**User's choice:** Smooth layout animation to new position (Recommended)
**Notes:** Maximum wow factor for recruiters watching in two tabs.

---

## Real-time Sync Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct cache patch | Socket.io events carry full updated entity. Frontend applies to TanStack Query cache via setQueryData. No refetch. | yes |
| Query invalidation (refetch) | Events trigger invalidateQueries. Adds round-trip delay to every remote change. | |
| Hybrid: patch for moves, invalidate for CRUD | Moves get direct patches. Creates/deletes trigger invalidation. | |

**User's choice:** Direct cache patch (Recommended)
**Notes:** Instant UI update, more code but smoother real-time feel.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per-board rooms | Client emits board:join with boardId. Server uses Socket.io rooms. Events only to same board. | yes |
| Broadcast to all connected clients | All events to all clients. Frontend filters by boardId. | |
| You decide | Agent picks standard approach. | |

**User's choice:** Yes, per-board rooms (Recommended)
**Notes:** Gateway room infrastructure already scaffolded.

---

| Option | Description | Selected |
|--------|-------------|----------|
| useMutation with onMutate snapshot + onError rollback | TanStack Query optimistic pattern. Snapshot, apply, revert on error with animation + toast. | yes |
| Zustand store for optimistic state | Zustand holds working state. Sync to server. On failure, revert. Splits state management. | |
| You decide | Agent picks cleanest approach. | |

**User's choice:** useMutation with onMutate snapshot + onError rollback (Recommended)
**Notes:** Battle-tested pattern.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle indicator in board header | Small green/yellow/red dot showing connection state. | yes |
| No visible indicator | Silent reconnection. No feedback if connection drops. | |
| You decide | Agent decides for portfolio demo. | |

**User's choice:** Subtle indicator in board header (Recommended)
**Notes:** Good for recruiter demo.

---

## Agent's Discretion

- Inline title editing trigger pattern (click-to-edit, pencil icon, or double-click)
- NestJS module boundaries
- Card component hierarchy and file organization
- Loading skeleton design
- Empty list state appearance
- Toast notification component choice
- Auto-scroll speed curve
- Card delete confirmation approach

## Deferred Ideas

None -- discussion stayed within phase scope.
