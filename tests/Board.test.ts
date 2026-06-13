import { describe, it, expect, beforeEach } from 'vitest';
import { Board, getPremiumType, CENTER } from '../src/game/Board.js';
import type { Tile } from '../src/types.js';

function makeTile(letter: string, points: number, id: string): Tile {
  return { letter, points, id };
}

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it('has 15×15 dimensions', () => {
    expect(board.size).toBe(15);
    // All cells accessible
    expect(board.getTile(0, 0)).toBeNull();
    expect(board.getTile(14, 14)).toBeNull();
  });

  it('returns null for out-of-bounds positions', () => {
    expect(board.getTile(-1, 0)).toBeNull();
    expect(board.getTile(0, 15)).toBeNull();
    expect(board.getTile(15, 15)).toBeNull();
  });

  it('places and retrieves tiles', () => {
    const tile = makeTile('A', 1, 'test-1');
    board.placeTile(tile, 7, 7);
    const retrieved = board.getTile(7, 7);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.letter).toBe('A');
    expect(board.isOccupied(7, 7)).toBe(true);
  });

  it('removes tiles', () => {
    const tile = makeTile('B', 3, 'test-2');
    board.placeTile(tile, 0, 0);
    const removed = board.removeTile(0, 0);
    expect(removed).not.toBeNull();
    expect(removed!.letter).toBe('B');
    expect(board.isOccupied(0, 0)).toBe(false);
  });

  it('detects empty board', () => {
    expect(board.hasTiles()).toBe(false);
    board.placeTile(makeTile('A', 1, 't1'), 0, 0);
    expect(board.hasTiles()).toBe(true);
  });

  it('detects center occupancy', () => {
    expect(board.isCenterOccupied()).toBe(false);
    board.placeTile(makeTile('A', 1, 't1'), CENTER.row, CENTER.col);
    expect(board.isCenterOccupied()).toBe(true);
  });

  it('returns all placed tiles', () => {
    board.placeTile(makeTile('A', 1, 't1'), 0, 0);
    board.placeTile(makeTile('B', 3, 't2'), 7, 7);
    board.placeTile(makeTile('C', 3, 't3'), 14, 14);

    const all = board.getAllPlacedTiles();
    expect(all.length).toBe(3);
    expect(all.find((t) => t.row === 0 && t.col === 0)!.letter).toBe('A');
  });

  it('provides correct premium squares', () => {
    // Center
    expect(getPremiumType(7, 7)).toBe('dw');
    // Corners
    expect(getPremiumType(0, 0)).toBe('tw');
    expect(getPremiumType(0, 14)).toBe('tw');
    expect(getPremiumType(14, 0)).toBe('tw');
    expect(getPremiumType(14, 14)).toBe('tw');
    // TLS
    expect(getPremiumType(1, 5)).toBe('tl');
    expect(getPremiumType(5, 1)).toBe('tl');
    // Regular cell
    expect(getPremiumType(4, 5)).toBeNull();
  });

  describe('findWords', () => {
    it('finds a horizontal word', () => {
      const t1 = makeTile('C', 3, 't1');
      const t2 = makeTile('A', 1, 't2');
      const t3 = makeTile('T', 1, 't3');

      board.placeTile(t1, 7, 7);
      board.placeTile(t2, 7, 8);
      board.placeTile(t3, 7, 9);

      const placed = [
        { ...t1, row: 7, col: 7 },
        { ...t2, row: 7, col: 8 },
        { ...t3, row: 7, col: 9 },
      ];

      const words = board.findWords(placed);
      expect(words.length).toBe(1);
      expect(words[0]!.word).toBe('CAT');
    });

    it('finds a vertical word', () => {
      board.placeTile(makeTile('D', 2, 't1'), 7, 7);
      board.placeTile(makeTile('O', 1, 't2'), 8, 7);
      board.placeTile(makeTile('G', 2, 't3'), 9, 7);

      const placed = [
        { ...makeTile('D', 2, 't1'), row: 7, col: 7 },
        { ...makeTile('O', 1, 't2'), row: 8, col: 7 },
        { ...makeTile('G', 2, 't3'), row: 9, col: 7 },
      ];

      const words = board.findWords(placed);
      expect(words.length).toBe(1);
      expect(words[0]!.word).toBe('DOG');
    });

    it('finds cross-words from a single new tile', () => {
      // Place horizontal word: C A T at (7,7)-(7,9)
      board.placeTile(makeTile('C', 3, 't1'), 7, 7);
      board.placeTile(makeTile('A', 1, 't2'), 7, 8);
      board.placeTile(makeTile('T', 1, 't3'), 7, 9);

      // Now place a new word going down from A at (7,8): A R E
      // t_ at (7,8) is already there, so we place R at (8,8), E at (9,8)
      board.placeTile(makeTile('R', 1, 't4'), 8, 8);
      board.placeTile(makeTile('E', 1, 't5'), 9, 8);

      // The new tiles placed are R and E going down
      const placed = [
        { ...makeTile('R', 1, 't4'), row: 8, col: 8 },
        { ...makeTile('E', 1, 't5'), row: 9, col: 8 },
      ];

      const words = board.findWords(placed);
      // Should find: ARE (vertical) and RE (horizontal? no, R and E don't form a horizontal word alone)
      // Actually R and E are at (8,8) and (9,8) - vertical. The tile at (7,8) is A.
      // So vertical word is A(7,8) R(8,8) E(9,8) = "ARE"
      // Horizontal check at each tile:
      // R at (8,8): check horizontal - no adjacent tiles -> no cross word
      // E at (9,8): check horizontal - no adjacent tiles -> no cross word
      expect(words.length).toBe(1);
      expect(words[0]!.word).toBe('ARE');
    });

    it('handles single tile played with adjacent tiles forming cross-word', () => {
      // Place H at (7,7)
      board.placeTile(makeTile('H', 4, 't1'), 7, 7);
      // Place I at (8,7)
      board.placeTile(makeTile('I', 1, 't2'), 8, 7);

      // Now place S at (9,7) as a single tile
      board.placeTile(makeTile('S', 1, 't3'), 9, 7);

      const placed = [{ ...makeTile('S', 1, 't3'), row: 9, col: 7 }];
      const words = board.findWords(placed);
      // Should find: HIS (H I S vertical)
      expect(words.length).toBe(1);
      expect(words[0]!.word).toBe('HIS');
    });
  });

  it('loads grid state', () => {
    const tile = makeTile('Z', 10, 'z1');
    board.placeTile(tile, 0, 0);
    const grid = board.getGrid();
    expect(grid[0]![0]!.letter).toBe('Z');

    const newBoard = new Board();
    newBoard.loadGrid(grid);
    expect(newBoard.getTile(0, 0)!.letter).toBe('Z');
  });
});
