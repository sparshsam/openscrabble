# Changelog

## v0.4.8 — Game Results + End Screen (2026-06-29)

### Added
- **Post-game result screen**: Displayed when game reaches `gameover` phase (normal end or resignation). Includes:
  - **Winner card** — large amber gradient card with 👑 crown, winner name, score, "Winner" subtitle. Shows 🤝 and "Tie Game" for ties.
  - **End reason badge** — shows "Resigned — X resigned" or "Game completed"
  - **Final scores section** — both players with scores in large accent-colored numbers
  - **Game stats** — total turns, best word
  - **🔄 Rematch button** — starts new game with same player names, finalizes the current game record
  - **🏠 Home button** — returns to hub, finalizes the game record
  - **📋 Full History** — shows move history if moves were made
- **`endReason` field** on `GameRecord` (`'normal' | 'resign'`) — tracks how the game ended
- **`endReason` field** on `Game` class — set to `'normal'` on bag-empty or 6-pass game-over, `'resign'` on resignation
- **`finalizeGame()`** in LocalGameStore — saves end result when player leaves the result screen
- CSS for all result screen components (winner card, scores, stats, actions)

### Changed
- Resign, Rematch, and Home buttons all finalize the game record before leaving (via `resignGame()` or `finalizeGame()`)
- `GameUI.confirmResign()` sets `this.game.endReason = 'resign'` before saving
- Old `.game-over-banner` and `.game-summary-stats` classes kept for backward compatibility (no longer actively rendered)

## v0.4.7 — Profile Stats Winner Accuracy Fix (2026-06-29)

### Fixed
- **`computeStats()` win logic**: `normalizedName` helper was ignoring its `name` argument and always returning `currentUsername` — every completed game with a winner counted as a win.
- **`normalizedName` now correctly uses the `name` argument**: `(name) => name.toLowerCase().trim()`
- **`computeStats()` accepts `currentUsername`**: Only counts as win when the winner string matches the current user (case-insensitive).
- **Loss tracking added**: `gamesLost` and `winRate` fields in `PlayerStats` type
- **Active/abandoned games excluded**: Only `status: 'completed'` games count toward stats
- **Profile labels updated**: Completed / Wins / Losses / Win Rate / Best Score / Average Score

### Added
- 7 stats regression tests: normal win, user resigns (loss), opponent resigns (win), active excluded, abandoned excluded, case-insensitive matching, mixed results

## v0.4.6 — Collins Dictionary Enforcement + Resign Flow (2026-06-29)

### Fixed
- **Dictionary enforcement**: Added `REJECTED_WORDS` set in `WordValidator.ts`. Words in the rejection list are blocked even if present in the bundled SOWPODS word list. `KIL` is rejected as a fringe inclusion not recognized in standard Collins UK Scrabble play. LOONIE remains accepted.
- **No unsafe fallback**: The `REJECTED_WORDS` check runs after 2-letter validation and before the main dictionary lookup — no prefix/stem/partial-word acceptance exists.

### Added
- **Resign button** in the game UI actions bar (during placing phase)
- **Resign confirmation modal** — uses in-app modal, not `browser confirm()`
- `resignGame()` in `LocalGameStore.ts` — sets status to `completed`, winner to opponent (for 2-player), records scores/turns
- `btn-danger-outline` CSS class — red outline button for resign action
- 3 dictionary regression tests: KIL rejected, LOONIE still accepted after Collins enforcement
- v0.4.6 section in `docs/DICTIONARY.md`

### Changed
- GameUI imports `resignGame` and `navigate` for resign flow
- Resigned games show in History as `completed` with opponent as winner

## v0.4.5 — Dictionary Integrity + Per-Game Save Fix (2026-06-29)

Critical fixes: LOONIE now accepted as a valid word. Resuming a saved game now restores exact board/rack state instead of resetting.

### Fixed
- **Dictionary**: Added LOONIE, TOONIE, POUTINE to `MISSING_WORDS` patch array. The word list had "looney" but not "loonie" (valid SOWPODS/Collins word).
- **Per-game save persistence**: `GameUI.save()` was saving to the legacy key (`openscrabble_save`) instead of the per-game key (`openscrabble_save_<gameId>`). Every autosave after the first move went to the wrong key. Resume loaded the per-game key which had stale initial state → board/rack were reset. Fixed by storing `gameId` in GameUI and passing it to `GamePersistence.save()`.
- **All three showGame paths** (load by gameId, legacy fallback, metadata creation) now pass `gameId` to GameUI constructor.

### Added
- `MISSING_WORDS` array in `wordList.ts` — additive patch for missing SOWPODS/Collins words
- 4 dictionary regression tests: LOONIE, TOONIE, POUTINE acceptance + invalid word rejection
- 4 per-game persistence tests: save/load isolation, legacy key fallback, exists/clear API
- v0.4.5 patch section in `docs/DICTIONARY.md`

### Changed
- Console logs cleaned: removed high-frequency GameUI render logs, kept low-volume routing/showGame traces

### Tests
- 9 test files, 131 total tests (+8 new)

## v0.4.4 — Hard Blocker: Game Screen Not Mounting (2026-06-29)

Critical bugfix: Game screen never mounted because `createActiveGameRecord()` only created metadata records — no actual game state was saved. When `showGame()` tried to load by gameId, it found no save data, marked the record as abandoned, and bounced to hub.

### Fixed
- **`showGame` now creates game state from metadata**: When a gameId has an active metadata record but no save state, the game is created from the record's player names and saved immediately. This fixes both New Game and game resume.
- **Console tracing**: Added `console.log`/`console.warn` at every critical junction — route parsing, navigate, hashchange, renderScreen, showGame, NewGameSetupPage.startGame, GameUI constructor/render.
- **Visible error panel**: If GameUI constructor/render throws, a `game-error-panel` is shown with the error message and a "Back to Hub" button — no more silent failure.
- **Stale record preservation**: Fixed the stale cleanup to not accidentally remove valid new-game records (metadata without save is now treated as a valid new game, not stale).

### Added
- `game-error-panel` CSS — visible error UI when GameUI fails to mount
- `showGameError()` function in GameUI.ts — renders error panel inside the game root
- `GameUI` constructor try/catch — catches render failures and shows error panel
- 6 LocalGameStore tests — metadata creation, save state creation, stale detection, multiple games

### Tests
- 9 test files, 123 tests total (+6 game-store tests)
- Tests prove: metadata record is created without save, save is created after GamePersistence.save, stale metadata-only records are detected as unresumable

## v0.4.3 — Blocking Navigation + Game Launch Fix (2026-06-29)

Critical bugfix: New Game and game resume were broken due to stale records from v0.4.1/v0.4.2 and inline rendering bypassing the router.

### Fixed
- **New Game**: Now routes through `#new-game` proper hash route instead of inline DOM replacement
- **Game resume**: Running games use `onResumeGame` callback through main.ts, ensuring clean route transition
- **Stale records**: Added `cleanStaleRecords()` — removes "Player 1 vs Player 2" records with no actual save data on startup
- **Invalid gameId**: Missing/invalid gameId now cleanly marks as abandoned and redirects to hub (no silent flash)
- **Legacy save handling**: Per-game saves (`openscrabble_save_<gameId>`) read first; legacy key used as backup only when record matches

### Added
- `#new-game` route in `routes.ts` — NewGameSetupPage renders through `renderScreen` like all other screens
- `onResumeGame` callback in `HubPage` — separates new game and resume concerns
- Route parsing tests: 14 tests covering all screens, gameId hash round-trip, UUID handling, unknown hash default
- **Data section in Settings**: Clear Running Games, Clear All Local Data (with safe modals)
- `cleanStaleRecords()` startup cleanup
- `settings-action-btn-danger` CSS style for destructive buttons

### Changed
- Settings: Added "Clear Running Games" and "Clear All Local Data" repair options
- Settings: "Clear Game History" now preserves active games
- `buildHash` is now exported from routes.ts for testing
- HubPage constructor now takes `onResumeGame(gameId)` as third parameter

### Tests
- 14 new route parsing tests (8 test files, 117 total tests)

## v0.4.2 — Multi-Game Persistence + UX Correction Pass (2026-06-29)

Core game/session model corrected to support multiple active local games. New game flow moved to a dedicated setup page. Onboarding simplified.

### Changed
- **Onboarding**: Removed Player 2/3/4 setup — only username + auth choice (Guest/Google)
- **New Game flow**: New dedicated setup page (`NewGameSetupPage`) with P1-P4 editable player names, P1 defaults to current username
- **Multi-game persistence**: Each game gets its own save key (`openscrabble_save_<gameId>`). Starting a new game never overwrites existing active games
- **Hub**: Removed single "Continue Game" card. Shows Running Games list (all active games), New Game button, Recent Completed, quick links
- **History**: Uses actual player names from game records. Clicking active games resumes by gameId
- **Settings**: Removed P1/P2 name editor. Removed theme select dropdown — replaced with clean segmented toggle (System/Light/Dark)
- **GameUI**: Added optional `onAutoSave` callback, called after every save with scores and turn number
- **GamePersistence**: Supports per-gameId save/load (`openscrabble_save_<gameId>`). Added `clearAll()` method

### Added
- `NewGameSetupPage.ts` — New game player setup with 2-4 players
- Segmented theme toggle in Appearance settings
- Running Games list on hub with resume-by-tap

### Preserved
- Legacy `openscrabble_save` key still supported for backward compatibility
- Existing v0.4.1 records preserved
- All gameplay, dark/light mode, mobile-first responsive
- 103 existing tests passing

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
