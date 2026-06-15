# Claude / AI Agent Instructions

## Repository Rules

1. **Never modify game logic without tests** — every module in `src/game/` must have a corresponding test file in `tests/`.
2. **No framework dependencies** — this project uses vanilla DOM. Do not introduce React, Svelte, or any UI framework.
3. **Mobile-first CSS** — all styles must work from 320px viewport width. Use `clamp()`, `min()`, and relative units.
4. **TypeScript strict mode** — `strict: true`, `noUncheckedIndexedAccess`. Avoid `any`.
5. **Clean imports** — import types from `types.ts`, not inline type definitions.

## Branch Workflow

- Branch naming: `type/description` (e.g., `feat/blank-tile-ui`, `fix/score-glitch`, `docs/readme-update`)
- Always branch from `main`
- Run `npm test` and `npx tsc --noEmit` before opening a PR
- Keep PRs focused on a single concern

## Coding Expectations

- Pure functions where possible, especially in scoring and validation
- Explicit error messages for invalid moves (shown in preview bar)
- No console.log in production code
- DOM queries scoped to the game container, not global

## Architecture Constraints

```
src/
├── game/     # Pure logic — no DOM, no imports from ui/
├── ui/       # DOM rendering — imports types and game classes
├── data/     # Static data (tile dist, word lists)
└── types.ts  # Single source of truth for all types
```

- `src/game/` must never import from `src/ui/`
- UI modules may import from both `src/game/` and `src/types.ts`
- `src/data/` is data-only, no logic
