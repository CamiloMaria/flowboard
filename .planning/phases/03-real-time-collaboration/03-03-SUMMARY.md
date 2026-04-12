---
phase: 03-real-time-collaboration
plan: 03
subsystem: ui
tags: [tiptap, yjs, crdt, collaborative-editing, websocket, react]

# Dependency graph
requires:
  - phase: 03-real-time-collaboration/01
    provides: "Socket.io gateway, presence infrastructure, y-websocket server"
provides:
  - "CollaborativeEditor component with TipTap + Yjs CRDT sync"
  - "FloatingToolbar (BubbleMenu) with 5 formatting buttons"
  - "CoEditorAvatars component showing co-editors in modal header"
  - "ReconnectBanner with connection status and copy-content fallback"
  - "UserAvatar reusable component (sm/md sizes, initials, colored circle)"
  - "useYjsProvider hook managing Y.Doc/WebsocketProvider lifecycle"
  - "getCurrentUser() JWT decode helper"
affects: ["03-04", "03-05", "demo-mode"]

# Tech tracking
tech-stack:
  added: ["@tiptap/react@3.22.3", "@tiptap/starter-kit@3.22.3", "@tiptap/extension-collaboration@3.22.3", "@tiptap/extension-collaboration-cursor@3.0.0", "@tiptap/extension-placeholder@3.22.3", "@tiptap/extension-link@3.22.3", "yjs@13.6.30", "y-websocket@3.0.0"]
  patterns: ["Lifted Yjs provider to modal level for cross-component sharing", "JWT base64url decode for client-side user identity", "BubbleMenu from @tiptap/react/menus (v3 API)"]

key-files:
  created:
    - apps/web/src/hooks/useYjsProvider.ts
    - apps/web/src/components/editor/CollaborativeEditor.tsx
    - apps/web/src/components/editor/FloatingToolbar.tsx
    - apps/web/src/components/editor/ReconnectBanner.tsx
    - apps/web/src/components/editor/CoEditorAvatars.tsx
    - apps/web/src/components/presence/UserAvatar.tsx
    - apps/web/src/lib/user.ts
  modified:
    - apps/web/src/components/board/CardDetailModal.tsx
    - apps/web/src/app.css
    - apps/web/package.json

key-decisions:
  - "Lifted useYjsProvider to CardDetailModal instead of keeping inside CollaborativeEditor — avoids duplicate WebSocket connections and makes coEditors available for header display"
  - "Used @tiptap/extension-collaboration-cursor@3.0.0 (not 2.x) for TipTap v3 compatibility"
  - "Created getCurrentUser() JWT decoder in lib/user.ts — lightweight alternative to a full auth context provider"

patterns-established:
  - "CollaborativeEditor receives ydoc/provider as props (presentational pattern) — parent owns lifecycle"
  - "UserAvatar component with sm/md sizes for reuse across presence indicators"
  - "BubbleMenu import from @tiptap/react/menus (not @tiptap/react) in TipTap v3"

requirements-completed: [COLLAB-01, COLLAB-02, COLLAB-03]

# Metrics
duration: 7min
completed: 2026-04-12
---

# Phase 03 Plan 03: Collaborative Card Editor Summary

**TipTap CRDT editor with Yjs sync, floating format toolbar, co-editor avatars, and reconnect banner replacing textarea in CardDetailModal**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-12T19:00:04Z
- **Completed:** 2026-04-12T19:07:26Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Replaced textarea with TipTap collaborative editor backed by Yjs CRDT sync
- Created Notion-style floating toolbar (BubbleMenu) with Bold, Italic, Strikethrough, Code, Link buttons
- Built co-editor avatars strip in modal header showing up to 3 users + overflow pill
- Implemented reconnect banner with connection status and clipboard fallback for failed state
- Created reusable UserAvatar component for presence UI across the app
- Added useYjsProvider hook managing Y.Doc lifecycle, WebsocketProvider, awareness co-editors, and connection status tracking with 6-attempt failure threshold

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TipTap deps, create CollaborativeEditor + FloatingToolbar + useYjsProvider hook** - `031ac5d` (feat)
2. **Task 2: Wire CollaborativeEditor into CardDetailModal + CoEditorAvatars + ReconnectBanner + UserAvatar** - `8e9380d` (feat)

## Files Created/Modified
- `apps/web/src/hooks/useYjsProvider.ts` - Y.Doc + WebsocketProvider lifecycle, awareness co-editors, connection status
- `apps/web/src/components/editor/CollaborativeEditor.tsx` - TipTap editor with StarterKit, Collaboration, CollaborationCursor, Placeholder, Link
- `apps/web/src/components/editor/FloatingToolbar.tsx` - BubbleMenu with 5 format buttons and aria-labels
- `apps/web/src/components/editor/ReconnectBanner.tsx` - Connection status banner with copy-content fallback
- `apps/web/src/components/editor/CoEditorAvatars.tsx` - Avatar strip with max-3 + overflow, AnimatePresence
- `apps/web/src/components/presence/UserAvatar.tsx` - Reusable colored circle avatar with initials
- `apps/web/src/lib/user.ts` - JWT decode helper for current user identity
- `apps/web/src/components/board/CardDetailModal.tsx` - Removed textarea, wired CollaborativeEditor + CoEditorAvatars
- `apps/web/src/app.css` - TipTap placeholder, inline code, collaboration cursor styles
- `apps/web/package.json` - Added 8 TipTap/Yjs dependencies
- `pnpm-lock.yaml` - Lockfile updated

## Decisions Made
- Lifted useYjsProvider to CardDetailModal (not CollaborativeEditor) to share coEditors state with header while avoiding duplicate WebSocket connections
- Used @tiptap/extension-collaboration-cursor@3.0.0 for TipTap v3 compatibility (2.x peer dep mismatch with @tiptap/core@3.x)
- Created lightweight JWT decoder in lib/user.ts instead of full auth context — sufficient for extracting name/color from token payload

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed collaboration-cursor v3 for TipTap compatibility**
- **Found during:** Task 1 (dependency installation)
- **Issue:** pnpm installed @tiptap/extension-collaboration-cursor@2.26.2 which has unmet peer dependency with @tiptap/core@3.22.3
- **Fix:** Explicitly installed @tiptap/extension-collaboration-cursor@3.0.0 which is compatible with TipTap v3
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 031ac5d (Task 1 commit)

**2. [Rule 2 - Missing Critical] Created getCurrentUser() JWT helper for user identity**
- **Found during:** Task 2 (wiring CollaborativeEditor into CardDetailModal)
- **Issue:** No user identity source on frontend — name/color needed for collaborative cursor display
- **Fix:** Created lib/user.ts with JWT payload decoder (base64url decode, no crypto lib needed)
- **Files modified:** apps/web/src/lib/user.ts
- **Verification:** TypeScript compiles, provides UserPayload type
- **Committed in:** 8e9380d (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CollaborativeEditor, FloatingToolbar, CoEditorAvatars, ReconnectBanner, and UserAvatar ready for use
- Plan 04 (board-level presence) can reuse UserAvatar component
- Plan 05 (demo bots) can leverage the awareness protocol for simulated cursors
- y-websocket server integration depends on Plan 01's backend (already complete)

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (031ac5d, 8e9380d) verified in git log.

---
*Phase: 03-real-time-collaboration*
*Completed: 2026-04-12*
