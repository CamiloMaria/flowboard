# Phase 3: Real-time Collaboration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 03-real-time-collaboration
**Areas discussed:** TipTap editor scope, Board cursor behavior, Online users & join/leave UX, Collaborative editing lifecycle

---

## TipTap Editor Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | Bold, italic, strikethrough, bullet/ordered lists, code inline. No visible toolbar — formatting via keyboard shortcuts and markdown shortcuts. Clean look like Linear's editor. | ✓ |
| Standard toolbar | Visible toolbar row above editor with formatting buttons. More discoverable but adds visual weight. | |
| Full StarterKit | All StarterKit extensions including headings, blockquotes, code blocks, horizontal rules, plus toolbar. | |

**User's choice:** Minimal
**Notes:** Focus is on CRDT sync demo, not editor features.

### Floating toolbar on text selection

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, floating toolbar on select | Toolbar appears above selected text with bold/italic/strikethrough/code/link buttons. Like Notion. | |
| No, keyboard shortcuts only | Pure keyboard-driven formatting. Cleanest visual. | |
| You decide | Agent picks based on what works best with TipTap + Collaboration extensions. | ✓ |

**User's choice:** You decide (agent's discretion)

### Placeholder text

| Option | Description | Selected |
|--------|-------------|----------|
| "Add a description..." | Simple, direct. Common in Trello/Linear. | ✓ |
| "Type / for commands..." | Implies slash-command support (not being built). Misleading. | |
| You decide | Agent picks something appropriate. | |

**User's choice:** "Add a description..."

---

## Board Cursor Behavior

### Cursor tracking scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full mouse tracking | Actual cursor arrows moving across board canvas in real-time. Like Figma. Highest wow factor. Throttled at ~50ms. | ✓ |
| Card-level indicators | Colored dot/badge on cards being hovered/interacted with. Lower visual impact, simpler. | |
| Cursors in editor only | Cursors only visible inside TipTap. No board-level tracking. | |

**User's choice:** Full mouse tracking

### Cursor visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Arrow + name pill | Small arrow SVG in user's color with rounded pill label showing name, offset below-right. Classic Figma style. Glow via drop-shadow. | ✓ |
| Dot + name label | Colored dot (8-10px) with name text above/below. Simpler, less skeuomorphic. | |
| You decide | Agent picks best visual for dark theme. | |

**User's choice:** Arrow + name pill

### Idle breathe animation

| Option | Description | Selected |
|--------|-------------|----------|
| Glow pulse | Drop-shadow opacity pulses 0.4→0.7→0.4 on ~2s cycle when stationary 3+ seconds. Stops on movement. | ✓ |
| Scale breathe | Cursor scales 1.0→1.05→1.0 on idle. May look jittery. | |
| You decide | Agent picks best animation for dark theme. | |

**User's choice:** Glow pulse

### Cursor exit animation

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost fade | Cursor fades out over 400ms, glow lingers 600ms. Per PLSH-04 spec. Clean, intentional exit. | ✓ |
| Instant remove | Cursor disappears immediately. No animation. | |
| You decide | Agent picks exit animation. | |

**User's choice:** Ghost fade

---

## Online Users & Join/Leave UX

### Avatar appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Colored initials circle | Circle with first initial, filled with assigned color. 32-36px. Stacked with overlap (-8px). Matches cursor color. | ✓ |
| Colored ring + generic icon | Default user silhouette with colored ring border. More generic. | |
| You decide | Agent picks best avatar style. | |

**User's choice:** Colored initials circle

### Max avatars before overflow

| Option | Description | Selected |
|--------|-------------|----------|
| 5 visible, then +N | Compact header. Sufficient for demo (3 bots + 1-2 guests). | ✓ |
| 8 visible, then +N | More generous display. Handles larger groups. | |
| You decide | Agent picks based on header space. | |

**User's choice:** 5 visible, then +N

### Join/leave animation

| Option | Description | Selected |
|--------|-------------|----------|
| Scale + fade | Join: scale 0→1.0 with spring + fade in (200-300ms). Leave: reverse. Avatar stack adjusts via layout animation. | ✓ |
| Slide in/out | New avatar slides in from right, leaving slides out left. More directional. | |
| You decide | Agent picks animation. | |

**User's choice:** Scale + fade

### Header layout position

| Option | Description | Selected |
|--------|-------------|----------|
| Right side, before ConnectionStatus | Avatars right of board title, ConnectionStatus at far right. | |
| Replace ConnectionStatus | Avatars being visible IS the connection indicator. | |
| You decide | Agent picks best header layout. | ✓ |

**User's choice:** You decide (agent's discretion)

---

## Collaborative Editing Lifecycle

### Yjs connection timing

| Option | Description | Selected |
|--------|-------------|----------|
| On modal open/close | Connect WebsocketProvider on modal open, disconnect on close. One Y.Doc per card. Clean lifecycle. | ✓ |
| On editor focus/blur | Connect on click into description. Adds latency on first edit. | |
| Persistent per-board | Pre-connect all card docs on board join. Heavy resource usage. | |

**User's choice:** On modal open/close

### Co-editor indicator in modal

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, small avatars in modal header | Colored initial circles of users with same card open. Next to card title. | ✓ |
| Cursors in editor are enough | TipTap cursors already show who's editing. No modal indicator. | |
| You decide | Agent picks. | |

**User's choice:** Yes, small avatars in modal header

### Plaintext-to-Yjs migration

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side init on first connect | bindState creates Y.Doc from descriptionText when descriptionYjs is null. One-time, transparent. | ✓ |
| Client-side init | TipTap detects empty doc, inserts plaintext. Risk: duplicate text with concurrent opens. | |
| You decide | Agent picks safest approach. | |

**User's choice:** Server-side init on first connect

### Disconnection handling

| Option | Description | Selected |
|--------|-------------|----------|
| Offline banner + local edits | "Reconnecting..." banner. User keeps typing. Yjs buffers and auto-merges. "Connection lost" after N failures. | ✓ |
| Lock editor on disconnect | Disable editing until reconnect. Prevents divergence. | |
| You decide | Agent picks. | |

**User's choice:** Offline banner + local edits

---

## Agent's Discretion

- Floating toolbar on text selection (TipTap BubbleMenu)
- Avatar strip header layout relative to ConnectionStatus
- Exact idle breathe animation timing and easing curve
- Cursor throttle implementation approach
- NestJS module boundaries for presence
- Error retry count for y-websocket reconnection
- TipTap extension list beyond StarterKit

## Deferred Ideas

None — discussion stayed within phase scope.
