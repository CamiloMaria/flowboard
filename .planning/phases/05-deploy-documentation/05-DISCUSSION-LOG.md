# Phase 5: Deploy & Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 05-deploy-documentation
**Areas discussed:** README storytelling, Architecture diagram approach, Docker Compose scope, Deploy pipeline

---

## README Storytelling

### README Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Hero-first | GIF/screenshot hero at top, one-line description, then 'Why I Built This', architecture diagram, tech stack, getting started. Optimized for 30-second scanning. | ✓ |
| Technical-first | Architecture diagram at top, tech stack table, design decisions, then demo GIF lower. Leads with engineering depth. | |
| Narrative-first | Start with 'Why I Built This' essay, then demo GIF, then architecture. Leads with story and motivation. | |

**User's choice:** Hero-first (Recommended)
**Notes:** None

### README Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Technical narrative | First-person, concise. 3-4 paragraphs focusing on engineering challenges solved. Professional but shows passion. | ✓ |
| Problem-solution | Structured as Challenge → Approach → Result. More like a case study. | |
| Casual/conversational | Blog-post tone. Relatable but risks feeling unprofessional. | |

**User's choice:** Technical narrative (Recommended)
**Notes:** None

### Demo Media

| Option | Description | Selected |
|--------|-------------|----------|
| GIF from screen recording | Record demo flow, convert to GIF, host in repo. Plays inline on GitHub. | |
| Embedded video (GitHub) | Record as MP4, upload to GitHub. Better quality, requires clicking play. | |
| Link to live demo | Prominent 'View Live Demo' button pointing to deployed URL. No static media. | ✓ |

**User's choice:** Link to live demo
**Notes:** None

### Tech Stack Section

| Option | Description | Selected |
|--------|-------------|----------|
| Visual badges + table | Shield.io badges row plus compact table with one-line "why" per technology. | ✓ |
| Badges only | Just the badge row. Keeps README short. | |
| You decide | Agent picks the best format. | |

**User's choice:** Visual badges + table (Recommended)
**Notes:** None

---

## Architecture Diagram Approach

### Diagram Format

| Option | Description | Selected |
|--------|-------------|----------|
| Mermaid in README | Mermaid code block renders natively on GitHub. Easy to update. | ✓ |
| Static PNG/SVG image | Hand-crafted diagram. More visually polished, full control. | |
| Both | Mermaid for README + polished PNG in /docs. | |

**User's choice:** Mermaid in README (Recommended)
**Notes:** None

### Diagram Scope

| Option | Description | Selected |
|--------|-------------|----------|
| One system overview | Single diagram showing full architecture. Recruiter sees full picture in one glance. | ✓ |
| Multiple focused diagrams | Separate diagrams for system overview, dual WS routing, CRDT flow, presence. | |
| You decide | Agent picks based on README flow. | |

**User's choice:** One system overview (Recommended)
**Notes:** None

---

## Docker Compose Scope

### Docker Compose Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Infra-only + pnpm dev | Docker runs PostgreSQL + Redis only. Developer runs pnpm dev for apps. Hot reload works natively. | ✓ |
| Full stack in Docker | Add api and web services to docker-compose.yml. True one-command setup. | |
| Both profiles | Docker Compose profiles for infra-only (default) and full stack. | |

**User's choice:** Infra-only + pnpm dev (Recommended)
**Notes:** None

### Setup Flow

| Option | Description | Selected |
|--------|-------------|----------|
| README steps only | Clear numbered steps in README. No script. Transparent — recruiter sees each step. | ✓ |
| Setup script | One-liner bash script. More automated but hides steps. | |
| Both | README has manual steps AND a setup script. | |

**User's choice:** README steps only (Recommended)
**Notes:** None

---

## Deploy Pipeline

### Railway Build Method

| Option | Description | Selected |
|--------|-------------|----------|
| Dockerfile | Custom multi-stage Dockerfile. Full control. Handles monorepo correctly. | ✓ |
| Nixpacks | Railway's auto-detection. Less config but may struggle with monorepo. | |
| You decide | Agent picks whichever works. | |

**User's choice:** Dockerfile (Recommended)
**Notes:** None

### Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto on deploy | Start command: prisma migrate deploy && node dist/main.js. Runs automatically. | ✓ |
| Manual via Railway CLI | Developer runs manually before deploying. More control but easy to forget. | |
| Seed included | Auto-migrate AND auto-seed on first deploy. | |

**User's choice:** Auto on deploy (Recommended)
**Notes:** None

### Seeding Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Seed in start command | prisma migrate deploy && prisma db seed && node dist/main.js. Idempotent. | ✓ |
| Manual one-time seed | Developer runs seed once after first deploy. | |
| You decide | Agent picks most reliable approach. | |

**User's choice:** Seed in start command (Recommended)
**Notes:** None

### Auto-deploy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-deploy on push | Railway + Vercel watch main branch. Standard CI/CD. | ✓ |
| Manual deploy | Deploy only via CLI trigger. | |
| You decide | Agent configures standard approach. | |

**User's choice:** Auto-deploy on push (Recommended)
**Notes:** None

### Environment Variables

| Option | Description | Selected |
|--------|-------------|----------|
| .env.example + platform config | Committed .env.example with placeholders. Secrets in Railway/Vercel dashboards. | ✓ |
| Documented in README only | List required env vars in README without .env.example file. | |
| You decide | Agent picks standard approach. | |

**User's choice:** .env.example + platform config (Recommended)
**Notes:** None

### Frontend API URL

| Option | Description | Selected |
|--------|-------------|----------|
| Env var VITE_API_URL | Frontend reads at build time. Vercel sets to Railway URL. Local uses proxy. | ✓ |
| Relative paths only | Always /api/*. Vercel rewrites proxy to Railway. | |
| You decide | Agent picks cleanest approach. | |

**User's choice:** Env var VITE_API_URL (Recommended)
**Notes:** None

---

## Agent's Discretion

- Exact Dockerfile multi-stage build commands and base image
- Railway service configuration details
- Vercel project configuration
- CORS configuration
- Health check endpoint
- Mermaid diagram syntax and layout
- README section wording and badge ordering

## Deferred Ideas

None — discussion stayed within phase scope.
