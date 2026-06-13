# OpenScrabble Architecture

## Design Philosophy

OpenScrabble v0.1 is built around a clean **model-view-controller separation** with the game logic entirely decoupled from the UI. This means:
- The game engine can be tested without any DOM
- The UI can be swapped (React, Svelte, or CLI) without touching game logic
- State is explicit and functional where possible

## Layers

```
┌─────────────────────────────────────┐
│           UI Layer (GameUI)         │
│  DOM rendering / event handling     │
│  Drag-and-drop / tap-to-place       │
└─────────────┬───────────────────────┘
              │ calls
┌─────────────▼───────────────────────┐
│          Game (Orchestrator)        │
│  Turn management / pending tiles    │
│  Word submission / score tracking   │
│  Game-over detection                │
└───┬──────────┬──────────┬───────────┘
    │          │          │
┌───▼──┐ ┌────▼────┐ ┌───▼──────────┐
│Board │ │  Bag    │ │ScoreCalculator│
│15×15 │ │shuffle  │ │scoring /     │
│tiles │ │draw/    │ │validation    │
│prem. │ │return   │ │rules         │
└──────┘ └─────────┘ └──────────────┘
```

## Core Modules

### `types.ts`
All shared TypeScript interfaces and types. The single source of truth for data shapes.

### `game/Game.ts`
The orchestrator. Manages:
- Player turns and state
- Pending tile tracking (tiles placed but not yet submitted)
- Word submission flow (validate → score → commit → draw → switch)
- Swap/pass actions
- Game-over detection (bag empty + rack empty, or 6 consecutive passes)

Key design decision: **pending tiles** are tracked separately from committed tiles. This allows players to freely place/remove/move tiles on the board before submitting, without affecting the permanent game state.

### `game/Board.ts`
The 15×15 grid. Responsibilities:
- Tile placement/removal
- Premium square definitions (TW, DW, TL, DL)
- **Word finding**: given newly placed tiles, find all words formed (main word + cross-words)
- Premium usage tracking (premiums score only on first use)

Word finding algorithm:
1. Determine play direction (horizontal if all tiles share a row, vertical if all share a column)
2. For each row/column with new tiles, find the main word (expand in both directions)
3. For each new tile, check perpendicular direction for cross-words

### `game/Bag.ts`
The tile bag. Standard Fisher-Yates shuffle. Supports:
- Draw arbitrary count
- Return tiles (reshuffles)
- Empty detection

### `game/ScoreCalculator.ts`
Pure functions for:
- **Score calculation**: iterates formed words, applies letter premiums (DL/TL) and word premiums (DW/TW), sums everything. Letter premiums multiply the individual letter value before the word multiplier is applied. Multiple word premiums stack multiplicatively.
- **Placement validation**: checks straight-line requirement, contiguity, center coverage, and adjacency to existing tiles.
- **Bingo bonus**: +50 when all 7 tiles placed in one turn

### `ui/GameUI.ts`
DOM-based UI with:
- Board grid rendering with premium square colors
- Tile rack with drag-and-drop and tap-to-place
- Action buttons (Submit, Clear, Pass, Swap)
- Touch drag support for mobile
- Game-over display

### `ui/styles.css`
Mobile-first CSS with:
- Clamp-based responsive sizing
- Color-coded premium squares (red=TW, orange=DW, blue=TL, green=DL)
- Tile styling with subtle shadows
- Active player highlight
- Desktop hover states at 768px+

## Data Flow

```
Player taps tile in rack
  → selectedTileId set
  → render() refreshes board highlighting

Player taps board cell
  → game.placeTile(tileId, row, col)
    → Checks if move is valid (cell empty, in bounds)
    → Removes tile from any previous pending position
    → Places on board, adds to pendingTiles map
  → render() shows tile on board

Player clicks "Submit"
  → game.submitWord()
    → ScoreCalculator.validatePlacement()
    → board.findWords(pending)
    → ScoreCalculator.calculate()
    → Marks premium squares as used
    → Deducts tiles from rack
    → Draws replacement tiles
    → Switches turn
  → render() with updated state + message
```

## Testing

Tests use Vitest and cover all core game logic:
- **61 tests** across 5 test files
- Pure function tests (no DOM mocking needed)
- Edge cases: out-of-bounds, empty bag, 6 consecutive passes, premium reuse
