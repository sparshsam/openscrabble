import type { GameState, Tile } from '../types.js';
import { Game } from './Game.js';

const STORAGE_KEY = 'openscrabble_save';

export interface SaveData {
  state: GameState;
  allTiles: Tile[]; // all tiles in play (board + racks) so we can reconstruct the bag
  timestamp: number;
}

/**
 * Persistence layer for OpenScrabble.
 * Saves/restores game state to localStorage.
 */
export class GamePersistence {
  /** Save current game state to localStorage */
  static save(game: Game): void {
    try {
      const state = game.getState();
      // Collect all tiles currently in play
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  /** Load saved game state from localStorage */
  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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

    // Reconstruct board
    game.board.loadGrid(state.board);

    // Reconstruct bag: we need to reset it and then "reserve" the correct tiles
    game.bag.reset();
    // The bag now has 100 tiles. We need to remove tiles that are in play
    // (on board or in racks) so only the correct ones remain.
    // Approach: empty the bag of in-play tiles by draining and returning
    const allInPlayIds = new Set(data.allTiles.map((t) => t.id));
    // Draw all tiles from bag, keep those NOT in play, return them
    const allBagTiles = game.bag.draw(100);
    const toKeep = allBagTiles.filter((t) => !allInPlayIds.has(t.id));
    game.bag.returnTiles(toKeep.map((t) => t.id));

    // Restore player state with sorted racks
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
    // pendingTiles starts empty on a fresh Game

    return game;
  }

  /** Check if a saved game exists */
  static hasSavedGame(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /** Clear saved game */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Get save timestamp or null */
  static getSavedTimestamp(): number | null {
    const data = GamePersistence.load();
    return data?.timestamp ?? null;
  }
}
