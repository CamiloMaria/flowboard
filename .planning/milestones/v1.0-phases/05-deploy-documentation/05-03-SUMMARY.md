---
phase: 05-deploy-documentation
plan: 03
subsystem: infra
tags: [vercel, vite, deployment, env-vars, spa]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Vite config with proxy, api.ts with fetch helpers, socket.ts with Socket.io client"
  - phase: 03-drag-drop-presence
    provides: "useYjsProvider hook with y-websocket connection"
provides:
  - "Vercel deployment configuration (SPA rewrite + asset caching)"
  - "VITE_API_URL environment variable support across all frontend network clients"
affects: [05-deploy-documentation]

# Tech tracking
tech-stack:
  added: []
  patterns: ["API_BASE constant from VITE_API_URL for cross-origin API calls in production"]

key-files:
  created: ["apps/web/vercel.json"]
  modified: ["apps/web/src/lib/api.ts", "apps/web/src/lib/socket.ts", "apps/web/src/hooks/useYjsProvider.ts"]

key-decisions:
  - "API_BASE as module-level constant in api.ts — prepended to all fetch paths for production cross-origin"
  - "Socket.io and y-websocket use empty string fallback (Vite proxy in dev) instead of hardcoded localhost:3001"

patterns-established:
  - "VITE_API_URL pattern: empty in dev (Vite proxy), full URL in production (Vercel env var)"

requirements-completed: [DPLY-02, DPLY-07]

# Metrics
duration: 3min
completed: 2026-04-13
---

# Phase 05 Plan 03: Vercel Frontend Deployment Summary

**Vercel SPA config with immutable asset caching and VITE_API_URL environment variable wired into api.ts, socket.ts, and useYjsProvider.ts for cross-origin production deployment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-13T23:43:36Z
- **Completed:** 2026-04-13T23:46:17Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Created `apps/web/vercel.json` with SPA catch-all rewrite (`/(.*) → /index.html`) and immutable cache headers for Vite-hashed `/assets/` directory
- Added `API_BASE` constant to `api.ts` from `VITE_API_URL`, prepended to all `fetch()` calls for cross-origin API access in production
- Updated `socket.ts` to use empty string fallback instead of hardcoded `localhost:3001` — connects through Vite proxy in local dev, directly to Oracle Cloud backend in production
- Updated `useYjsProvider.ts` to use `window.location.origin` fallback — y-websocket connects through Vite proxy in local dev, to Oracle Cloud in production

## Task Commits

Each task was committed atomically:

1. **Task 1: Vercel config + VITE_API_URL environment variable** - `eba40da` (feat)

## Files Created/Modified
- `apps/web/vercel.json` - Vercel deployment config: SPA rewrite + immutable cache headers for hashed assets
- `apps/web/src/lib/api.ts` - Added API_BASE constant from VITE_API_URL, prepended to all fetch paths
- `apps/web/src/lib/socket.ts` - Updated SOCKET_URL to use empty string fallback (Vite proxy in dev)
- `apps/web/src/hooks/useYjsProvider.ts` - Updated y-websocket URL to use window.location.origin fallback

## Decisions Made
- **API_BASE in api.ts:** Added module-level `API_BASE = import.meta.env.VITE_API_URL || ''` constant and updated `apiFetch` to use `fetch(\`\${API_BASE}\${path}\`, ...)`. All existing code passes relative paths (e.g., `/api/boards/...`) which still work in dev (empty prefix = relative path through Vite proxy) and get the full URL in production.
- **Empty string fallback for Socket.io:** Changed from `|| 'http://localhost:3001'` to `|| ''`. Socket.io client with empty string connects to current page origin, which in dev goes through Vite's WebSocket proxy. This is cleaner than hardcoding a port.
- **window.location.origin fallback for y-websocket:** Changed from `|| 'http://localhost:3001'` to `|| window.location.origin`. WebsocketProvider needs a full URL for the `ws://` protocol replacement, so `window.location.origin` provides the correct dev server URL.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated socket.ts and useYjsProvider.ts fallback URLs**
- **Found during:** Task 1 (VITE_API_URL implementation)
- **Issue:** socket.ts and useYjsProvider.ts had hardcoded `http://localhost:3001` fallbacks. In dev, this bypasses the Vite proxy (connects directly to backend), which works but is inconsistent with the api.ts pattern. More importantly, the plan specified updating these files for VITE_API_URL support.
- **Fix:** Changed fallbacks to empty string (socket.ts) and `window.location.origin` (useYjsProvider.ts) so all frontend network clients consistently use the Vite proxy in dev and VITE_API_URL in production.
- **Files modified:** apps/web/src/lib/socket.ts, apps/web/src/hooks/useYjsProvider.ts
- **Verification:** Build succeeds, grep confirms VITE_API_URL usage
- **Committed in:** eba40da (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — the socket/yjs fallback cleanup was necessary for consistent environment handling)
**Impact on plan:** Aligned with plan intent. The plan specified updating frontend code for VITE_API_URL; this extended to all three network clients (api, socket, yjs).

## Issues Encountered
None

## User Setup Required

**Vercel dashboard configuration required:**
- **Root Directory:** `apps/web`
- **Build Command:** `cd ../.. && pnpm install && pnpm --filter @flowboard/web build` (or let Vercel auto-detect)
- **Output Directory:** `dist`
- **Environment Variable:** `VITE_API_URL` = `https://your-api-domain.com` (Oracle Cloud backend HTTPS URL)

## Next Phase Readiness
- Vercel deployment configuration complete
- Frontend build verified successful with VITE_API_URL support
- Ready for actual Vercel deployment once Oracle Cloud backend is live (Plan 01) and domain configured

## Self-Check: PASSED

All files exist, all commits verified:
- `apps/web/vercel.json` — FOUND
- `apps/web/src/lib/api.ts` — FOUND
- `apps/web/src/lib/socket.ts` — FOUND
- `apps/web/src/hooks/useYjsProvider.ts` — FOUND
- `.planning/phases/05-deploy-documentation/05-03-SUMMARY.md` — FOUND
- Commit `eba40da` — FOUND

---
*Phase: 05-deploy-documentation*
*Completed: 2026-04-13*
