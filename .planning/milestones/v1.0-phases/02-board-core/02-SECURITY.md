---
phase: 02
slug: board-core
status: verified
threats_total: 19
threats_mitigated: 7
threats_accepted: 12
threats_open: 0
audited: 2026-04-12
---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> REST API | JWT-protected endpoints via global JwtAuthGuard |
| client -> Socket.io | JWT validated in ws-auth.middleware on handshake |
| client -> API (X-Socket-Id) | User-controlled header for broadcast exclusion only |
| REST mutations -> WS broadcast | Server-side only, no untrusted input in broadcast |
| frontend -> REST API | Board data fetched with JWT Bearer token |
| user input -> API mutations | User-typed values validated by server-side DTOs |
| client DnD -> API move | Card position calculated client-side, validated server-side |
| Socket.io server -> client | Server broadcasts validated data to room members |

## Threat Register

### Mitigated (7)

| Threat ID | Category | Component | Mitigation | Status | Evidence |
|-----------|----------|-----------|------------|--------|----------|
| T-02-01 | Spoofing | socket.ts auth | Socket.io auth sends JWT in handshake | CLOSED | `apps/web/src/lib/socket.ts:19` — `auth: { token: getAccessToken() }` |
| T-02-03 | Spoofing | board.controller | Global JwtAuthGuard via APP_GUARD | CLOSED | `apps/api/src/app.module.ts` — `{ provide: APP_GUARD, useClass: JwtAuthGuard }` |
| T-02-04 | Tampering | move-card.dto | class-validator @IsUUID, @IsNumber | CLOSED | `apps/api/src/board/dto/move-card.dto.ts` — `@IsUUID()` on targetListId, `@IsNumber()` on newPosition |
| T-02-10 | Tampering | InlineInput | Server-side DTO validation (MinLength, MaxLength) | CLOSED | `apps/api/src/board/dto/create-card.dto.ts` — `@MinLength(1) @MaxLength(500)` |
| T-02-11 | Tampering | CardDetailModal | Server-side validation, stored as plain text | CLOSED | `apps/api/src/board/dto/update-card.dto.ts` — `@IsString() @IsOptional()` |
| T-02-13 | Tampering | useBoardDnd position | Server validates newPosition via @IsNumber, rebalances on degradation | CLOSED | `apps/api/src/board/dto/move-card.dto.ts:9` + `board.service.ts rebalanceIfNeeded()` |
| T-02-15 | Spoofing | useBoardSocket | Socket.io JWT auth required for room join | CLOSED | `apps/api/src/auth/ws-auth.middleware.ts` — `jwtService.verify(token)` |

### Accepted (12)

| Threat ID | Category | Component | Rationale |
|-----------|----------|-----------|-----------|
| T-02-02 | Info Disclosure | board.store.ts | UI state only (selectedCardId, connectionStatus) — no PII or secrets |
| T-02-05 | Elevation | board.controller | No owner-check on board mutations — demo board is shared by design. Future: add board membership check. |
| T-02-06 | Info Disclosure | getBoard | Board data is not sensitive (portfolio project). No PII in board/list/card data. |
| T-02-07 | DoS | rebalanceIfNeeded | Rebalance queries one list. Max 50-100 cards per list in practice. |
| T-02-08 | Info Disclosure | useBoard | API validates JWT before returning data. Board data not sensitive. |
| T-02-09 | Tampering | CardItem onClick | Only updates local Zustand state (selectedCardId). No server mutation. |
| T-02-12 | DoS | useBoardMutations | TanStack Query deduplicates. Rate limiting not needed for portfolio project. |
| T-02-14 | DoS | auto-scroll RAF | Runs only during active drag. Stopped on drag end via cleanup. |
| T-02-16 | Tampering | cache updates | Data from trusted server. Client applies server-validated payloads. |
| T-02-17 | Info Disclosure | board events | Board data shared among room members by design. No PII. |
| T-02-gc-01 | Spoofing | X-Socket-Id header | Only controls broadcast exclusion. Worst case: originator sees own broadcast (no data leak). |
| T-02-gc-02 | Tampering | X-Socket-Id header | No data mutation possible. Attacker can only suppress one broadcast for another user. |

## Security Audit 2026-04-12

| Metric | Count |
|--------|-------|
| Threats found | 19 |
| Mitigated | 7 |
| Accepted | 12 |
| Open | 0 |

All mitigate-disposition threats verified in source code. All accept-disposition threats documented with rationale. No open threats.
