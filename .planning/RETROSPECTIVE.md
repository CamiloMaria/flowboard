# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 -- MVP

**Shipped:** 2026-04-13
**Phases:** 5 | **Plans:** 27 | **Commits:** 191

### What Was Built
- Full-stack real-time collaborative Kanban board with dual WebSocket architecture (Socket.io + y-websocket)
- JWT auth with guest flow, CRUD with drag-and-drop, CRDT collaborative editing, cursor presence
- Demo mode with 3 server-side bots performing scripted 60s choreography + random behavior
- Production deployment: Docker + CI/CD + Nginx reverse proxy + Vercel frontend
- Portfolio README with Mermaid architecture diagram, technical narrative, and live demo link

### What Worked
- Bottom-up phase ordering (foundation -> board -> collab -> demo -> deploy) prevented major rework
- Dual WebSocket spike in Phase 1 validated the riskiest architecture decision early
- TDD for health endpoint and unit tests caught issues before integration
- Code review gate after each phase caught 2 critical Docker issues before they reached production
- GSD workflow (discuss -> plan -> execute -> verify) provided good scaffolding for solo development

### What Was Inefficient
- REQUIREMENTS.md checkboxes never got ticked during execution -- had to bulk-update at milestone end
- Railway-to-Oracle-Cloud pivot during Phase 5 discuss caused ROADMAP/REQUIREMENTS misalignment that needed manual doc fixes
- E2E tests require a running database, making them effectively manual-only (13 human verification items accumulated)
- Phase 4 demo bot choreography was the most debugging-intensive work -- choreography timing and CRDT integration have many edge cases

### Patterns Established
- Capture-then-remove upgrade dispatcher for dual WebSocket coexistence on same HTTP server
- X-Socket-Id header for Socket.io broadcast exclusion (prevents echo on optimistic updates)
- Snapshot-based optimistic mutation rollback with TanStack Query
- Server-side bots calling service methods directly (no WebSocket connections needed)
- Fractional indexing with FLOAT + rebalancing for position ordering

### Key Lessons
1. Dual WebSocket coexistence needs explicit URL path routing at the HTTP upgrade level -- library defaults conflict silently
2. @dnd-kit 0.3.x API is clean but 0.x-version means sparse docs; expect to read source code
3. Prisma 7 generator changed from `prisma-client-js` to `prisma-client` -- version migration gotchas are real
4. Docker multi-stage builds with pnpm monorepos need careful layer ordering for cache efficiency
5. Prisma CLI being a devDependency means production images need it copied from the builder stage for migrate/seed

### Cost Observations
- Model mix: primarily Opus 4.6 for planning/execution, executor agents for parallel work
- Sessions: ~10 sessions across 3 days
- Notable: Wave-based parallel execution saved time on Phase 2 (7 plans) and Phase 5 (3 plans in Wave 1)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 191 | 5 | Initial GSD workflow adoption; established discuss->plan->execute->verify cycle |

### Cumulative Quality

| Milestone | Unit Tests | E2E Tests | LOC |
|-----------|-----------|-----------|-----|
| v1.0 | 53 passing | 33 (need DB) | 8,706 |

### Top Lessons (Verified Across Milestones)

1. Spike the riskiest technical decision in Phase 1 -- validates architecture before building on it
2. Code review gates after execution catch real bugs (2 critical Docker issues in v1.0)
3. Keep REQUIREMENTS.md aligned with discuss-phase decisions -- divergence compounds
