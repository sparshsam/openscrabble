# OpenScrabble v0.2

A clean, local-first, two-player Scrabble game built with TypeScript and Vite. Mobile-first design, no accounts, no AI, no nonsense.

## Quick Start

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

Open `http://localhost:5173` after running `npm run dev`.

### Custom Player Names

```
http://localhost:5173/?p1=Alice&p2=Bob
```

## Gameplay

OpenScrabble follows standard Scrabble rules:

- **15×15 board** with correct premium square placement
- **100 tiles** with official distribution (including 2 blanks)
- **7-tile rack** per player
- **First word** must cover center square (★)
- **Word scoring** with letter/word premium multipliers
- **Bingo bonus** (+50) for using all 7 tiles in one play
- **Pass** (forfeits turn)
- **Swap** (exchange tiles from bag — uses your turn)
- **Game over** triggers when a player empties their rack and the bag is empty, or after 6 consecutive passes

### Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Select tile from rack | Click | Tap |
| Place tile on board | Click empty square | Tap empty square |
| Move pending tile | Click pending tile, then target square | Tap pending tile, then target square |
| Return pending tile to rack | Click selected pending tile again | Tap selected pending tile again |
| Clear all pending tiles | Click Clear | Tap Clear |
| Submit word | Click Submit | Tap Submit |
| Pass/Swap | Click button | Tap button |

## Dictionary

OpenScrabble uses a **built-in word list** for dictionary validation.

- **Source**: The word list (`src/data/wordList.ts`) is a ~100K-word SOWPODS-derived set. It covers the vast majority of valid Scrabble words.
- **2-letter words**: Validated against the official **TWL/NASPA** 2-letter word list (107 words including AA, EW, OK, KO, QI, XU, ZA, etc.). Any 2-letter combination not in this official list is rejected.
- **Longer words**: Checked against the full ~100K word list. Some uncommon valid words may be missing; some obscure entries may be present.
- **Cross-words**: All words formed by a move (main word + cross-words) are validated independently. If any formed word fails, the entire move is rejected and tiles remain on the board for the player to fix.
- **Limitations**: This is not an official Scrabble dictionary. For tournament play, consult the official NASPA or WESPA word list.

## Project Structure

```
openscrabble/
├── src/
│   ├── main.ts              # Entry point
│   ├── types.ts             # Shared type definitions
│   ├── game/
│   │   ├── Game.ts          # Game orchestration
│   │   ├── Board.ts         # 15×15 board + premium squares
│   │   ├── Bag.ts           # Tile bag (shuffle, draw, return)
│   │   └── ScoreCalculator.ts  # Scoring + placement validation
│   ├── ui/
│   │   ├── GameUI.ts        # DOM rendering + interaction
│   │   └── styles.css       # Mobile-first CSS
│   └── data/
│       └── tileDistribution.ts  # Official tile counts
├── tests/
│   ├── Bag.test.ts          # 7 tests
│   ├── Board.test.ts        # 13 tests
│   ├── Game.test.ts         # 19 tests
│   ├── ScoreCalculator.test.ts  # 16 tests
│   └── tileDistribution.test.ts # 6 tests
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Tech Stack

- **TypeScript** (strict mode, `noUncheckedIndexedAccess`)
- **Vite** (build tool + bundler)
- **Vitest** (test runner)
- **Vanilla DOM** (no framework; lightweight, no dependencies)

## License

MIT
