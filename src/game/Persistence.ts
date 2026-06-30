import type { GameState, Tile } from '../types.js';
import { Game } from './Game.js';

const LEGACY_KEY = 'openscrabble_save';

export interface SaveData {
  state: GameState;
  allTiles: Tile[];
  timestamp: number;
}

/**
 * Persistence layer for OpenScrabble.
 * Supports both legacy single-save (openscrabble_save) and
 * per-game saves (openscrabble_save_<gameId>).
 */
export class GamePersistence {
  /** Save current game state to a key (default: legacy key) */
  static save(game: Game, gameId?: string): void {
    const key = gameId ? `openscrabble_save_${gameId}` : LEGACY_KEY;
    try {
      const state = game.getState();
      const allTiles: Set<Tile> = new Set();
      for (const row of state.board) {
        for (const t of row) {
          if (t) allTiles.add(t);
        }
      }
      for (const p of state.players) {
        for (const t of p.rack) {
          if (t) allTiles.add(t);
        }
      }

      const data: SaveData = {
        state,
        allTiles: [...allTiles],
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  /** Load saved game state from a key (default: legacy key) */
  static load(gameId?: string): SaveData | null {
    try {
      const key = gameId ? `openscrabble_save_${gameId}` : LEGACY_KEY;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data.state || !data.allTiles) return null;
      return data;
    } catch {
      return null;
    }
  }

  /** Reconstruct a Game from saved data */
  static restoreGame(data: SaveData): Game {
    const state = data.state;
    const game = new Game(state.players[0]!.name, state.players[1]!.name);

    game.board.loadGrid(state.board);
    game.bag.reset();
    const allInPlayIds = new Set(data.allTiles.map((t) => t.id));
    const allBagTiles = game.bag.draw(100);
    const toKeep = allBagTiles.filter((t) => !allInPlayIds.has(t.id));
    game.bag.returnTiles(toKeep.map((t) => t.id));

    const sortRack = (r: (import('../types.js').Tile | null)[]) => {
      const tiles = r.filter((t): t is import('../types.js').Tile => t !== null);
      tiles.sort((a, b) => {
        const aLetter = (a.playedAs || a.letter || '').toLowerCase();
        const bLetter = (b.playedAs || b.letter || '').toLowerCase();
        if (!aLetter && !bLetter) return 0;
        if (!aLetter) return 1;
        if (!bLetter) return -1;
        return aLetter.localeCompare(bLetter);
      });
      const result: (import('../types.js').Tile | null)[] = [...tiles];
      while (result.length < 7) result.push(null);
      return result;
    };

    game.players = [
      {
        name: state.players[0]!.name,
        score: state.players[0]!.score,
        rack: sortRack(state.players[0]!.rack.map((t) => (t ? { ...t } : null))),
        isActive: state.currentPlayerIndex === 0,
      },
      {
        name: state.players[1]!.name,
        score: state.players[1]!.score,
        rack: sortRack(state.players[1]!.rack.map((t) => (t ? { ...t } : null))),
        isActive: state.currentPlayerIndex === 1,
      },
    ];

    game.currentPlayerIndex = state.currentPlayerIndex;
    game.phase = 'placing';
    game.turnNumber = state.turnNumber;
    game.consecutivePasses = state.consecutivePasses;
    game.swapMode = false;

    return game;
  }

  /** Check if a saved game exists for a key (default: legacy) */
  static hasSavedGame(gameId?: string): boolean {
    const key = gameId ? `openscrabble_save_${gameId}` : LEGACY_KEY;
    return localStorage.getItem(key) !== null;
  }

  /** Check if legacy save exists */
  static hasLegacySave(): boolean {
    return localStorage.getItem(LEGACY_KEY) !== null;
  }

  /** Clear a specific save (default: legacy) */
  static clear(gameId?: string): void {
    const key = gameId ? `openscrabble_save_${gameId}` : LEGACY_KEY;
    localStorage.removeItem(key);
  }

  /** Clear all saves (legacy + per-game) */
  static clearAll(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === LEGACY_KEY || k.startsWith('openscrabble_save_'))) {
        keys.push(k);
      }
    }
    for (const k of keys) {
      localStorage.removeItem(k);
    }
  }

  /** Get save timestamp for a key */
  static getSavedTimestamp(gameId?: string): number | null {
    const data = GamePersistence.load(gameId);
    return data?.timestamp ?? null;
  }
}
