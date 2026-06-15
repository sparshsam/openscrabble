# CLAUDE.md

## Project Overview

OpenScrabble — local-first two-player Scrabble in the browser. TypeScript + Vite + vanilla DOM.

## Commands

- `npm run dev` — Start dev server (hot reload)
- `npm run build` — TypeScript check + Vite build
- `npm test` — Run Vitest tests
- `npm run typecheck` — `tsc --noEmit`
- `npm run test:watch` — Watch mode tests

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- No framework — vanilla DOM only
- `src/game/` is pure TypeScript, zero DOM dependency
- Mobile-first CSS
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

## Quality Gates

- `npm run typecheck` — must pass clean
- `npm test` — all tests pass
- `npm run build` — production build succeeds
