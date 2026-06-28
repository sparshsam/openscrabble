# OpenScrabble — Project Guide

## Status
- **Version:** 0.3.0
- **Stack:** TypeScript + Vite + Vitest, vanilla DOM
- **Dev server:** `npm run dev` → localhost:2003
- **Tests:** 103 tests across 7 test files (`npm test`)
- **CI:** GitHub Actions workflow configured
- **Last update:** 2026-06-28 — Design overhaul

## Architecture
- **Game engine** (`src/game/`): Game, Board, Bag, ScoreCalculator, WordValidator, DictionaryLoader, Persistence, WordDefinitions
- **UI layer** (`src/ui/`): GameUI (~900 lines), HomePage (~225 lines), styles.css (~1300 lines)
- **Data** (`src/data/`): tileDistribution.ts, wordList.ts (~100K-word SOWPODS dictionary)
- **Tests** (`tests/`): 7 test files, 103 tests

## Design System
Reference playbooks in `docs/`:
1. **DESIGN_PLAYBOOK.md** — Premium editorial design system
2. **PRODUCT_ARCHITECTURE_PLAYBOOK.md** — Structural architecture

**Brand color:** `#cc7a00` (amber). Full design tokens in the CSS.

Premium squares from brand hierarchy: DL `#edb860` → TL `#d99c2e` → DW `#cc7a00` → TW `#733d00`.

### Key UI Features
- Dark/light toggle (fixed top-right, SVG icons, localStorage)
- Board frame: black in light mode, white in dark mode
- 3D beveled tiles with pending (floating) vs locked (seated) states
- Premium labels (DL/TL/DW/TW) shown on tiles at bottom-left
- Points badge always at bottom-right
- In-app modal replaces all `confirm()` calls
- All buttons are pills (`rounded-full`)

## Quick Commands
```bash
npm run dev         # Dev server on port 2003
npm run build       # Production build
npm test            # 103 tests
npm run typecheck   # tsc --noEmit
```

## Quality Gates
- `npm run typecheck` — must pass clean
- `npm test` — all 103 tests pass
- `npm run build` — production build succeeds
