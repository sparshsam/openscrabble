/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createActiveGameRecord,
  getGameById,
  loadAllGames,
  clearAllGameRecords,
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
