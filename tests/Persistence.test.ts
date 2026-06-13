import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game/Game.js';
import { GamePersistence } from '../src/game/Persistence.js';
import { resetTileCounter } from '../src/data/tileDistribution.js';

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
};

beforeEach(() => {
  mockStorage[''] = ''; // init
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

describe('Persistence', () => {
  beforeEach(() => {
    resetTileCounter();
    // Patch localStorage on global
    (globalThis as Record<string, unknown>).localStorage = mockLocalStorage;
    mockStorage[''] = '';
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  it('saves and restores game state', () => {
    const game = new Game('Alice', 'Bob');
    game.placeTile(game.players[0]!.rack.find((t) => t !== null)!.id, 7, 7);
    game.placeTile(game.players[0]!.rack.find((t) => t !== null)!.id, 7, 8);

    GamePersistence.save(game);
    expect(GamePersistence.hasSavedGame()).toBe(true);

    const savedData = GamePersistence.load();
    expect(savedData).not.toBeNull();
    expect(savedData!.state.players[0]!.name).toBe('Alice');
    expect(savedData!.state.players[1]!.name).toBe('Bob');
  });

  it('restores a playable game', () => {
    const game = new Game('X', 'Y');

    // Place some tiles on the board (don't submit — may fail dictionary check)
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    game.placeTile(rack[0]!.id, 7, 7);
    game.placeTile(rack[1]!.id, 7, 8);
    // Submit only if valid
    const submitResult = game.submitWord();
    if (!submitResult.success) {
      // If invalid, clear and pass turn to create a saveable state
      game.clearPending();
      game.passTurn();
    }

    GamePersistence.save(game);

    const data = GamePersistence.load()!;
    const restored = GamePersistence.restoreGame(data);

    expect(restored.players[0]!.name).toBe('X');
    expect(restored.players[1]!.name).toBe('Y');
  });

  it('clears saved game', () => {
    const game = new Game();
    GamePersistence.save(game);
    expect(GamePersistence.hasSavedGame()).toBe(true);
    GamePersistence.clear();
    expect(GamePersistence.hasSavedGame()).toBe(false);
  });

  it('returns null when no saved game', () => {
    expect(GamePersistence.hasSavedGame()).toBe(false);
    expect(GamePersistence.load()).toBeNull();
  });
});

describe('Rack behavior', () => {
  beforeEach(() => {
    resetTileCounter();
    (globalThis as Record<string, unknown>).localStorage = mockLocalStorage;
  });

  it('removes tile from rack when placed on board', () => {
    const game = new Game('P1', 'P2');
    const rackBefore = game.players[0]!.rack.filter((t) => t !== null);
    const tileCount = rackBefore.length;

    const tile = rackBefore[0]!;
    game.placeTile(tile.id, 7, 7);

    // Tile should no longer be in rack (it's null somewhere)
    const stillInRack = game.players[0]!.rack.some((t) => t?.id === tile.id);
    expect(stillInRack).toBe(false);
    // Rack non-null count decreased by 1
    const rackAfter = game.players[0]!.rack.filter((t) => t !== null);
    expect(rackAfter.length).toBe(tileCount - 1);
  });

  it('restores tile to rack when removed from board', () => {
    const game = new Game('P1', 'P2');
    const tile = game.players[0]!.rack.find((t) => t !== null)!;
    const tileId = tile.id;

    game.placeTile(tileId, 7, 7);
    // Now rack shouldn't have it
    expect(game.players[0]!.rack.some((t) => t?.id === tileId)).toBe(false);

    game.removeTile(7, 7);
    // Now rack should have it back
    expect(game.players[0]!.rack.some((t) => t?.id === tileId)).toBe(true);
  });

  it('restores tiles to rack on clearPending', () => {
    const game = new Game('P1', 'P2');
    const rackBefore = game.players[0]!.rack.filter((t) => t !== null);
    const tile1 = rackBefore[0]!;
    const tile2 = rackBefore[1]!;

    game.placeTile(tile1.id, 7, 7);
    game.placeTile(tile2.id, 7, 8);

    expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(5);

    game.clearPending();
    expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(7);
  });

  it('submitWord validates against dictionary', () => {
    const game = new Game('P1', 'P2');
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    const tile = rack[0]!;
    const tile2 = rack[1]!;

    game.placeTile(tile.id, 7, 7);
    game.placeTile(tile2.id, 7, 8);

    const preview = game.previewMove();
    const result = game.submitWord();

    // previewMove and submitWord agree on validity
    expect(result.success).toBe(preview.valid);

    if (!result.success) {
      // Tiles restored to rack on failure
      expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(7);
      expect(game.currentPlayerIndex).toBe(0);
    } else {
      // Tiles drawn and turn switched on success
      expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(7);
      expect(game.currentPlayerIndex).toBe(1);
    }
  });

  it('restores rack to 7 after clearPending', () => {
    const game = new Game('P1', 'P2');
    const rack = game.players[0]!.rack.filter((t) => t !== null);
    const tile = rack[0]!;
    const tile2 = rack[1]!;

    game.placeTile(tile.id, 7, 7);
    game.placeTile(tile2.id, 7, 8);
    expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(5);

    game.clearPending();
    expect(game.players[0]!.rack.filter((t) => t !== null).length).toBe(7);
  });
});
