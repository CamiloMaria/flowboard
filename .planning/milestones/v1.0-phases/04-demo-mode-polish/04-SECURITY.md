---
phase: 04
slug: demo-mode-polish
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-13
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| guest→API | Guest JWT holders attempt mutation API calls on demo board | HTTP requests with guest JWT (role='guest') |
| bot→services | Bots call BoardService/PresenceService directly (trusted, server-side) | Internal service calls (no network boundary) |
| client→sessionStorage | Banner dismiss state stored in client browser storage | Boolean dismiss flag (non-sensitive) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | D (DoS) | CursorGhostTrace | accept | Ghost traces are short-lived (600ms) and bounded by online user count (~10 max) | closed |
| T-04-02 | D (DoS) | Cascade stagger | accept | Stagger delay bounded by cards per column (~5). No user-controlled timing input | closed |
| T-04-03 | E (Elevation) | board.controller | mitigate | `assertNotGuestOnDemo()` guard on all 7 mutation endpoints — `board.controller.ts:33-40`. Checks `user.role === 'guest' && boardId === DEMO_BOARD_ID` → ForbiddenException | closed |
| T-04-04 | T (Tampering) | demo.service | accept | Bots call services directly (server-side). No WebSocket or external input to bot actions | closed |
| T-04-05 | D (DoS) | demo.service | mitigate | Grace period (`GRACE_PERIOD_MS = 45_000` at `bot-user.interface.ts:23`), idempotent `startBots()` guard (`demo.service.ts:116`), AbortController for cancellation (`demo.service.ts:36,123,193`) | closed |
| T-04-06 | S (Spoofing) | board.gateway | accept | Guest role from JWT (signed, server-verified). Existing ws-auth.middleware validates on connect | closed |
| T-04-07 | D (DoS) | choreography.ts | mitigate | AbortSignal propagated through all async loops (`choreography.ts:22,35,83`, `random-behavior.ts:58,183`, `cursor-path.ts:82-92`). Grace period prevents rapid restart. Random loop intervals 5-10s | closed |
| T-04-08 | T (Tampering) | random-behavior.ts | accept | Bots hardcoded to DEMO_BOARD_ID only. Card selection from board data (no user input) | closed |
| T-04-09 | I (Info Disclosure) | choreography.ts | accept | Bots operate on public demo board with seeded data. No PII or sensitive data involved | closed |
| T-04-10 | T (Tampering) | DemoBanner | accept | sessionStorage is client-only. User clearing it only re-shows banner. No security impact | closed |
| T-04-11 | I (Info Disclosure) | DemoPage | accept | Guest JWT is ephemeral (24h, no DB row). Demo board is public seeded data. No PII exposure | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-01 | Ghost traces self-remove after 600ms animation. Map bounded by max concurrent users. No amplification vector | gsd-security-auditor | 2026-04-13 |
| AR-04-02 | T-04-02 | Stagger delay is `index * 0.03` — max ~5 cards per column = 150ms. No user input controls timing | gsd-security-auditor | 2026-04-13 |
| AR-04-03 | T-04-04 | Server-side bot calls bypass WebSocket layer entirely. No external attack surface for bot tampering | gsd-security-auditor | 2026-04-13 |
| AR-04-04 | T-04-06 | JWT verification is handled by existing auth middleware (Phase 01). Role cannot be spoofed without JWT secret | gsd-security-auditor | 2026-04-13 |
| AR-04-05 | T-04-08 | DEMO_BOARD_ID is a constant. Bot operations never reference other boards. No user input to board selection | gsd-security-auditor | 2026-04-13 |
| AR-04-06 | T-04-09 | Demo board contains only seeded sample data (cards, lists). No user-generated content at risk | gsd-security-auditor | 2026-04-13 |
| AR-04-07 | T-04-10 | sessionStorage is client-scoped. Worst case: banner re-appears. No auth or data implications | gsd-security-auditor | 2026-04-13 |
| AR-04-08 | T-04-11 | Guest JWT grants read-only access to a single public board. No PII, no persistent identity | gsd-security-auditor | 2026-04-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-13 | 11 | 11 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-13
