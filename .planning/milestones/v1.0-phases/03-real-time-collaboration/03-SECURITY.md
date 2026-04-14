---
phase: 03-real-time-collaboration
status: secured
threats_total: 11
threats_closed: 11
threats_open: 0
asvs_level: 1
audited: 2026-04-13T00:00:00Z
---

# Phase 03: Real-Time Collaboration — Security Verification

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| y-websocket client → server | Untrusted binary Yjs updates from client WebSocket |
| server → PostgreSQL | Persistence of BYTEA data from client-supplied documents |
| client → Socket.io gateway | Cursor position data from untrusted client |
| Redis presence data → client | Online user info from shared Redis store |
| clipboard API | Copy content button writes to system clipboard |

## Threat Register

### Mitigated Threats (Verified)

| Threat ID | Category | Component | Status | Evidence |
|-----------|----------|-----------|--------|----------|
| T-03-02 | Tampering | yjs-persistence.ts | CLOSED | `yjs-persistence.ts:11-24` — UUID regex + parseCardId() validates before DB query |
| T-03-03 | Denial of Service | yjs-persistence.ts | CLOSED | `yjs.setup.ts:42` — `gc: true`; `yjs-persistence.ts:142` — 30s debounce |
| T-03-05 | Spoofing | useYjsProvider | CLOSED | `useYjsProvider.ts:38-40` — JWT as URL param; `yjs.setup.ts:273-288` — server verifies before upgrade |
| T-03-08 | Spoofing | presence:cursor | CLOSED | `board.gateway.ts:105` — uses `client.data.user` from JWT middleware, not client payload |
| T-03-09 | Denial of Service | presence:cursor | CLOSED | `usePresence.ts:4,26` — 50ms throttle; `board.gateway.ts:126-138` — room-scoped broadcast |

### Accepted Risks

| Threat ID | Category | Component | Reason |
|-----------|----------|-----------|--------|
| T-03-01 | N/A | Types only | No runtime code — no attack surface |
| T-03-04 | Information Disclosure | yjs-persistence.ts | Card descriptions are board-scoped; JWT auth on upgrade prevents unauthorized access |
| T-03-06 | Information Disclosure | ReconnectBanner | "Copy content" copies user's own editing content only — no PII risk |
| T-03-07 | Tampering | CollaborativeEditor | Yjs CRDT handles concurrent edits; TipTap sanitizes rendered content via ProseMirror schema |
| T-03-10 | Information Disclosure | presence:users | Online user names/colors are visible by design — collaborative board |
| T-03-11 | Tampering | cursor position | Cursor coordinates are decorative — tampering has no security impact |

### Bonus Hardening (Defense-in-Depth)

The implementation includes additional hardening beyond the threat model:
- Cursor coordinate validation (finite number check, 0-10000 clamping)
- Cross-board scope enforcement in the gateway (WR-02 fix from code review)
- `javascript:` URI blocking in the floating toolbar link prompt (WR-03 fix)

## Audit Trail

### Security Audit 2026-04-13

| Metric | Count |
|--------|-------|
| Threats found | 11 |
| Closed | 11 |
| Open | 0 |
