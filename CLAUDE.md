## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Design System

The design system source of truth is `DESIGN.md` in the project root.

Key decisions:
- **Dark-only** — no light mode. Deep blue-black base (`#0C1017`), not pure black.
- **Accent**: Electric Cyan `#22D3EE`
- **Fonts**: Space Grotesk (display/headings), DM Sans (body), JetBrains Mono (code/meta)
- **Spacing**: 4px base unit
- **Motion**: Spring physics for drag/drop, glow effects for presence. Max duration 400ms.
- **8 user colors** for cursors/presence — all high-saturation on dark canvas
- **No glassmorphism** on cards (performance). No pure white or pure black.
- Respect `prefers-reduced-motion` for cursor breathe, rotation, ghost traces.

Always consult `DESIGN.md` before making UI decisions. Do not deviate from the approved design tokens.