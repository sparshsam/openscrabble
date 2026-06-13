import type { Tile } from '../types.js';
import { createTileSet } from '../data/tileDistribution.js';

/**
 * Manages the tile bag: shuffling, drawing, and tracking remaining tiles.
 */
export class Bag {
  private tiles: Map<string, Tile> = new Map();
  private remainingIds: string[] = [];
  private drawnCount = 0;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const tileSet = createTileSet();
    this.tiles.clear();
    for (const tile of tileSet) {
      this.tiles.set(tile.id, tile);
    }
    this.remainingIds = tileSet.map((t) => t.id);
    this.shuffle();
    this.drawnCount = 0;
  }

  /** Fisher-Yates shuffle */
  private shuffle(): void {
    for (let i = this.remainingIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.remainingIds[i], this.remainingIds[j]] = [this.remainingIds[j]!, this.remainingIds[i]!];
    }
  }

  /** Draw `count` tiles from the bag. Returns what's available. */
  draw(count: number): Tile[] {
    const drawn: Tile[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.remainingIds.shift();
      if (!id) break;
      const tile = this.tiles.get(id);
      if (tile) {
        drawn.push({ ...tile });
        this.drawnCount++;
      }
    }
    return drawn;
  }

  /** Return tiles back into the bag and reshuffle */
  returnTiles(tileIds: string[]): void {
    for (const id of tileIds) {
      if (this.tiles.has(id)) {
        this.remainingIds.push(id);
      }
    }
    this.shuffle();
  }

  /** Return tiles by Tile objects */
  returnTilesByTile(tiles: Tile[]): void {
    this.returnTiles(tiles.map((t) => t.id));
  }

  get remainingCount(): number {
    return this.remainingIds.length;
  }

  get totalDrawn(): number {
    return this.drawnCount;
  }

  isEmpty(): boolean {
    return this.remainingIds.length === 0;
  }

  /** Snapshot of remaining tile IDs (for serialization) */
  getRemainingIds(): string[] {
    return [...this.remainingIds];
  }

  /** Reset the bag entirely */
  reset(): void {
    this.initialize();
  }
}
