# OpenScrabble — Project Guide

## Status
- **Version:** 0.4.10
- **Stack:** TypeScript + Vite + Vitest, vanilla DOM
- **Dev server:** `npm run dev -- --port 9999` → localhost:9999
- **Tests:** 140 tests across 9 test files (`npm test`)
- **CI:** GitHub Actions workflow configured (status check: `verify`)
- **Last update:** 2026-06-29 — v0.4.10 Game UI Overhaul + Tile Bag View

## Architecture
- **Game engine** (`src/game/`): Game, Board, Bag, ScoreCalculator, WordValidator, DictionaryLoader, Persistence, WordDefinitions
- **UI layer** (`src/ui/`): GameUI (~1300 lines), HubPage, ProfilePage, HistoryPage, SettingsPage, OnboardingPage, NewGameSetupPage, Modal, AppShell (~1200 total CSS)
- **Auth/Profile** (`src/auth/`, `src/profile/`): AuthService, ProfileService
- **Routing** (`src/lib/`): routes.ts (hash-based), LocalGameStore.ts, AppShell.ts, supabase.ts
- **Data** (`src/data/`): tileDistribution.ts, wordList.ts (~100K-word SOWPODS dictionary + MISSING_WORDS patch)
- **Tests** (`tests/`): 9 test files, 140 tests

## Design System
Reference playbooks in `docs/`:
1. **DESIGN_PLAYBOOK.md** — Premium editorial design system
2. **PRODUCT_ARCHITECTURE_PLAYBOOK.md** — Structural architecture

**Brand color:** `#cc7a00` (amber). Full design tokens in the CSS.

Premium squares from brand hierarchy: DL `#edb860` → TL `#d99c2e` → DW `#cc7a00` → TW `#733d00`.

### Key UI Features
- Dark/light toggle (fixed top-right, SVG icons, localStorage, system/light/dark)
- Board frame: black in light mode, white in dark mode
- 3D beveled tiles with pending (floating) vs locked (seated) states
- Premium labels (DL/TL/DW/TW) shown on tiles at bottom-left
- Points badge always at bottom-right
- In-app modal replaces all `confirm()` calls
- Buttons are pills (`rounded-full`) or full-width for submit
- Bottom nav: Play / History / Profile / Settings
- Bag view: collapsible A–Z grid with vowel/consonant/blank counts
- Last Move Summary: tappable word(s) above rack

### Screen Routes
| Hash | Screen |
|---|---|
| `#hub` | Main game hub (running games, completed, quick links) |
| `#new-game` | Player setup (2–4 players, defaults to current user) |
| `#game?gameId=<id>` | Active game by ID |
| `#onboarding` | First-time username + auth setup |
| `#history` | Active/completed/abandoned games |
| `#profile` | User stats (wins, losses, win rate, scores) |
| `#settings` | Profile, appearance (segmented theme toggle), data section |

### Dictionary
- Source: SOWPODS-derived ~100K-word list in `src/data/wordList.ts`
- Collins UK-style enforcement via `REJECTED_WORDS` set in `WordValidator.ts`
- Patch: `MISSING_WORDS` array merged at build time
- 2-letter words validated against official list
- Dictionary source shown as "Collins UK-style" in word details and error messages
- Default port changed from 2003 to 9999

## Quick Commands
```bash
npm run dev -- --port 9999   # Dev server on port 9999
npm run build                # Production build
npm test                     # 140 tests
npm run typecheck            # tsc --noEmit
```

## Quality Gates
- `npm run typecheck` — must pass clean
- `npm test` — all 140 tests pass
- `npm run build` — production build succeeds
