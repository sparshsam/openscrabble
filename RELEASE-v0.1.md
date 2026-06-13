# OpenScrabble v0.1 — Release Report

**Build:** `2026-06-13` | **Status:** ✅ Complete

## Completed Features

- [x] **15×15 Scrabble board** with correct premium square layout (TW, DW, TL, DL)
- [x] **Tile rack** with 7 slots per player, auto-fill from bag
- [x] **Drag-and-drop** tile placement (HTML5 drag + touch-drag)
- [x] **Tap-to-place** interaction (select tile → tap cell)
- [x] **Word submission** with rule validation
- [x] **Turn switching** between two players
- [x] **Score calculation** — letter premiums, word premiums, stacking word multipliers
- [x] **Bingo bonus** (+50 for using all 7 tiles)
- [x] **Tile bag** — proper shuffle, draw, return mechanics
- [x] **Official tile distribution** — 100 tiles, 2 blanks, correct point values
- [x] **First word rule** — must cover center (7,7)
- [x] **Premium square single-use** — multipliers only count first time
- [x] **Automatic tile drawing** after moves (fill rack back to 7)
- [x] **Pass turn**
- [x] **Swap tiles** (exchange selected tiles from bag)
- [x] **Game over detection** — bag empty + rack empty, or 6 consecutive passes
- [x] **Endgame scoring** — opponent's unplayed tile values deducted
- [x] **Mobile-first responsive UI**
- [x] **61 unit tests** covering all core logic (5 test files, all passing)
- [x] **Production build** — 22KB JS, 5.6KB CSS (gz: 6.5KB + 1.8KB)

## Known Limitations

| Limitation | Impact | Planned Fix |
|------------|--------|-------------|
| **No dictionary validation** — any letter combination is accepted as a word | Players must self-police valid words | v0.2 — embedded word list |
| **No blank tile assignment UI** — blank tiles appear as `?` and can't be assigned a letter | Blanks are visual placeholders only | v0.2 — letter picker popup |
| **No undo** — submitted moves can't be taken back | Mistakes are permanent | v0.2 — undo last move |
| **No tile exchange confirmation on bag empty** — swap button is hidden when bag is empty but UX could be clearer | Minor friction | v0.2 — better messaging |
| **Desktop layout is functional but basic** — no side-by-side board/rack | Usable but not ideal on wide screens | v0.2 — responsive layout for desktop |
| **No sound effects or animations** | Silent gameplay | v0.2 — optional sound toggle |

## v0.2 Roadmap (Recommended)

### High Priority
1. **Dictionary validation** — embed SCOWL or similar word list for real word checking
2. **Blank tile assignment** — popup to choose the letter a blank represents
3. **Undo last move** — rollback the most recent move

### Medium Priority
4. **Move history panel** — show past words and scores per turn
5. **Desktop adaptive layout** — board and rack side-by-side on larger screens
6. **Tile bag count display** — show remaining tiles in bag

### Nice to Have
7. **Sound effects** — tile placement, word submission, game over
8. **Animations** — subtle tile slide/scoring effects
9. **Game timer** — optional per-turn timer
10. **Saved game state** — localStorage persistence

### Out of Scope (v0.x)
- Multiplayer / online — separate milestone
- AI opponent — separate milestone
- Account system — separate milestone

## Verification

```
npm test         → 61/61 passed ✓
npm run build    → 22KB JS, 5.6KB CSS ✓
npx tsc --noEmit → 0 errors ✓
```
