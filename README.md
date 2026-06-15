<p align="center">
  <img src="https://img.shields.io/badge/status-active--development-2ecc71?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/version-0.2.1-3498db?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-7d3c98?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/typescript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/build-passing-2ecc71?style=for-the-badge" alt="Build" />
  <img src="https://img.shields.io/badge/tests-61%20passing-2ecc71?style=for-the-badge" alt="Tests" />
  <img src="https://img.shields.io/badge/bundle-6.5KB%20JS%20(gz)-e67e22?style=for-the-badge" alt="Bundle Size" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Vitest-3.0-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

---

# OpenScrabble

**A clean, local-first, two-player Scrabble game. No accounts, no AI, no nonsense.**

OpenScrabble is a fully client-side Scrabble implementation built with TypeScript and Vite. It runs entirely in the browser with a mobile-first responsive design — no backend, no server, no sign-up required.

---

## Maturity

| Aspect | Status |
|--------|--------|
| Core gameplay | ✅ Complete — 15×15 board, official tile distribution, full scoring |
| Dictionary validation | ✅ Complete — SOWPODS-derived word list, TWL 2-letter validation |
| UI/UX | ✅ Complete — mobile-first, tap-to-place, drag-and-drop, live preview |
| Persistence | ✅ Complete — localStorage game saving |
| Blank tile assignment | ⏳ Planned for v0.3 |
| Undo move | ⏳ Planned for v0.3 |
| Online multiplayer | ❌ Future milestone |

---

## Quick Links

| | |
|---|---|
| 📖 [Gameplay & Controls](#gameplay) | 🏗️ [Architecture](ARCHITECTURE.md) |
| 🚀 [Getting Started](#getting-started) | 🗺️ [Roadmap](ROADMAP.md) |
| 📋 [Changelog](CHANGELOG.md) | 🤝 [Contributing](CONTRIBUTING.md) |
| 🔒 [Security](SECURITY.md) | 📚 [Support](SUPPORT.md) |

---

## Features

| Feature | Description |
|---------|-------------|
| 🎮 **Two-player local play** | Pass-and-play on the same device |
| 🏆 **Official Scrabble rules** | 15×15 board, premium squares, full scoring |
| 🔤 **100 tiles, official distribution** | Including 2 blanks, correct point values |
| 📖 **Dictionary validation** | ~100K word SOWPODS-derived list + official TWL 2-letter words |
| ✅ **Cross-word validation** | All words formed by a move checked independently |
| 📱 **Mobile-first design** | Responsive from 320px, tap or drag tiles |
| 👁️ **Live preview** | See projected score and validity before submitting |
| 💾 **Game persistence** | localStorage saves your game in progress |
| 🧪 **61 unit tests** | All core game logic tested with Vitest |
| ⚡ **Lightweight** | ~6.5KB JS + ~1.8KB CSS gzipped |
| 🔒 **No accounts** | Zero sign-up, zero data collection |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [TypeScript](https://www.typescriptlang.org/) | Language (strict mode, `noUncheckedIndexedAccess`) |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [Vitest](https://vitest.dev/) | Test runner |
| Vanilla DOM | UI rendering (no framework) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone
git clone https://github.com/sparshsam/openscrabble.git
cd openscrabble

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

---

## Gameplay

OpenScrabble follows standard Scrabble rules.

### Rules

- **15×15 board** with correct premium square placement (TW, DW, TL, DL)
- **100 tiles** with official distribution (including 2 blanks)
- **7-tile rack** per player
- **First word** must cover center square (★)
- **Word scoring** with letter/word premium multipliers (stacking multiplicatively)
- **Bingo bonus** (+50) for using all 7 tiles in one play
- **Pass** — forfeits turn
- **Swap** — exchange tiles from bag (uses your turn)
- **Game over** — triggered when a player empties their rack and the bag is empty, or after 6 consecutive passes
- **Endgame scoring** — opponent's unplayed tile values deducted

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

### Dictionary

OpenScrabble uses a **built-in word list** for dictionary validation.

- **Source**: The word list (`src/data/wordList.ts`) is a ~100K-word SOWPODS-derived set. It covers the vast majority of valid Scrabble words.
- **2-letter words**: Validated against the official **TWL/NASPA** 2-letter word list (107 words including AA, EW, OK, KO, QI, XU, ZA, etc.).
- **Cross-words**: All words formed by a move (main word + cross-words) are validated independently.
- **Limitations**: This is not an official Scrabble dictionary. For tournament play, consult the official NASPA or WESPA word list.

---

## Repository Structure

```
openscrabble/
├── src/
│   ├── main.ts              # Entry point
│   ├── types.ts             # Shared type definitions
│   ├── game/
│   │   ├── Game.ts          # Game orchestration
│   │   ├── Board.ts         # 15×15 board + premium squares
│   │   ├── Bag.ts           # Tile bag (shuffle, draw, return)
│   │   ├── ScoreCalculator.ts  # Scoring + placement validation
│   │   ├── WordValidator.ts    # Dictionary lookup
│   │   └── Persistence.ts      # localStorage save/load
│   ├── ui/
│   │   ├── GameUI.ts        # DOM rendering + interaction
│   │   ├── HomePage.ts      # Home screen
│   │   └── styles.css       # Mobile-first CSS
│   └── data/
│       ├── tileDistribution.ts  # Official tile counts
│       └── wordList.ts         # SOWPODS-derived word list
├── tests/
│   ├── Bag.test.ts          # 7 tests
│   ├── Board.test.ts        # 13 tests
│   ├── Game.test.ts         # 19 tests
│   ├── ScoreCalculator.test.ts  # 16 tests
│   ├── tileDistribution.test.ts # 6 tests
│   ├── WordValidator.test.ts    # Dictionary tests
│   └── Persistence.test.ts      # Storage tests
├── docs/
│   ├── audits/              # Security/quality audit reports
│   └── ARCHITECTURE.md      # Design philosophy and module reference
├── .github/workflows/
│   └── ci.yml               # CI pipeline
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── LICENSE
├── CHANGELOG.md
├── ROADMAP.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── SUPPORT.md
├── AGENTS.md
└── CLAUDE.md
```

---

## Screenshots

> Screenshots coming soon.

---

## Limitations

| Limitation | Impact | Planned |
|------------|--------|---------|
| **Blank tile assignment** | Blanks appear as `?` without letter selection | v0.3 |
| **No undo** | Submitted moves can't be rolled back | v0.3 |
| **No move history** | Past words and scores not tracked in a panel | v0.3 |
| **Desktop layout** | Functional but not side-by-side on wide screens | v0.3 |
| **No sound/animations** | Silent, static gameplay | v0.4 |
| **No online multiplayer** | Local pass-and-play only | v1.0+ |
| **No AI opponent** | Requires a second human player | v1.0+ |

---

## License

[MIT](LICENSE) — see the [LICENSE](LICENSE) file for details.

---

*Last updated: 2026-06-14*
