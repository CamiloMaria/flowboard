---
phase: 02-board-core
plan: 04
subsystem: ui
tags: [react, tanstack-query, optimistic-updates, inline-editing, modal, toast, motion, zustand]

# Dependency graph
requires:
  - phase: 02-board-core
    plan: 01
    provides: "TanStack Query provider (getQueryClient), Zustand UI store (selectedCardId, openCard, closeCard), shared types (BoardWithLists, Card, List), Tailwind v4 tokens, lucide-react"
  - phase: 02-board-core
    plan: 02
    provides: "REST API endpoints for list/card CRUD (POST/PATCH/DELETE), Socket.io broadcasting"
  - phase: 02-board-core
    plan: 03
    provides: "BoardPage, ColumnContainer, CardItem components, useBoard hook, board route"
provides:
  - "6 TanStack Query mutations with optimistic updates and rollback (useCreateList, useUpdateList, useDeleteList, useCreateCard, useUpdateCard, useDeleteCard)"
  - "CardDetailModal with editable title, textarea description, delete confirmation, spring animation"
  - "AddListGhost ghost column for list creation with inline form"
  - "InlineInput reusable click-to-edit component"
  - "Toast notification system (ToastProvider, Toast) with auto-dismiss and accessibility"
  - "List CRUD: create via ghost column, rename inline, delete with confirmation"
  - "Card CRUD: create in column footer, inline title edit, delete from modal"
  - "apiPatch helper for PATCH HTTP method"
affects: [03-collaborative-editing, 04-presence, 05-demo-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [tanstack-mutation-optimistic, inline-edit-component, toast-context-provider, card-detail-modal]

key-files:
  created:
    - apps/web/src/hooks/useBoardMutations.ts
    - apps/web/src/components/board/CardDetailModal.tsx
    - apps/web/src/components/board/AddListGhost.tsx
    - apps/web/src/components/board/InlineInput.tsx
    - apps/web/src/components/ui/Toast.tsx
    - apps/web/src/components/ui/ToastProvider.tsx
  modified:
    - apps/web/src/components/board/ColumnContainer.tsx
    - apps/web/src/components/board/CardItem.tsx
    - apps/web/src/pages/BoardPage.tsx
    - apps/web/src/App.tsx
    - apps/web/src/lib/api.ts
    - apps/web/src/app.css

key-decisions:
  - "Click-to-edit pattern for inline title editing (D-08: most intuitive for Kanban)"
  - "Toast container uses aria-live=polite on wrapper div, individual toasts also have role=status"
  - "Description textarea auto-saves on blur to match future TipTap behavior"

patterns-established:
  - "TanStack Query optimistic mutation: cancelQueries → snapshot → setQueryData → return {previous} → onError revert → onSettled invalidate"
  - "InlineInput: reusable component for click-to-edit pattern with Enter/Escape/Blur handling"
  - "Toast system: React context provider with addToast(type, title, body?), auto-dismiss 4s, stacked bottom-right"
  - "CardDetailModal layout: stable container for Phase 3 TipTap swap — description section is isolated div"

requirements-completed: [BORD-02, BORD-03, BORD-04, BORD-05, BORD-06]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 02 Plan 04: CRUD Interactions Summary

**Full list/card CRUD with TanStack Query optimistic mutations, inline editing, card detail modal with editable title/description/delete, toast notifications, and AddListGhost column**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T14:23:12Z
- **Completed:** 2026-04-12T14:28:22Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- 6 TanStack Query mutations with full optimistic update pattern (snapshot → apply → revert on error → invalidate on settle) per D-15
- Card detail modal with spring animation, backdrop blur, focus trap, editable title, textarea description, and delete with inline confirmation
- List CRUD: create via "+ Add List" ghost column, rename by clicking list name, delete with "can't be undone" confirmation
- Card CRUD: create via "Add a card" button with inline input, inline title editing on card face, delete from modal
- Toast notification system with error/warning/success types, auto-dismiss, slide-in animation, and WCAG aria-live
- InlineInput reusable component handling Enter (save), Escape (cancel), blur (auto-commit), auto-focus + select-all

## Task Commits

Each task was committed atomically:

1. **Task 1: useBoardMutations, InlineInput, AddListGhost, Toast system, ColumnContainer/CardItem updates** — `a82554d` (feat)
2. **Task 2: CardDetailModal with editable title, description textarea, delete confirmation** — `c8d30b1` (feat)

## Files Created/Modified

- `apps/web/src/hooks/useBoardMutations.ts` — 6 TanStack Query mutations with optimistic updates for list/card CRUD
- `apps/web/src/components/board/CardDetailModal.tsx` — Modal with editable title, description textarea, delete, spring animation
- `apps/web/src/components/board/AddListGhost.tsx` — Ghost column with inline create form for new lists
- `apps/web/src/components/board/InlineInput.tsx` — Reusable click-to-edit input with keyboard handling
- `apps/web/src/components/ui/Toast.tsx` — Toast notification component with auto-dismiss and accessibility
- `apps/web/src/components/ui/ToastProvider.tsx` — React context for toast system with addToast function
- `apps/web/src/components/board/ColumnContainer.tsx` — Added list rename, 3-dot delete menu, card create via InlineInput
- `apps/web/src/components/board/CardItem.tsx` — Added inline title editing via click on title text
- `apps/web/src/pages/BoardPage.tsx` — Wired AddListGhost, CardDetailModal with AnimatePresence
- `apps/web/src/App.tsx` — Wrapped with ToastProvider inside QueryProvider
- `apps/web/src/lib/api.ts` — Added apiPatch helper for PATCH HTTP method
- `apps/web/src/app.css` — Added toast-in keyframe animation

## Decisions Made

- **Click-to-edit for inline titles (D-08):** Single click on title text triggers InlineInput. Most intuitive for Kanban — matches how users expect to rename in Trello/Linear. No extra icons or double-click needed.
- **Toast aria-live on both wrapper and individual:** Container div gets `aria-live="polite"` and `role="status"` for screen reader announcements. Individual toasts also have `role="status"` for redundancy.
- **Description auto-save on blur:** Textarea saves when focus leaves, matching the pattern TipTap will use in Phase 3. Modal container layout stable for component swap.
- **apiPatch added to api.ts:** Original api.ts only had GET/POST/PUT/DELETE. PATCH needed for update endpoints — added as Rule 3 auto-fix (blocking issue).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added apiPatch to api.ts**
- **Found during:** Task 1 (useBoardMutations implementation)
- **Issue:** api.ts only exported apiGet, apiPost, apiPut, apiDelete — no PATCH method. CRUD endpoints use PATCH for updates.
- **Fix:** Added `apiPatch<T>(path, body?)` function using PATCH HTTP method
- **Files modified:** apps/web/src/lib/api.ts
- **Verification:** TypeScript compiles, mutations reference apiPatch correctly
- **Committed in:** a82554d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for PATCH endpoint calls. No scope creep.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All CRUD interactions complete — board is fully interactive (create/rename/delete lists, create/edit/delete cards)
- CardDetailModal ready for TipTap replacement in Phase 3 — description section layout is stable, only textarea component swaps
- useBoardMutations hook ready for drag-and-drop in Plan 05 (card move mutation can be added)
- Toast system ready for error feedback across all future mutations
- InlineInput component reusable for any future click-to-edit patterns

## Self-Check: PASSED

All 12 created/modified files verified present. All 2 commit hashes verified in git log.

---
*Phase: 02-board-core*
*Completed: 2026-04-12*
