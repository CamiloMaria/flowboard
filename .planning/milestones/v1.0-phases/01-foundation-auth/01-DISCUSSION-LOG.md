# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 01-foundation-auth
**Mode:** --auto (all decisions auto-selected from recommended defaults)
**Areas discussed:** Monorepo structure, Auth token strategy, Dual WebSocket pattern, Guest flow design

---

## Monorepo Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Turborepo layout | apps/api + apps/web + packages/shared, pnpm workspaces | auto |

**User's choice:** [auto] Standard Turborepo layout (recommended default)
**Notes:** Greenfield project, no existing structure to accommodate. Research recommends Just-in-Time Packages pattern for shared types.

---

## Auth Token Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Short-lived access + HTTP-only refresh cookie | 15min access in memory, 7d refresh in HTTP-only cookie, rotation on each use | auto |
| Long-lived access in localStorage | Simpler but XSS-vulnerable | |

**User's choice:** [auto] Short-lived access + HTTP-only refresh cookie (recommended default)
**Notes:** Design doc specifies "Refresh tokens stored in HTTP-only cookies, rotated on each use." Decision was pre-made.

---

## Dual WebSocket Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Manual upgrade handler with URL path routing | Intercept HTTP upgrade, route /yjs/ to ws.Server, let Socket.io handle /socket.io/ | auto |
| Separate ports | Socket.io on :3001, y-websocket on :3002 | |

**User's choice:** [auto] Manual upgrade handler (recommended default)
**Notes:** Design doc specifies same-server path routing. Research identifies this as #1 technical risk. Pitfall #1 and #5 are critical.

---

## Guest Flow Design

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create on /demo visit, no DB row | POST /api/auth/guest returns JWT with random name/color, role: "guest", 24h expiry | auto |

**User's choice:** [auto] Auto-create on /demo visit (recommended default)
**Notes:** Design doc fully specifies this pattern. No ambiguity.

---

## Agent's Discretion

- NestJS module boundaries
- Docker Compose configuration
- ESLint/Prettier setup
- TypeScript configuration

## Deferred Ideas

None.
