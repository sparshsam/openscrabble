# OpenScrabble — Agent Instructions

This file provides context for AI coding agents working on the OpenScrabble repository.

## Project Overview
Local-first, two-player Scrabble game. TypeScript + Vite + Vitest. Vanilla DOM — no framework.

## Current State (v0.4.10)
- **Dev server:** localhost:9999 (`npm run dev -- --port 9999`)
- **Build:** `npm run build`
- **Tests:** 140 tests, 9 files (`npm test`)
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

## Foundation Layer (v0.4.x)
- Onboarding flow: username → guest/sign-in (no P2/P3/P4 during onboarding)
- Hash-based routing: #hub, #new-game, #game?gameId=<id>, #history, #profile, #settings
- App shell with bottom nav
- Multi-game persistence: each game gets `openscrabble_save_<gameId>` key
- LocalGameStore in localStorage with CRUD for game records
- Per-game metadata (players, scores, winner, status, endReason, turns, best word)
- computeStats(username) for per-user stats (wins, losses, win rate, avg score)

## UI Layout Order
1. Header (back + title + theme toggle)
2. Score display (player names + scores)
3. Message area (submission feedback — flush, no padding)
4. Board (15×15 grid)
5. Live preview (word validation)
6. Rack (with header: label, ✕ Clear button, ● N bag toggle)
7. Bag view (collapsible: vowel/consonant/blank counts + A–Z grid)
8. Actions bar (Submit button + ··· More drawer)
9. Last move summary

## Current Features
- **Dictionary:** SOWPODS-derived with Collins UK-style enforcement. REJECTED_WORDS blocks fringe inclusions (e.g., KIL). MISSING_WORDS patch for valid words (LOONIE, TOONIE, POUTINE).
- **Resign/Quit:** "Resign" if moves played (opponent wins), "Quit Game" if no moves (record deleted, no loss).
- **Result screen:** Winner card (amber gradient), end reason badge, final scores, rematch/full history/home.
- **Word definitions:** API-backed, triggered by tapping words in preview/history. "Dictionary: Collins UK-style" label.
- **Swap mode:** Tap rack tiles to select for swap.
- **Theme toggle:** Fixed top-right corner, system/light/dark.
- **History:** Active, completed, abandoned games with real data.

## Workflow
- Branch from `master` for all changes
- Run `npm test` and `npm run typecheck` before committing
- TypeScript strict, vanilla DOM, mobile-first CSS
