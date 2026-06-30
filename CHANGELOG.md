# Changelog

## v0.4.1 — Game Hub + Local History Foundation (2026-06-29)

Game hub polish and local game history system. Makes OpenScrabble feel like a complete mobile game shell while preserving local-first guest play.

### Added
- **LocalGameStore**: Full localStorage-based game record system with CRUD, active/completed/abandoned status tracking, and stats computation from history
- **Modal.ts**: Reusable confirmation and info modals — replaces all `browser confirm()` calls
- **Game records** created on new game start via `createActiveGameRecord()`
- **Continue Game card** on hub with turn count, player names, and last-played info
- **Empty state** on hub when no save exists
- **Quick Play** button with current player names
- **History sections**: Active Games, Completed, Abandoned — with clickable active games
- **Stats computed from history**: games played/won, average score, total score, last played date
- **Settings sections**: Profile, Gameplay, Appearance, Data — with safe modals for destructive actions
- **Data section** in Settings: Reset Welcome Screen, Clear Game History, Clear Current Save

### Changed
- HubPage: polished layout with continue card, new game, quick play, recent games, quick links
- ProfilePage: stats now calculated from `LocalGameStore.computeStats()` instead of standalone store
- HistoryPage: replaced placeholder with real game records, status-based sections, clickable active games
- SettingsPage: organized into sections (Profile, Gameplay, Appearance, Data) with safe modals
- All destructive confirmations use custom modal instead of `browser confirm()`

### Preserved
- `openscrabble_save` key untouched — existing saves fully compatible
- All existing gameplay, dark/light mode, mobile-first responsive
- Vanilla DOM architecture, game logic decoupled from UI
- Guest mode works fully offline, no backend needed

### Technical
- `src/lib/LocalGameStore.ts` — new game record store with `loadAllGames()`, `addGameRecord()`, `updateGameRecord()`, `computeStats()`, `createActiveGameRecord()`
- `src/ui/Modal.ts` — reusable `showModal()` and `showInfoModal()` with guard against double-open
- 103 existing tests preserved, all passing

## v0.4.0 — Basic Foundation Layer (2026-06-29)

The "Basic Foundation Layer" begins. This release adds the app shell, routing, onboarding, Supabase foundation, profile system, and PWA readiness while preserving all existing gameplay.

### Added
- **App routing**: Hash-based routing (#hub, #game, #profile, #history, #settings, #onboarding)
- **First-time onboarding**: Username setup, Guest/Google Sign-in choice, optional Player 2–4 setup
- **Main Hub dashboard**: New Game, Continue Game, Recent Games, Profile/Stats, Dictionary/Rules, Settings
- **Profile screen**: Username display, player stats, edit name, sign-out
- **Recent Games / History screen**: Game history list with scores, players, date
- **Settings screen**: Theme toggle, Player 1/2 names, about section
- **Supabase foundation**: Optional client setup with graceful offline degradation
- **Data model docs**: `docs/SUPABASE_SCHEMA.md` with proposed tables (profiles, games, game_players, game_turns, player_stats, user_settings)
- **CHANGELOG.md**: Project changelog added
- **PWA metadata**: Review of manifest, mobile-safe viewport, apple app metadata

### Changed
- HomePage now routes to hub or game screen
- Version bumped from 0.3.0 to 0.4.0
- Theme toggle centralized in app shell
- Route entry point directs through shell/router

### Preserved
- All existing gameplay (15×15 board, tile interactions, scoring, word validation)
- localStorage save/restore with `openscrabble_save` key — existing saves unaffected
- Dark/light mode toggle
- Mobile-first responsive design
- Vanilla DOM architecture, no framework
- Game logic decoupled from UI (`src/game/` is pure TypeScript)

### Technical
- `src/lib/supabase.ts` — Supabase client factory (graceful fallback when env vars missing)
- `src/auth/AuthService.ts` — Google OAuth hooks, session management
- `src/profile/ProfileService.ts` — Local profile CRUD, stats tracking
- `src/lib/routes.ts` — Hash-based router
- `src/lib/AppShell.ts` — Top-level app container with navigation
- `src/ui/HubPage.ts` — Main hub/dashboard
- `src/ui/OnboardingPage.ts` — First-time setup flow
- `src/ui/ProfilePage.ts` — User profile screen
- `src/ui/HistoryPage.ts` — Recent games screen
- `src/ui/SettingsPage.ts` — App settings screen
- 103 existing tests preserved, all passing
