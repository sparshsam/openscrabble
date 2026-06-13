import { describe, it, expect, beforeEach } from 'vitest';
import { createTileSet, resetTileCounter, TILE_DATA } from '../src/data/tileDistribution.js';

describe('Tile Distribution', () => {
  beforeEach(() => {
    resetTileCounter();
  });

  it('creates exactly 100 tiles', () => {
    const tiles = createTileSet();
    expect(tiles.length).toBe(100);
  });

  it('creates correct number of each letter', () => {
    const tiles = createTileSet();
    for (const entry of TILE_DATA) {
      const count = tiles.filter((t) => t.letter === entry.letter).length;
      expect(count).toBe(entry.count);
    }
  });

  it('gives each tile a unique id', () => {
    const tiles = createTileSet();
    const ids = new Set(tiles.map((t) => t.id));
    expect(ids.size).toBe(100);
  });

  it('assigns correct point values', () => {
    const tiles = createTileSet();
    for (const entry of TILE_DATA) {
      for (const tile of tiles.filter((t) => t.letter === entry.letter)) {
        expect(tile.points).toBe(entry.points);
      }
    }
  });

  it('marks blank tiles correctly', () => {
    const tiles = createTileSet();
    const blanks = tiles.filter((t) => t.isBlank);
    expect(blanks.length).toBe(2);
    for (const blank of blanks) {
      expect(blank.letter).toBe('');
      expect(blank.points).toBe(0);
      expect(blank.isBlank).toBe(true);
    }
  });

  it('resets counter on each call', () => {
    const t1 = createTileSet();
    const t2 = createTileSet();
    // IDs should be sequential from 0 again
    expect(t2[0]!.id).toBe('tile-0');
  });
});
