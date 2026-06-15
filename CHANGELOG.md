# Changelog

All notable changes to OpenScrabble are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] — 2026-06-14

### Fixed
- Core gameplay bugfixes from v0.2.0

## [0.2.0] — 2026-06-13

### Added
- Dictionary validation with SOWPODS-derived ~100K word list
- 2-letter word validation against official TWL/NASPA word list (107 words)
- Cross-word validation — all words formed by a move are validated independently
- Persistence layer with localStorage game state saving
- WordValidator module for dictionary lookups

### Changed
- README updated with dictionary section and limitations

## [0.1.9] — 2026-06-13

### Changed
- Tap-first input model reset — select tile from rack, then tap board cell

## [0.1.8] — 2026-06-13

### Fixed
- Real-phone touch drag fix for mobile tile placement

## [0.1.7] — 2026-06-13

### Fixed
- Mobile layout fixes and drag interaction hotfix

## [0.1.1] — 2026-06-13

### Added
- Home page with navigation, "How to Play" accordion, settings
- Live move preview bar with projected score and validation
- Live scoring feedback with green/red glow on pending tiles
- Post-submission feedback messages
- Bag count display next to scores
- Turn number indicator in header
- Home navigation button from game screen
- Toggle-able swap button (disabled when bag is empty)
- Center star ★ on cell (7,7) when empty
- Tile point value badges on all tiles

### Fixed
- Board centering with responsive cell sizing (`min(6.25vw, 44px)`)
- No horizontal cutoff on mobile (`overflow-x: hidden`)
- URL parameter support (`?game=1`)

### Changed
- Game engine: added `Game.previewMove()` for live validation without state mutation
- Routing: added `HomePage` class in `main.ts`

## [0.1.0] — 2026-06-13

### Added
- 15×15 Scrabble board with correct premium square layout (TW, DW, TL, DL)
- Tile rack with 7 slots per player, auto-fill from bag
- Drag-and-drop tile placement (HTML5 drag + touch-drag)
- Tap-to-place interaction (select tile → tap cell)
- Word submission with rule validation
- Turn switching between two players
- Score calculation — letter premiums, word premiums, stacking word multipliers
- Bingo bonus (+50 for using all 7 tiles)
- Tile bag — shuffle, draw, return mechanics
- Official tile distribution — 100 tiles, 2 blanks, correct point values
- First word rule — must cover center (7,7)
- Premium square single-use — multipliers only count first time
- Automatic tile drawing after moves (fill rack back to 7)
- Pass turn and Swap tiles actions
- Game over detection — bag empty + rack empty, or 6 consecutive passes
- Endgame scoring — opponent's unplayed tile values deducted
- Mobile-first responsive UI
- 61 unit tests across 5 test files (all passing)
- Production build — 22KB JS, 5.6KB CSS (gz: 6.5KB + 1.8KB)

[0.2.1]: https://github.com/sparshsam/openscrabble/releases/tag/v0.2.1
[0.2.0]: https://github.com/sparshsam/openscrabble/releases/tag/v0.2.0
[0.1.9]: https://github.com/sparshsam/openscrabble/releases/tag/v0.1.9
[0.1.8]: https://github.com/sparshsam/openscrabble/releases/tag/v0.1.8
[0.1.7]: https://github.com/sparshsam/openscrabble/releases/tag/v0.1.7
[0.1.1]: https://github.com/sparshsam/openscrabble/releases/tag/v0.1.1
[0.1.0]: https://github.com/sparshsam/openscrabble/releases/tag/v0.1.0
