# Contributing

Thank you for your interest in OpenScrabble! This is a small, focused project,
and we appreciate help that aligns with its scope.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/sparshsam/openscrabble.git
cd openscrabble

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type-check
npm run typecheck

# Build for production
npm run build
```

## Development Guidelines

- **Game logic must be UI-independent** — game modules in `src/game/` are pure
  TypeScript with zero DOM dependency.
- **No framework** — the UI uses vanilla DOM intentionally.
- **TypeScript strict mode** — `strict: true` with `noUncheckedIndexedAccess`.
- **Mobile-first** — all CSS should be responsive from phone-sized viewports.

## Testing

Game logic changes require tests:

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

## Code Quality

```bash
npm run typecheck  # TypeScript check — must be clean
npm run build      # Production build — must succeed
```

## Pull Request Process

1. Branch from `master` for all changes.
2. Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
3. Run `npm test`, `npm run typecheck`, and `npm run build` before submitting.
4. Update tests if game logic changes.
5. Keep changes focused and minimal.

## What We Accept

- Bug fixes with tests
- Dictionary improvements (verified word additions)
- Accessibility improvements
- Documentation improvements
- Performance optimizations (with benchmarks)

## What We Don't Accept

- Backend services or accounts
- AI-powered features
- Telemetry, analytics, or data collection
- Framework migrations (React, Vue, etc.)
- Scope creep beyond a local Scrabble game

## License Agreement

By contributing, you agree that your contributions will be licensed under the
project's MIT license (see LICENSE).
