/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createActiveGameRecord,
  getGameById,
  loadAllGames,
  clearAllGameRecords,
  addGameRecord,
  computeStats,
} from '../src/lib/LocalGameStore.js';

const SAVE_PREFIX = 'openscrabble_save_';

// Provide a simple localStorage mock for jsdom
const storage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  get length() { return Object.keys(storage).length; },
  key: (i: number) => Object.keys(storage)[i] ?? null,
} as Storage;

describe('LocalGameStore game creation', () => {
  beforeEach(() => {
    clearAllGameRecords();
    const keys = Object.keys(storage);
    for (const key of keys) {
      if (key.startsWith(SAVE_PREFIX)) {
        delete storage[key];
      }
    }
  });

  afterEach(() => {
    clearAllGameRecords();
    const keys = Object.keys(storage);
    for (const key of keys) {
      if (key.startsWith(SAVE_PREFIX)) {
        delete storage[key];
      }
    }
  });

  it('creates a metadata record with correct players', () => {
    const record = createActiveGameRecord(['Alice', 'Bob']);
    expect(record).toBeDefined();
    expect(record.id).toBeTruthy();
    expect(record.players).toEqual(['Alice', 'Bob']);
    expect(record.status).toBe('active');
    expect(record.totalTurns).toBe(0);

    const loaded = getGameById(record.id);
    expect(loaded).toBeDefined();
    expect(loaded!.players).toEqual(['Alice', 'Bob']);
  });

  it('metadata record alone has no save state', () => {
    const record = createActiveGameRecord(['Alice', 'Bob']);
    const saveKey = `${SAVE_PREFIX}${record.id}`;
    const saveData = localStorage.getItem(saveKey);
    expect(saveData).toBeNull();
  });

  it('save state is created after GamePersistence.save', async () => {
    const { GamePersistence } = await import('../src/game/Persistence.js');
    const { Game } = await import('../src/game/Game.js');

    const record = createActiveGameRecord(['Alice', 'Bob']);
    const game = new Game('Alice', 'Bob');
    GamePersistence.save(game, record.id);

    const saveKey = `${SAVE_PREFIX}${record.id}`;
    const saveData = localStorage.getItem(saveKey);
    expect(saveData).not.toBeNull();

    const loaded = GamePersistence.load(record.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.state.players[0]!.name).toBe('Alice');
  });

  it('stale metadata-only records are detected as unresumable', async () => {
    const record = createActiveGameRecord(['Player 1', 'Player 2']);

    const saveKey = `${SAVE_PREFIX}${record.id}`;
    const saveData = localStorage.getItem(saveKey);
    expect(saveData).toBeNull();

    const { GamePersistence } = await import('../src/game/Persistence.js');
    const loaded = GamePersistence.load(record.id);
    expect(loaded).toBeNull();
  });

  it('multiple games can exist simultaneously', () => {
    const r1 = createActiveGameRecord(['Alice', 'Bob']);
    const r2 = createActiveGameRecord(['Charlie', 'Diana']);
    const r3 = createActiveGameRecord(['Eve', 'Frank']);

    const all = loadAllGames();
    const active = all.filter((g) => g.status === 'active');
    expect(active.length).toBeGreaterThanOrEqual(3);

    expect(getGameById(r1.id)!.players).toEqual(['Alice', 'Bob']);
    expect(getGameById(r2.id)!.players).toEqual(['Charlie', 'Diana']);
    expect(getGameById(r3.id)!.players).toEqual(['Eve', 'Frank']);
  });

  it('createActiveGameRecord with custom gameId', () => {
    const record = createActiveGameRecord(['Test', 'User'], 'custom-id-123');
    expect(record.id).toBe('custom-id-123');
    expect(getGameById('custom-id-123')).toBeDefined();
  });
});

describe('computeStats', () => {
  beforeEach(() => {
    clearAllGameRecords();
    const keys = Object.keys(storage);
    for (const key of keys) {
      if (key.startsWith('openscrabble_save_')) delete storage[key];
    }
  });

  function addCompletedGame(
    players: string[],
    scores: number[],
    winner: string | null,
    isTie: boolean,
    status: 'completed' | 'abandoned' | 'active' = 'completed'
  ): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    addGameRecord({
      id,
      status,
      createdDate: now,
      lastPlayedDate: now,
      completedDate: now,
      players,
      scores,
      winner,
      isTie,
      totalTurns: 10,
      bestWord: 'CAT',
      bestWordScore: 5,
      totalMoves: 10,
      bingos: 0,
    });
  }

  it('counts wins when current user wins normally', () => {
    addCompletedGame(['Alice', 'Bob'], [100, 80], 'Alice', false);
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.gamesLost).toBe(0);
    expect(stats.winRate).toBe(100);
  });

  it('counts loss when current user resigns (opponent wins)', () => {
    addCompletedGame(['Alice', 'Bob'], [50, 120], 'Bob', false);
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(0);
    expect(stats.gamesLost).toBe(1);
    expect(stats.winRate).toBe(0);
  });

  it('counts win when opponent resigns (current user wins)', () => {
    addCompletedGame(['Alice', 'Bob'], [120, 50], 'Alice', false);
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.gamesLost).toBe(0);
    expect(stats.winRate).toBe(100);
  });

  it('active games do not count in stats', () => {
    addCompletedGame(['Alice', 'Bob'], [100, 80], 'Alice', false, 'active');
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.gamesWon).toBe(0);
    expect(stats.gamesLost).toBe(0);
  });

  it('abandoned games without winner do not count as wins or losses', () => {
    addCompletedGame(['Alice', 'Bob'], [30, 30], null, false, 'abandoned');
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.gamesWon).toBe(0);
    expect(stats.gamesLost).toBe(0);
  });

  it('case-insensitive name matching', () => {
    addCompletedGame(['alice', 'bob'], [100, 80], 'Alice', false);
    const stats = computeStats('ALICE');
    expect(stats.gamesWon).toBe(1);
  });

  it('win rate with mixed results', () => {
    addCompletedGame(['Alice', 'Bob'], [100, 80], 'Alice', false);
    addCompletedGame(['Alice', 'Bob'], [60, 120], 'Bob', false);
    addCompletedGame(['Alice', 'Bob'], [110, 90], 'Alice', false);
    const stats = computeStats('Alice');
    expect(stats.gamesPlayed).toBe(3);
    expect(stats.gamesWon).toBe(2);
    expect(stats.gamesLost).toBe(1);
    expect(stats.winRate).toBe(67);
  });
});
