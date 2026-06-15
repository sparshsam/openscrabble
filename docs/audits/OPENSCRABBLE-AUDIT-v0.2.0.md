# OpenScrabble v0.2.0 — Full Product & Codebase Audit

**Audit Date:** 2026-06-14
**Commit:** cc41f56
**Live URL:** https://openscrabble.vercel.app
**Repo:** https://github.com/sparshsam/openscrabble

---

# 1. Executive Summary

OpenScrabble v0.2.0 is a functional but rough local two-player Scrabble clone built with vanilla TypeScript + Vite. The core game loop works: place tiles, submit, score, switch turns, refill rack. The game persists to localStorage, the dictionary validates words against a ~100K-word SOWPODS-derived set, and premium squares score correctly on first use.

However, the app is held together by **thin margins**. Several critical gameplay bugs exist (first-move validation, blank tiles), the UI is visually unpolished ("hand-drawn" feel), tests validate isolated components but not realistic scenarios, and the architecture has no monorepo foundation for the stated multi-platform ambitions.

**Overall maturity score: 3.5 / 10**

This is a working prototype, not yet a polished product. It is **not ready** for real users beyond demonstrating the concept.

---

# 2. Overall Maturity Score: 3.5 / 10

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Gameplay Rules | 4 | Core rules work but critical bugs exist |
| Dictionary | 6 | Works for common words, ~100K entries, 2-letter validated |
| UX / Input | 4 | Tap-first is correct choice but rough execution |
| Visual Design | 2 | Functional but aesthetically weak |
| Product Architecture | 3 | Home + Game only, no multiplayer, no profiles |
| Codebase | 5 | Clean separation but no monorepo, no CI |
| Testing | 4 | 87 tests pass but miss real gameplay scenarios |
| Repository | 3 | Minimal README, no issue templates, stale docs |

---

# 3. Critical Findings

## C1. First-Move Connectivity Bug (Gameplay)

**Severity:** Critical — breaks first-turn single-tile placements

**Root Cause:** In `Game.submitWord()` (line 158), `this.board.hasTiles()` is called after pending tiles have already been placed on the board grid via `placeTile()`. This means `hasExistingTiles` is always `true` on the first move (because the pending tiles are on the board), triggering the connectivity check, which fails for single-tile placements.

```typescript
// Game.ts line 158
const validationError = ScoreCalculator.validatePlacement(
  pending,
  this.board.hasTiles(),  // ← ALWAYS true after placeTile()
  this.board.isCenterOccupied(),
  (r, c) => this.board.isInBounds(r, c),
  (r, c) => this.board.isOccupied(r, c)
);
```

**Impact:** The first word must have ≥2 adjacent tiles or the connectivity check fails. Single-tile first plays are impossible even if they cover center. The error message ("Word must connect to existing tiles on the board") is misleading since there ARE no existing tiles.

**Fix:** Pass `false` for `hasExistingTiles` when no committed (non-pending) tiles exist. Or add a `getCommittedTileCount()` method to Board.

**Test Gap:** The unit test `ScoreCalculator.test.ts` passes `false` for `hasExistingTiles`, which works — but the actual game code always passes `true`. No integration test catches this.

---

## C2. Blank Tile Does Not Prompt for Letter (Gameplay)

**Severity:** Critical — blanks are unusable

**Behavior:** Blanks appear as "?" in the rack. When placed on the board, they render as an empty letter with a "0" points badge. No prompt for letter assignment appears.

**Root Cause:** The `GameUI.ts` has no blank-letter assignment flow. There is no dialog, modal, or input mechanism for choosing the letter a blank represents. The `playedAs` field on the Tile interface is never set, so `tile.playedAs ?? tile.letter` produces an empty string.

**Impact:** Blanks cannot be played as intended. Words formed with blanks get incorrect dictionary validation (the blank contributes empty string, potentially making the word shorter than expected) and incorrect scoring.

**Fix Required:** A letter-picker dialog (or long-press / double-tap mechanism) must be shown when a blank tile is placed or selected.

---

## C3. No Cross-Word Dictionary Validation When Extending Existing Words (Gameplay)

**Severity:** High — potential for invalid cross-words to be accepted

**Current Behavior:** The `findWords()` method in `Board.ts` finds cross-words formed by new tiles, and `WordValidator` checks all found words. This seems correct for a single-play scenario.

**Risk:** If a player extends an existing word (e.g., appends to "TRADE" making "TRADED"), the cross-words at each newly placed tile ARE validated. However, the PREVIEW shows only the main word string, not cross-words. The user cannot see what cross-words are being formed unless they count tiles.

**Mitigation:** The validation itself works — all words (main + cross) are checked. But the UI omits cross-word display in the preview bar.

---

# 4. High-Priority Findings

## H1. Dictionary Source Quality (Dictionary)

The word list (`src/data/wordList.ts`) is 937.6 KB with 100,664 words, derived from SOWPODS. This is better than nothing but has issues:

- **No attribution or version**: The source is undocumented. "SOWPODS-derived" is stated in README but no specific version or date is recorded.
- **Includes proper nouns**: "aaron", "abraham", "zeus" — these are not valid in official Scrabble (NASPA/WESPA).
- **Missing official words**: Without a reference list, there's no way to verify coverage. A spot-check of common valid words should pass, but edge coverage is unknown.
- **2-letter validation**: The `OFFICIAL_TWO_LETTER` set is correctly maintained (107 TWL words including EW, OK, KO, QI, XU, ZA).

**EE verdict**: `EE` is **NOT valid** under TWL/NASPA or Collins/SOWPODS. The validator correctly rejects it.

**EW fix verified**: v0.2.0 correctly accepts `EW` (the regression from earlier versions is fixed).

## H2. Bundle Size (Performance)

The JS bundle is **986.69 KB** (278.57 KB gzipped), almost entirely from the word list. Vite warns about chunks exceeding 500 KB after minification.

**Impact:** Cold load on mobile = slow. The full dictionary is loaded synchronously on every page load regardless of whether the user starts a game.

## H3. No Move History / Undo (Gameplay)

There is no undo for individual tile placements within a pending move. The "Clear" button removes ALL pending tiles, not specific ones.

Removing a single pending tile requires:
1. Selecting the pending tile on the board (tap)
2. Tapping it again to return to rack

This works functionally but is undiscoverable.

## H4. Game-Over State Persists Incorrectly (Persistence)

When a game ends (gameover phase), `GamePersistence.save()` is still called. If the user returns to home and clicks "Continue Game," they continue from the gameover state with no way to play. The gameover state should either be cleared or present a clear "Game Over — Start New" UI.

## H5. No Home Button During Game

The header has a "⌂" home button with a confirm dialog ("Return to home? The current game will be saved."), which is good. But the home button is not visible during gameover state unless the player scrolls down past the game-over banner.

---

# 5. Medium Findings

## M1. Word Preview Hides Cross-Word Details (UI)

The preview bar shows only the main word string and total score. Cross-words are never shown by name, only included in the total score. This makes it impossible for players to verify that cross-words are real words before submitting.

**Example from live test:** Placing a blank next to "TRADE" showed `"TRADE" → 6 pts` with no indication of any cross-word. If a cross-word was formed, the player wouldn't know.

## M2. Score Display Shows Bag Count, Not Letter Counts

"Bag: 86" tells the player the count but not which letters remain. Standard Scrabble apps show remaining tile letter distribution or at least vowel/consonant breakdown.

## M3. Rack Tiles Not Sorted (UX)

Tiles in the rack appear in the order they were drawn, not sorted by letter or value. Most Scrabble games sort the rack alphabetically by default.

## M4. No Game Timer

There is no turn timer or move timer. This is acceptable for casual local play but prevents competitive use.

## M5. Footer Shows Wrong Version

The HomePage hardcodes `v0.1.4` in the footer, but the package.json says `0.2.0`. This is a trivial but noticeable inconsistency.

## M6. No Animation on Tile Placement

Tiles appear instantly on the board. No transition animation (fade, slide, scale) for tile placement, removal, or score updates. This contributes to the "rough" feel.

## M7. Desktop Hover States Are Minimal

At >768px, only tile background changes on hover. No tooltip on premium squares, no score preview on hover, no tile-value tooltip.

## M8. Swap Mode Is Functional But Unpolished

Swap mode tiles get a green highlight when selected (via `selected` class), but there's no "select all" or "clear selection" button. The swap count shows `Swap (0)` which updates reactively.

## M9. No Mobile Keyboard Handling

When the player name input is focused on mobile, the virtual keyboard pushes the layout. No scroll-into-view or keyboard-avoiding behavior is implemented.

## M10. Game Message Auto-Dismisses Too Fast

The success/error message at the bottom auto-clears after 3.5 seconds. Validation errors that explain why a word was rejected disappear before the player can read them, especially if the word is complex.

## M11. Accessibility Gaps

- No ARIA labels on board cells
- No focus management for keyboard players
- Color-only premium square differentiation (no pattern/icon)
- `user-select: none` on body prevents text selection even on home page
- Small touch targets on premium cells (text is very small: `clamp(0.35rem, 0.85vw, 0.55rem)`)

---

# 6. Low Findings

## L1. CSS `var(--safe-gap)` Uses `max()` with Fallback

```css
--safe-gap: max(env(safe-area-inset-left, 0px), 8px);
```
The `max()` function with `env()` fallback is correct. Good practice.

## L2. Board Re-renders Entirely on Every Action

The `render()` method calls `this.root.innerHTML = ''` and rebuilds the entire DOM. This is inefficient but acceptable for ~225 cells. A virtual-DOM or targeted update would be better for performance.

## L3. No Build-Time Dictionary Compression

The word list is a static TypeScript array. No build step compresses it, code-splits it, or lazy-loads it. Dynamic imports could reduce initial bundle size.

## L4. No CSP Headers

The Vercel deployment has no Content-Security-Policy headers. The app doesn't use inline scripts in a dangerous way (it's vanilla JS), but this should be addressed before production.

## L5. No Service Worker

No offline support. The app requires network connectivity to load (served from Vercel CDN), though it works offline once loaded since it's a static SPA.

---

# 7. Strengths

## S1. Clean Game Engine Separation

The game core (`Game.ts`, `Board.ts`, `Bag.ts`, `ScoreCalculator.ts`) is fully isolated from the DOM. It could be dropped into React, React Native, or a CLI tool without changes. This is **the best architectural decision in the project**.

## S2. All 87 Tests Pass

Test suite runs cleanly with zero failures. TypeScript strict mode (`noUncheckedIndexedAccess`) catches real bugs. The test files are well-structured with clear `describe`/`it` blocks.

## S3. Mobile-First CSS

The CSS uses `clamp()` for responsive sizing, `env(safe-area-inset-*)` for notched devices, and `dvh` units. The tap-first input model is the correct choice for a mobile game.

## S4. localStorage Persistence Works

Game state survives page refresh. The "Continue Game" flow on the home page works correctly. The serialization/deserialization round-trip is tested.

## S5. 2-Letter Word Validation is Correct

The `OFFICIAL_TWO_LETTER` set matches the official 107 TWL/NASPA words. Regression test confirms `EW` is now valid. This was a known issue in earlier versions that was fixed correctly.

## S6. Premium Square Consumption

Premium squares are correctly consumed on first use. The `premiumUsed` boolean matrix prevents re-use, matching official rules.

## S7. Bingo Bonus

The +50 point bonus for using all 7 tiles fires correctly. The preview shows 🎉 Bingo! indicator.

## S8. Straight-Line and Contiguity Validation

The game correctly rejects non-straight placements and non-contiguous tiles. Gaps filled by existing board tiles are correctly allowed.

## S9. Game-Over Detection

Both end conditions work: bag empty + rack empty (endgame scoring with opponent's remaining tiles), and 6 consecutive passes.

## S10. No Dependencies

The app has zero runtime dependencies — just TypeScript, Vite, and Vitest as dev dependencies. This keeps the bundle lean (excluding dictionary data), avoids supply-chain risk, and means no breaking dependency updates.

---

# 8. Recommended v0.2.1 Fixes

These are the highest-ROI fixes that address critical bugs and the most painful UX issues without architectural changes:

| Priority | Fix | Area | Effort |
|----------|-----|------|--------|
| P0 | Fix first-move connectivity bug (pass correct `hasExistingTiles`) | Gameplay | 1 line |
| P0 | Add blank tile letter-picker dialog | Gameplay | 1-2 days |
| P1 | Show cross-words in preview bar | UX | 0.5 day |
| P1 | Sort rack tiles alphabetically | UX | 0.25 day |
| P1 | Fix footer version to v0.2.0 | Polish | 1 line |
| P2 | Increase message auto-dismiss to 5-6 seconds | UX | 1 line |
| P2 | Add tile placement animation (CSS transition) | Visual | 0.5 day |
| P2 | Clear saved game when game ends | Persistence | 0.25 day |
| P2 | Add ARIA labels to board cells | A11y | 0.5 day |
| P3 | Show word definitions on long-press (API lookup) | Feature | 2-3 days |
| P3 | Dynamic dictionary import for smaller initial bundle | Perf | 1 day |

---

# 9. Recommended v0.3 Roadmap (Near-Term Features)

| Feature | Rationale | Effort |
|---------|-----------|--------|
| Word Definitions (long-press) | Core feature requested, educational value | 3 days |
| Active Games list (home page) | Manage multiple games | 2 days |
| Game Summary screen (post-game) | Show final scores, words played | 2 days |
| Drag re-enabled (optional toggle) | Power users want drag | 1 day |
| Tile sorting toggle (alpha/by value) | UX polish | 0.5 day |
| Hold-to-place for rapid word building | Speed up play | 1 day |
| Pass/swap confirmation dialog | Prevent accidental passes | 0.5 day |
| Timestamp on saved games | Show when last played | 0.5 day |

---

# 10. Recommended v0.4 Architecture Work

Before multiplayer or mobile apps can be built, the architecture must evolve:

## Phase 1: Monorepo Foundation (1 week)

```
openscrabble/
├── apps/
│   └── web/              ← current app moves here
├── packages/
│   ├── game-engine/      ← Game, Board, Bag, ScoreCalculator
│   ├── dictionary/       ← WordValidator, wordList
│   └── shared-types/     ← Tile, Position, GameState etc.
├── package.json          ← workspace root
└── tsconfig.json         ← base config
```

## Phase 2: Package Isolation (1 week)

- Extract `game-engine` package with no DOM dependencies
- Extract `dictionary` package with lazy-loading support
- Extract `shared-types` as a standalone package
- Set up Turborepo for build orchestration

## Phase 3: API Layer (2 weeks)

- Supabase or similar for auth and multiplayer
- WebSocket-based game relay for real-time play
- REST endpoints for game history, leaderboards, friend management
- Social auth (Google, Apple) via Auth0 or Supabase

## Phase 4: Mobile (4-6 weeks)

- React Native or Expo app
- Shared game engine via the extracted packages
- Native drag-and-drop via gesture handlers
- Push notifications for turn alerts (multiplayer)
- Share sheets for inviting friends

## Migration Effort

The current architecture is clean enough that extraction is straightforward — the game engine is already isolated. Estimated total migration: **2-3 weeks** for a monorepo with all packages extracted, assuming one full-time developer.

---

# 11. v1 Page Map

**Pages that exist (2):**

| Page | Status | Notes |
|------|--------|-------|
| Home | ✅ Basic | Has New Game, Continue, player name settings, How to Play |
| Game Board | ✅ Functional | Core gameplay, needs polish |

**Pages missing for v1:**

| Page | Priority | Notes |
|------|----------|-------|
| Game Summary | High | Post-game screen with stats, replay option |
| Active Games | High | List of saved/in-progress games with timestamps |
| Settings | Medium | Sound, animation, tile theme, drag toggle |
| Dictionary Lookup | Medium | Search word meanings, check validity |
| Word Details | Medium | Part of speech, etymology, definitions |
| How to Play | Low | Already exists as expandable on home page |
| Profile | Low | Player names, stats, win/loss |
| Friends | Low | For future multiplayer |
| Multiplayer Lobby | Low | Future multiplayer |
| Leaderboards | Low | Future multiplayer |
| Notifications | Low | Future multiplayer |
| Login | Low | Future multiplayer |

---

# 12. v1 Feature Map

| Feature | Status | Priority |
|---------|--------|----------|
| Board rendering | ✅ | — |
| Tile placement (tap) | ✅ | — |
| Tile placement (drag) | ❌ Removed | Low (optional) |
| Pending tile management | ✅ | — |
| Word submission | ✅ | — |
| Score calculation | ✅ | — |
| Premium squares | ✅ | — |
| Premium consumption | ✅ | — |
| Bingo bonus | ✅ | — |
| Dictionary validation | ✅ | — |
| 2-letter word validation | ✅ Fixed v0.2.0 | — |
| Blank tile letter prompt | ❌ Missing | **Critical** |
| Turn switching | ✅ | — |
| Rack refill | ✅ | — |
| Pass turn | ✅ | — |
| Swap tiles | ✅ | — |
| Endgame scoring | ✅ | — |
| Game over (6 passes) | ✅ | — |
| Persistence (localStorage) | ✅ | — |
| Cross-word validation | ✅ | — |
| Preview / live feedback | ✅ | — |
| Word definitions | ❌ Missing | High |
| Move history / undo | ❌ Missing | Medium |
| Animated tile placement | ❌ Missing | Medium |
| Sound effects | ❌ Missing | Low |
| Tutorial / onboarding | ❌ Missing | Medium |
| Multiplayer (local pass-and-play) | ✅ | — |
| Multiplayer (online) | ❌ Missing | Future |
| Dark mode | ❌ Missing | Low |

---

# 13. Final Recommendation

## What to Fix Immediately (v0.2.1)

1. **First-move connectivity bug** — 1-line fix in `Game.ts:158`, change `this.board.hasTiles()` to check only committed (non-pending) tiles
2. **Blank tile letter prompt** — Add a dialog/picker when blank is placed
3. **Cross-word preview** — Show cross-word names in the preview bar
4. **Sort rack alphabetically** — Improve playability immediately
5. **Footer version** — Fix to v0.2.0

These five changes would eliminate every critical bug and significantly improve UX at minimal engineering cost.

## What to Delay

- **Multiplayer**: Do not attempt until the monorepo migration is done.
- **Mobile app**: Do not start until the game-engine is extracted as a standalone package.
- **Drag-and-drop**: Consider re-enabling as an optional toggle in v0.3, but only after tap-to-place is rock-solid.
- **Animations**: CSS transitions only for now. No custom animation framework.

## What to Avoid Building

- **AI opponent**: The prompt says "no AI" — respect this. An AI Scrabble player is an entire project by itself.
- **Blockchain / NFTs**: Not relevant to a Scrabble clone.
- **Subscription model**: This is a casual game. Monetize with one-time purchases or ads if needed, not subscriptions.
- **Real-time chat**: Text/emoji quick-reply system is enough for casual play.
- **Image/board sharing**: Not core gameplay. Add only if user demand materializes.

---

# 14. Key Metrics

| Metric | Value |
|--------|-------|
| Total tests | 87 |
| Tests passing | 87 (100%) |
| Bundle size (JS) | 987 KB (279 KB gzipped) |
| Bundle size (CSS) | 10.25 KB (2.79 KB gzipped) |
| Dictionary size | 100,664 words |
| Runtime dependencies | 0 |
| TypeScript strict | Yes |
| Lines of code (src) | ~1,800 (excluding dictionary) |
| Lines of code (dictionary) | ~100,000 |
| Build time | ~900 ms |

---

# 15. Methodology

This audit was conducted by:

1. **Cloning and building the repo** from cc41f56
2. **Running all tests** (87/87 pass)
3. **Running TypeScript type checker** (strict mode, no errors)
4. **Building the production bundle** (tsc + vite build)
5. **Loading the live app** at https://openscrabble.vercel.app via Playwright browser automation
6. **Playing a real game**: placing tiles, submitting words, validating scoring, testing blank tiles, testing persistence via page refresh
7. **Reading every source file** in `src/` and `tests/`
8. **Reading `ARCHITECTURE.md` and `README.md`**
9. **Checking git log** for commit history and versioning
10. **Checking package.json** for dependency analysis

---

*End of Audit*
