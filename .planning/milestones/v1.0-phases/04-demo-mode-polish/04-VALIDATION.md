---
phase: 04
slug: demo-mode-polish
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-13
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via ts-jest) |
| **Config file** | `apps/api/jest.config.ts` |
| **Quick run command** | `cd apps/api && npx jest --testPathPatterns "demo\|choreography\|guest-guard\|random-behavior" --forceExit` |
| **Full suite command** | `cd apps/api && npx jest --forceExit` |
| **Estimated runtime** | ~12 seconds (Phase 4 tests only) |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && npx jest --testPathPatterns "demo\|choreography\|guest-guard\|random-behavior" --forceExit`
- **After every plan wave:** Run `cd apps/api && npx jest --forceExit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PLSH-01, PLSH-02, PLSH-03 | T-04-01 / T-04-02 | N/A (frontend animations) | manual | `cd apps/web && npx tsc --noEmit` | ✅ | ✅ green (TypeScript) |
| 04-01-02 | 01 | 1 | PLSH-04 | — | N/A (frontend cursor ghost trace) | manual | `cd apps/web && npx tsc --noEmit` | ✅ | ✅ green (TypeScript) |
| 04-02-01 | 02 | 1 | DEMO-01, DEMO-04 | T-04-03, T-04-05 | Bots register in presence; idempotent start | unit | `cd apps/api && npx jest --testPathPatterns demo.service.spec --forceExit` | ✅ | ✅ green |
| 04-02-02 | 02 | 1 | DEMO-05 | T-04-06 | Guest join triggers bots; grace period on leave | unit | `cd apps/api && npx jest --testPathPatterns demo.service.spec --forceExit` | ✅ | ✅ green |
| 04-02-03 | 02 | 1 | DEMO-06 | T-04-03 | Guest role blocked from all 7 mutation endpoints on demo board | unit | `cd apps/api && npx jest --testPathPatterns guest-guard.spec --forceExit` | ✅ | ✅ green |
| 04-03-01 | 03 | 2 | DEMO-02 | T-04-07 | 3 bots run in parallel, move cards, broadcast cursors, CRDT editing | unit | `cd apps/api && npx jest --testPathPatterns choreography-orchestration.spec --forceExit` | ✅ | ✅ green |
| 04-03-02 | 03 | 2 | DEMO-03 | T-04-08 | Random weighted behavior loop stops on abort; bot personalities | unit | `cd apps/api && npx jest --testPathPatterns "random-behavior-loop.spec\|choreography.spec" --forceExit` | ✅ | ✅ green |
| 04-04-01 | 04 | 2 | PLSH-05, PLSH-06, PLSH-07 | T-04-10, T-04-11 | N/A (frontend banner + theme) | manual | `cd apps/web && npx tsc --noEmit` | ✅ | ✅ green (TypeScript) |
| 04-05-01 | 05 | 3 | ALL | — | Integration checkpoint | manual | Human visual inspection | N/A | ✅ green (auto-approved) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new framework installs needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card drag rotates +/-2deg based on velocity | PLSH-01 | Frontend animation (no test runner in apps/web) | Drag card horizontally fast in browser — observe tilt |
| Card create/archive fade+scale | PLSH-02 | Frontend animation | Create/delete a card — observe fade+scale transition |
| Modal spring open/ease-in close | PLSH-03 | Frontend animation | Click card to open modal — observe spring scale; close — observe ease-in |
| Cursor ghost trace lingers 600ms | PLSH-04 | Frontend animation | Disconnect a remote cursor — observe glow linger |
| Dark theme matches DESIGN.md | PLSH-05 | Visual verification | Inspect dark theme: electric cyan accent, Space Grotesk + DM Sans |
| Skeleton screens during board fetch | PLSH-06 | Frontend UX | Navigate to /demo — observe skeleton before board appears |
| Toast notifications for errors | PLSH-07 | Frontend UX | Trigger an error — observe toast notification |
| Demo banner shows "live demo" text | PLSH-05 | Frontend component | Navigate to /demo — observe banner with Sign Up CTA |
| Zero-friction demo entry | DEMO-05 | Full-stack flow (guest JWT + redirect) | Navigate to /demo — observe automatic board loading |

---

## Validation Audit 2026-04-13

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

### Tests Created
| # | File | Type | Command |
|---|------|------|---------|
| 1 | `apps/api/src/demo/guest-guard.spec.ts` | unit | `cd apps/api && npx jest --testPathPatterns guest-guard.spec --forceExit` |
| 2 | `apps/api/src/demo/choreography-orchestration.spec.ts` | unit | `cd apps/api && npx jest --testPathPatterns choreography-orchestration.spec --forceExit` |
| 3 | `apps/api/src/demo/random-behavior-loop.spec.ts` | unit | `cd apps/api && npx jest --testPathPatterns random-behavior-loop.spec --forceExit` |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual-only justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A — existing infrastructure)
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter (partial — frontend has no test runner)

**Approval:** partial 2026-04-13 — backend fully covered, frontend manual-only (no vitest configured)
