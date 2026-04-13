# Phase 4: Demo Mode & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 04-demo-mode-polish
**Areas discussed:** Bot choreography script, Demo lifecycle & protection, Animation refinements, Demo banner & guest UX

---

## Bot Choreography Script

### Q1: Choreography emphasis

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel wow-first | Start with multiple bots already active — cursors moving, cards being dragged, typing simultaneously. Hit the recruiter with "whoa, there are people here" in first 3 seconds. Then layer specific showcases. | ✓ |
| Sequential feature tour | Showcase one feature at a time: card drag, cursor movement, collaborative editing, presence join/leave. Clean and pedagogical. | |
| Story-driven sprint | Bots simulate a realistic sprint workflow: Maria moves Backlog→To Do, Carlos starts typing, Ana reviews. Feels real but less feature-dense. | |

**User's choice:** Parallel wow-first
**Notes:** Recruiter first impression is the optimization target. Multiple simultaneous bot actions create the "live collaboration" feel immediately.

### Q2: Cursor movement feel

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth path with pauses | Cursors move in smooth arcs, pause briefly on arrival as if reading/deciding, then act. Slightly randomized timing. | ✓ |
| Quick teleport-style | Cursors jump to target quickly. Looks like a power user. Less human feel. | |
| You decide | Agent picks based on existing animation system. | |

**User's choice:** Smooth path with pauses
**Notes:** Human-like cursor movement is critical for selling "these are real people."

### Q3: Random mode activity level

| Option | Description | Selected |
|--------|-------------|----------|
| Low-frequency natural | One bot action every 5-10 seconds. Calm team in flow state. | ✓ |
| High-frequency showcase | One bot action every 2-4 seconds. Board always visibly alive but may feel chaotic. | |
| Idle with bursts | Mostly idle with occasional 10-15 second activity bursts. Mimics real work waves. | |

**User's choice:** Low-frequency natural
**Notes:** Won't overwhelm recruiters who stay past 60 seconds.

### Q4: Collaborative editing timing

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted only | One choreographed moment: Carlos opens card, Maria joins to type. Character-level CRDT sync precisely timed. Random phase avoids card-opening. | ✓ |
| Both phases | Script once, then occasionally in random mode. Higher risk of visual conflicts. | |
| Random only | Let it happen organically. Less predictable. | |

**User's choice:** Scripted only
**Notes:** CRDT sync is the hardest feature to demonstrate — precise scripting ensures it looks impressive every time.

---

## Demo Lifecycle & Protection

### Q1: Bot trigger mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| On first guest join | Bots start when first guest joins demo board room (via board:join). New guests see ongoing activity. Bots stop after all leave + grace period. | ✓ |
| Always running | Bots run continuously on server timer. Simpler but uses resources when no one watching. | |
| Explicit REST trigger | DemoPage calls POST /api/demo/start. More control but adds network round trip. | |

**User's choice:** On first guest join
**Notes:** Efficient resource usage while ensuring instant bot activity on arrival.

### Q2: Demo board protection

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only guests | Guests observe only. Guards check role === 'guest' on mutation endpoints. Bots perform, guests watch. | ✓ |
| Limited interaction | Guests can move/type locally but changes don't persist or broadcast. | |
| Full interaction + auto-reset | Guests can do anything; board resets periodically. | |

**User's choice:** Read-only guests
**Notes:** Clean separation. No risk of guests disrupting the demo.

### Q3: Bot shutdown behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Grace period then stop | 30-60 second grace period after last guest leaves. Bots clear presence from Redis. Next guest triggers fresh choreography. | ✓ |
| Keep running 5 minutes | Longer grace for link sharing. More resource use. | |
| You decide | Agent picks shutdown strategy. | |

**User's choice:** Grace period then stop
**Notes:** Balances resource efficiency with link-sharing scenarios.

---

## Animation Refinements

### Q1: Card drag rotation

| Option | Description | Selected |
|--------|-------------|----------|
| Implement per DESIGN.md | +/-2deg tilt based on horizontal drag velocity. spring(1, 80, 12). Adds physical weight. | ✓ |
| Skip rotation | Current drag (scale + shadow) is solid enough. Save time for bot work. | |
| You decide | Agent evaluates effort vs. payoff. | |

**User's choice:** Implement per DESIGN.md
**Notes:** Premium feel is worth the implementation effort.

### Q2: Cursor ghost trace

| Option | Description | Selected |
|--------|-------------|----------|
| Implement full spec | Two-phase exit: cursor fades 400ms, then glow dot lingers 600ms. Separate ghost element. Polished and intentional. | ✓ |
| Extend fade to 1s | Slower single fade covers both phases. Less complex, close enough. | |
| You decide | Agent picks based on existing AnimatePresence setup. | |

**User's choice:** Implement full spec
**Notes:** Two-phase exit feels intentional, not like a rendering artifact.

### Q3: Card cascade stagger

| Option | Description | Selected |
|--------|-------------|----------|
| Implement cascade stagger | 200ms + 30ms stagger between sibling cards on add/remove. Visible during bot choreography. | ✓ |
| Skip cascade | Current layout animations are smooth enough. Focus on bot choreography. | |
| You decide | Agent evaluates based on existing layout animation quality. | |

**User's choice:** Implement cascade stagger
**Notes:** Ripple effect when bots move cards will make the board feel alive.

---

## Demo Banner & Guest UX

### Q1: Banner CTAs

| Option | Description | Selected |
|--------|-------------|----------|
| Sign Up only | Single "Sign Up" CTA → /register. Text: "You're watching a live demo — real-time collaboration powered by WebSockets & CRDTs." | ✓ |
| Both buttons per DESIGN.md | Keep [Try Demo] + [Sign Up] as specced. | |
| Tech showcase link | "View Source" or "How it works" → GitHub README. | |

**User's choice:** Sign Up only
**Notes:** Guest is already IN the demo. No need for "Try Demo" button.

### Q2: First load experience

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton then instant activity | BoardSkeleton during JWT creation + board fetch. Bots visibly active as soon as board renders. Target: 2-3 seconds. | ✓ |
| Splash then board | Branded splash for 1-2 seconds, then board. Adds delay before wow moment. | |
| You decide | Agent picks fastest path to wow. | |

**User's choice:** Skeleton then instant activity
**Notes:** Minimize time to "live collaboration visible." No unnecessary splash screens.

### Q3: Banner dismiss persistence

| Option | Description | Selected |
|--------|-------------|----------|
| sessionStorage | Dismissed within same session, comes back on new tabs/sessions. Matches DESIGN.md spec. | ✓ |
| Always visible | Never dismissible. Every recruiter sees context. | |
| You decide | Agent picks per spec and UX best practices. | |

**User's choice:** sessionStorage
**Notes:** Low friction. Matches DESIGN.md specification.

---

## Claude's Discretion

- Exact timing intervals within the 60-second choreography script
- Specific card targets for bot actions
- Bot cursor path generation algorithm
- Grace period exact duration (30-60s range)
- NestJS DemoModule structure
- Ghost trace glow fade spring params
- Cascade stagger implementation approach

## Deferred Ideas

None — discussion stayed within phase scope.
