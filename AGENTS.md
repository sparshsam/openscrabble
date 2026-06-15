# Agent Guide for OpenScrabble

This file provides context for AI coding agents working on the OpenScrabble repository.

## Project Overview

OpenScrabble is a local-first, two-player Scrabble game built with TypeScript and Vite. It runs entirely in the browser — no backend, no accounts, no AI.

## Architecture Constraints

- **Game logic must be UI-independent** — all game modules in `src/game/` are pure TypeScript with zero DOM dependency.
- **No framework** — the UI uses vanilla DOM intentionally. No React, Vue, Svelte, etc.
- **Mobile-first** — all CSS is responsive, starting from phone-sized viewports.
- **TypeScript strict mode** — `strict: true` with `noUncheckedIndexedAccess`.

## Key Conventions

- **Module structure**: `src/game/` for game logic, `src/ui/` for DOM rendering, `src/data/` for static data.
- **Testing**: Vitest, mirroring `src/game/` structure in `tests/`. All game logic should have tests.
- **No secrets**: everything runs client-side; no API keys or tokens needed.
- **State management**: explicit state objects, passed through Game orchestrator.

## Workflow

- Branch from `master` for all changes.
- Run `npm test` before committing.
- Run `npx tsc --noEmit` to type-check.
- Prefer conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
