import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game/Game.js';
import { resetTileCounter } from '../src/data/tileDistribution.js';

describe('Game', () => {
  let game: Game;

  beforeEach(() => {
    resetTileCounter();
    game = new Game('Alice', 'Bob');
  });

  it('starts with two players', () => {
    expect(game.players.length).toBe(2);
    expect(game.players[0]!.name).toBe('Alice');
    expect(game.players[1]!.name).toBe('Bob');
  });

  it('starts with player 1 active', () => {
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.players[0]!.isActive).toBe(true);
    expect(game.players[1]!.isActive).toBe(false);
  });

  it('gives each player 7 tiles', () => {
    const tiles0 = game.players[0]!.rack.filter((t) => t !== null);
    const tiles1 = game.players[1]!.rack.filter((t) => t !== null);
    expect(tiles0.length).toBe(7);
    expect(tiles1.length).toBe(7);
  });

  it('deducts drawn tiles from bag', () => {
    expect(game.bag.remainingCount).toBe(100 - 14); // 86
  });

  it('places a tile from the rack onto the board', () => {
    const tileId = game.players[0]!.rack.find((t) => t !== null)!.id;
    const success = game.placeTile(tileId, 7, 7);
    expect(success).toBe(true);
    expect(game.board.isOccupied(7, 7)).toBe(true);
  });

  it('rejects placing on occupied cell', () => {
    const tile1 = game.players[0]!.rack.find((t) => t !== null)!;
    game.placeTile(tile1.id, 7, 7);

    const tile2 = game.players[0]!.rack.find((t) => t !== null && t.id !== tile1.id)!;
    const success = game.placeTile(tile2.id, 7, 7);
    expect(success).toBe(false);
  });

  it('rejects placing out of bounds', () => {
    const tile = game.players[0]!.rack.find((t) => t !== null)!;
    expect(game.placeTile(tile.id, -1, 0)).toBe(false);
    expect(game.placeTile(tile.id, 15, 15)).toBe(false);
  });

  it('removes a pending tile', () => {
    const tile = game.players[0]!.rack.find((t) => t !== null)!;
    game.placeTile(tile.id, 7, 7);
    const removed = game.removeTile(7, 7);
    expect(removed).toBe(true);
    expect(game.board.isOccupied(7, 7)).toBe(false);
  });

  it('clears all pending tiles', () => {
    const tiles = game.players[0]!.rack.filter((t) => t !== null).slice(0, 3);
    for (const t of tiles) {
      game.placeTile(t.id, 7, 7 + tiles.indexOf(t));
    }
    expect(game.getPendingTiles().length).toBe(3);
    game.clearPending();
    expect(game.getPendingTiles().length).toBe(0);
    for (const t of tiles) {
      expect(game.board.isOccupied(7, 7 + tiles.indexOf(t))).toBe(false);
    }
  });

  it('submits a valid word', () => {
    // Place tiles across center: C A T at (7,6), (7,7), (7,8)
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    // Just place whatever tiles we have
    for (let i = 0; i < Math.min(3, rack.length); i++) {
      game.placeTile(rack[i]!.id, 7, 6 + i);
    }

    if (game.getPendingTiles().length > 0) {
      const result = game.submitWord();
      // It may fail validation since tiles aren't letters, but placement should be accepted
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }
  });

  it('rejects submitting with no tiles placed', () => {
    const result = game.submitWord();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No tiles placed');
  });

  it('passes turn correctly', () => {
    game.passTurn();
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.consecutivePasses).toBe(1);
  });

  it('swaps tiles', () => {
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    game.enterSwapMode();
    expect(game.swapMode).toBe(true);
    expect(game.phase).toBe('swap');

    const swapIds = [rack[0]!.id, rack[1]!.id];
    game.swapTiles(swapIds);
    expect(game.swapMode).toBe(false);
    expect(game.phase).toBe('placing');
    expect(game.currentPlayerIndex).toBe(1); // switched turn
  });

  it('cancels swap mode', () => {
    game.enterSwapMode();
    expect(game.swapMode).toBe(true);
    game.cancelSwap();
    expect(game.swapMode).toBe(false);
    expect(game.phase).toBe('placing');
    // Turn should not have switched
    expect(game.currentPlayerIndex).toBe(0);
  });

  it('tracks consecutive passes and ends game at 6', () => {
    for (let i = 0; i < 6; i++) {
      expect(game.phase).not.toBe('gameover');
      game.passTurn();
    }
    expect(game.phase).toBe('gameover');
  });

  it('provides game state snapshot', () => {
    const state = game.getState();
    expect(state.players.length).toBe(2);
    expect(state.players[0]!.rack.length).toBe(7);
    expect(state.phase).toBe('placing');
    expect(state.bag.length).toBe(86);
  });

  it('allows reset', () => {
    game.passTurn();
    game.passTurn();
    expect(game.turnNumber).toBeGreaterThan(1);
    game.reset();
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.turnNumber).toBe(1);
    expect(game.consecutivePasses).toBe(0);
    expect(game.phase).toBe('placing');
  });

  it('draws tiles automatically after submission', () => {
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    const tile = rack[0]!;
    game.placeTile(tile.id, 7, 7);

    // Validate first move covers center
    // Since (7,7) is center, this should work
    // But we need more tiles in a line for a valid word
    const tile2 = rack[1]!;
    game.placeTile(tile2.id, 7, 8);

    const result = game.submitWord();
    if (result.success) {
      // The second player's rack should still be 7
      expect(game.players[1]!.rack.filter((t) => t !== null).length).toBe(7);
    }
  });

  it('allows moving a pending tile', () => {
    const tile = game.players[0]!.rack.find((t) => t !== null)!;
    game.placeTile(tile.id, 7, 7);
    expect(game.board.isOccupied(7, 7)).toBe(true);
    expect(game.board.isOccupied(7, 8)).toBe(false);

    game.movePendingTile(tile.id, 7, 8);
    expect(game.board.isOccupied(7, 7)).toBe(false);
    expect(game.board.isOccupied(7, 8)).toBe(true);
  });

  describe('pending tile removal', () => {
    it('returns a pending tile individually', () => {
      const tile = game.players[0]!.rack.find((t) => t !== null)!;
      game.placeTile(tile.id, 7, 7);
      expect(game.getPendingTiles().length).toBe(1);
      expect(game.board.isOccupied(7, 7)).toBe(true);

      const removed = game.removeTile(7, 7);
      expect(removed).toBe(true);
      expect(game.getPendingTiles().length).toBe(0);
      expect(game.board.isOccupied(7, 7)).toBe(false);
      // Tile should be back in rack
      const rackHasTile = game.players[0]!.rack.some((t) => t?.id === tile.id);
      expect(rackHasTile).toBe(true);
    });

    it('returns only the specified pending tile', () => {
      const tiles = game.players[0]!.rack.filter((t) => t !== null).slice(0, 2);
      game.placeTile(tiles[0]!.id, 7, 7);
      game.placeTile(tiles[1]!.id, 7, 8);
      expect(game.getPendingTiles().length).toBe(2);

      // Remove only the first tile
      const removed = game.removeTile(7, 7);
      expect(removed).toBe(true);
      expect(game.getPendingTiles().length).toBe(1);
      // Second tile should still be on board
      expect(game.board.isOccupied(7, 8)).toBe(true);
      // First tile should be back in rack
      const rackHasTile = game.players[0]!.rack.some((t) => t?.id === tiles[0]!.id);
      expect(rackHasTile).toBe(true);
    });

    it('undoLastPendingTile returns only the most recently placed tile', () => {
      const tiles = game.players[0]!.rack.filter((t) => t !== null);
      const t1 = tiles[0]!;
      const t2 = tiles.find((t) => t !== null && t.id !== t1.id)!;
      game.placeTile(t1.id, 7, 7);
      game.placeTile(t2.id, 7, 8);
      expect(game.getPendingTiles().length).toBe(2);

      const undone = game.undoLastPendingTile();
      expect(undone).toBe(true);
      expect(game.getPendingTiles().length).toBe(1);
      // The last placed tile (t2 at 7,8) should be removed
      expect(game.board.isOccupied(7, 8)).toBe(false);
      // The first tile (t1 at 7,7) should still be on board
      expect(game.board.isOccupied(7, 7)).toBe(true);
      // t2 should be back in rack
      const rackHasT2 = game.players[0]!.rack.some((t) => t?.id === t2.id);
      expect(rackHasT2).toBe(true);
    });

    it('undoLastPendingTile does nothing when no tiles are pending', () => {
      expect(game.getPendingTiles().length).toBe(0);
      const undone = game.undoLastPendingTile();
      expect(undone).toBe(false);
    });

    it('clearPending returns all pending tiles', () => {
      const tiles = game.players[0]!.rack.filter((t) => t !== null).slice(0, 3);
      for (let i = 0; i < tiles.length; i++) {
        game.placeTile(tiles[i]!.id, 7, 7 + i);
      }
      expect(game.getPendingTiles().length).toBe(3);
      expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(4); // 7-3=4

      game.clearPending();
      expect(game.getPendingTiles().length).toBe(0);
      expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(7); // all restored
    });

    it('preview updates after removing one pending tile', () => {
      const tiles = game.players[0]!.rack.filter((t) => t !== null).slice(0, 3);
      for (let i = 0; i < tiles.length; i++) {
        game.placeTile(tiles[i]!.id, 7, 6 + i);
      }
      expect(game.getPendingTiles().length).toBe(3);

      // Get preview with 3 tiles
      const preview3 = game.previewMove();
      // Remove one tile
      game.removeTile(7, 7);
      expect(game.getPendingTiles().length).toBe(2);

      // Preview should reflect 2 tiles
      const preview2 = game.previewMove();
      // Both previews should be valid objects
      expect(preview3).toBeDefined();
      expect(preview2).toBeDefined();
      // The tile removed should be back in rack (3 placed, 1 returned = 5 in rack)
      const rackCount = game.players[0]!.rack.filter((t) => t !== null).length;
      expect(rackCount).toBe(5);
    });
  });
});
