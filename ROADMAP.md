# OpenScrabble Roadmap

## Current Release — v0.2.1 (Core Gameplay Bugfix)

- Dictionary validation with SOWPODS-derived word list
- 2-letter word validation against official TWL/NASPA
- Cross-word validation for all words formed by a move
- Persistence layer (localStorage) for saved game state

## Short-term (v0.3)

| Feature | Priority | Notes |
|---------|----------|-------|
| Blank tile letter assignment | High | Popup to choose letter when placing a blank |
| Undo last move | High | Rollback the most recent submitted move |
| Move history panel | Medium | Show past words and scores per turn |
| Desktop adaptive layout | Medium | Board and rack side-by-side on wide screens |

## Medium-term (v0.4)

| Feature | Priority | Notes |
|---------|----------|-------|
| Animations and transitions | Medium | Tile placement, scoring, game over effects |
| Sound effects | Low | Optional sound toggle for tile placement, submit |
| Game timer | Low | Optional per-turn timer |

## Long-term (v1.0+)

| Feature | Notes |
|---------|-------|
| Online multiplayer | Server-based real-time play |
| AI opponent | Computer player with configurable difficulty |
| Tournament mode | Official Scrabble rules, clock, challenge system |
| Account system | Optional accounts for cross-device game history |

## Out of Scope (v1.x)

- Multiplayer / online play (separate milestone)
- AI opponent (separate milestone)
- Account system (separate milestone)

---

*Last updated: 2026-06-14*
