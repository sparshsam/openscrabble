# Contributing to OpenScrabble

Thank you for your interest in contributing to OpenScrabble! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. **Check existing issues** — search the [issue tracker](https://github.com/sparshsam/openscrabble/issues) first.
2. **Open a new issue** with a clear title and description, including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/environment details
   - Screenshots if applicable

### Suggesting Features

Open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- The proposed solution
- Any alternatives considered

### Pull Requests

1. **Fork the repository** and create a branch from `main`.
2. **Follow the coding style** — this project uses strict TypeScript with `noUncheckedIndexedAccess`.
3. **Write tests** for new functionality. All game logic should have corresponding Vitest tests.
4. **Ensure all tests pass**:
   ```bash
   npm test
   ```
5. **Run the type checker**:
   ```bash
   npx tsc --noEmit
   ```
6. **Keep PRs focused** — one feature/fix per pull request.
7. **Write clear commit messages** (conventional commits preferred).

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/openscrabble.git
cd openscrabble

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
openscrabble/
├── src/
│   ├── main.ts              # Entry point
│   ├── types.ts             # Shared type definitions
│   ├── game/                # Game engine (no DOM dependency)
│   ├── ui/                  # DOM rendering and interaction
│   └── data/                # Tile distribution and word lists
├── tests/                   # Vitest test files
├── docs/                    # Architecture and design documents
└── index.html
```

## Coding Guidelines

- **TypeScript** — strict mode enabled; avoid `any`.
- **No framework** — this project uses vanilla DOM intentionally.
- **Game logic** must be UI-independent (testable without a browser).
- **CSS** — mobile-first, responsive design.
- **Tests** — every game module should have a corresponding test file.

## Commit Messages

Use conventional commit format when possible:

```
feat: add tile swapping animation
fix: correct premium square scoring on first play
docs: update README with mobile controls
test: add edge cases for empty bag
```

## Questions?

Open a [discussion](https://github.com/sparshsam/openscrabble/discussions) or reach out to the maintainers.
