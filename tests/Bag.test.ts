import { describe, it, expect, beforeEach } from 'vitest';
import { Bag } from '../src/game/Bag.js';
import { resetTileCounter } from '../src/data/tileDistribution.js';

describe('Bag', () => {
  let bag: Bag;

  beforeEach(() => {
    resetTileCounter();
    bag = new Bag();
  });

  it('starts with 100 tiles', () => {
    expect(bag.remainingCount).toBe(100);
  });

  it('draws tiles correctly', () => {
    const tiles = bag.draw(7);
    expect(tiles.length).toBe(7);
    expect(bag.remainingCount).toBe(93);
  });

  it('returns fewer tiles when bag is low', () => {
    const drawn = bag.draw(100);
    expect(drawn.length).toBe(100);
    expect(bag.remainingCount).toBe(0);
    expect(bag.isEmpty()).toBe(true);

    const more = bag.draw(5);
    expect(more.length).toBe(0);
  });

  it('returned tiles go back into the bag', () => {
    const drawn = bag.draw(10);
    const ids = drawn.map((t) => t.id);
    bag.returnTiles(ids);
    expect(bag.remainingCount).toBe(100);
  });

  it('returned tiles can be drawn again', () => {
    const drawn = bag.draw(90);
    expect(bag.remainingCount).toBe(10);

    const ids = drawn.slice(0, 5).map((t) => t.id);
    bag.returnTiles(ids);
    expect(bag.remainingCount).toBe(15);

    const redrawn = bag.draw(5);
    expect(redrawn.length).toBe(5);
    expect(bag.remainingCount).toBe(10);
  });

  it('tiles drawn are unique (no duplicates)', () => {
    const drawn = bag.draw(50);
    const ids = new Set(drawn.map((t) => t.id));
    expect(ids.size).toBe(50);
  });

  it('shuffles tiles (statistically likely different order)', () => {
    // This is probabilistic but with 100 tiles and Fisher-Yates,
    // the chance of two draws being identical is negligible
    const bag2 = new Bag();
    const d1 = bag.draw(100);
    const d2 = bag2.draw(100);
    const sameOrder = d1.every((t, i) => t.id === d2[i]!.id);
    expect(sameOrder).toBe(false);
  });
});
