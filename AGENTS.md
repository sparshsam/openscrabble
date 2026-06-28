# OpenScrabble — Agent Instructions

This file provides context for AI coding agents working on the OpenScrabble repository.

## Project Overview
Local-first, two-player Scrabble game. TypeScript + Vite + Vitest. Vanilla DOM — no framework.

## Current State (v0.3.0)
- **Dev server:** localhost:2003 (`npm run dev`)
- **Build:** `npm run build`
- **Tests:** 103 tests, 7 files (`npm test`)
- **Type check:** `npm run typecheck`

## Architecture Constraints
- **Game logic must be UI-independent** — all `src/game/` modules are pure TypeScript with zero DOM dependency
- **No framework** — vanilla DOM intentionally
- **Mobile-first** — all CSS responsive from phone-sized viewports
- **TypeScript strict mode** — `strict: true` with `noUncheckedIndexedAccess`

## Key Conventions
- **Module structure:** `src/game/` for logic, `src/ui/` for DOM, `src/data/` for static data
- **Testing:** Vitest, mirror `src/game/` in `tests/`. All game logic should have tests
- **No secrets:** everything client-side; no API keys needed
- **CSS custom properties** for theming (no Tailwind)
- **Conventional commits:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

## Design System
Two playbooks in `docs/`: DESIGN_PLAYBOOK.md and PRODUCT_ARCHITECTURE_PLAYBOOK.md.
Brand color: `#cc7a00` amber. See CLAUDE.md for full token reference.

## Workflow
- Branch from `master` for all changes
- Run `npm test` and `npm run typecheck` before committing
- TypeScript strict, vanilla DOM, mobile-first CSS
