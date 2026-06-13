# OpenScrabble v0.1.1 — UI Polish Release

**Build:** `2026-06-13` | **Status:** ✅ Complete

## Changes from v0.1

### UI Fixes
- **Board centering** — cell size uses `min(6.25vw, 44px)` ensuring the 15×15 board always fits within viewport width on any phone
- **No horizontal cutoff** — body `overflow-x: hidden`, board has no padding offsets, cells scale to fit
- **Center star** — cell (7,7) shows ★ when empty, distinguished from other DW premium squares
- **Tile point values** — every rack tile and board tile shows its point value as a small badge top-right
- **Live move preview** — a bar between the board and actions shows:
  - Words formed and projected score (valid)
  - Error message explaining why the move is invalid
  - Green outer glow on pending tiles when valid
  - Red outer glow on pending tiles when invalid
- **Post-submission feedback** — message area shows words scored and points earned after submit
- **Bag count** displayed next to scores
- **Turn number indicator** in header
- **Home navigation** button from game screen
- **Toggle-able swap button** — disabled when bag is empty

### Home Page
- **Full home screen** as first landing page with:
  - OpenScrabble title and logo
  - "New Local Game" button → starts game
  - "How to Play" accordion with rules summary
  - "Settings" accordion with player name editing
- URL parameter support: `?game=1` to go directly to a game

### Technical
- Added `Game.previewMove()` for live validation without state mutation
- Added `HomePage` class, routing in `main.ts`
- All existing 61 tests pass unchanged
- v0.1 game logic completely intact

### Build Output
`dist/`: 8.5KB CSS (gz: 2.4KB) + 28.6KB JS (gz: 8.1KB)

## Known Limitations
- Blank tiles still shown as `?` with no letter assignment UI
- No dictionary validation — any letter combination accepted
- Preview calculates score but can't detect invalid dictionary words
- No undo for submitted moves
- Desktop layout is still functional but not side-by-side

## Recommended Next Step (v0.2)
Dictionary validation — embed a word list for real word checking, the most impactful gameplay improvement.
