---
status: complete
phase: 03-real-time-collaboration
source: [03-VERIFICATION.md]
started: 2026-04-12T19:31:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Two browser tabs show each other's cursors on canvas
expected: Colored cursor with name pill appears on Tab B when mouse moves in Tab A
result: pass

### 2. Collaborative editing: character-level sync in TipTap editor
expected: Typing in Tab A's card description appears in real-time in Tab B's TipTap editor
result: pass

### 3. Online user avatars appear in board header with join/leave animation
expected: Both tabs show colored avatar circles in header; closing one tab triggers leave animation
result: pass

### 4. Cursor glow breathe animation after 3s idle
expected: Cursor glow oscillates (8px to 14px to 8px drop-shadow) after mouse stops for 3 seconds
result: pass

### 5. Yjs state persists to database on disconnect
expected: Edit card description, close all tabs, reopen — content is still there
result: pass

### 6. Floating toolbar appears on text selection
expected: Select text in editor — floating toolbar with Bold/Italic/Strikethrough/Code/Link buttons appears
result: pass

### 7. Reconnect banner on y-websocket disconnect
expected: Stop API server — 'Reconnecting...' banner above editor; restart — banner disappears
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
