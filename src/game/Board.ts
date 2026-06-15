import type { Tile, Position, PlacedTile, PremiumType, WordResult, Direction } from '../types.js';

const BOARD_SIZE = 15;

/**
 * Premium square definitions matching standard Scrabble layout.
 * Key: "row,col" => premium type
 */
const PREMIUM_SQUARES: Record<string, PremiumType> = {};

// Triple Word Score
const TWS: [number, number][] = [
  [0,0],[0,7],[0,14],
  [7,0],[7,14],
  [14,0],[14,7],[14,14],
];
// Double Word Score
const DWS: [number, number][] = [
  [1,1],[2,2],[3,3],[4,4],
  [1,13],[2,12],[3,11],[4,10],
  [13,1],[12,2],[11,3],[10,4],
  [13,13],[12,12],[11,11],[10,10],
  [7,7], // center star
];
// Triple Letter Score
const TLS: [number, number][] = [
  [1,5],[1,9],
  [5,1],[5,5],[5,9],[5,13],
  [9,1],[9,5],[9,9],[9,13],
  [13,5],[13,9],
];
// Double Letter Score
const DLS: [number, number][] = [
  [0,3],[0,11],
  [2,6],[2,8],
  [3,0],[3,7],[3,14],
  [6,2],[6,6],[6,8],[6,12],
  [7,3],[7,11],
  [8,2],[8,6],[8,8],[8,12],
  [11,0],[11,7],[11,14],
  [12,6],[12,8],
  [14,3],[14,11],
];

for (const [r, c] of TWS) PREMIUM_SQUARES[`${r},${c}`] = 'tw';
for (const [r, c] of DWS) PREMIUM_SQUARES[`${r},${c}`] = 'dw';
for (const [r, c] of TLS) PREMIUM_SQUARES[`${r},${c}`] = 'tl';
for (const [r, c] of DLS) PREMIUM_SQUARES[`${r},${c}`] = 'dl';

export function getPremiumType(row: number, col: number): PremiumType {
  return PREMIUM_SQUARES[`${row},${col}`] ?? null;
}

export const CENTER = { row: 7, col: 7 };

/**
 * The 15×15 Scrabble board.
 */
export class Board {
  private grid: (Tile | null)[][];
  private premiumUsed: boolean[][];

  constructor() {
    this.grid = Array.from({ length: BOARD_SIZE }, () =>
      Array.from<Tile | null>({ length: BOARD_SIZE }).fill(null)
    );
    this.premiumUsed = Array.from({ length: BOARD_SIZE }, () =>
      Array.from<boolean>({ length: BOARD_SIZE }).fill(false)
    );
  }

  get size(): number {
    return BOARD_SIZE;
  }

  getTile(row: number, col: number): Tile | null {
    if (!this.isInBounds(row, col)) return null;
    return this.grid[row]![col] ?? null;
  }

  placeTile(tile: Tile, row: number, col: number): void {
    const rowArr = this.grid[row];
    if (rowArr) rowArr[col] = tile;
  }

  removeTile(row: number, col: number): Tile | null {
    const rowArr = this.grid[row];
    if (!rowArr) return null;
    const tile = rowArr[col] ?? null;
    rowArr[col] = null;
    return tile;
  }

  isOccupied(row: number, col: number): boolean {
    return this.isInBounds(row, col) && (this.grid[row]![col] ?? null) !== null;
  }

  isCenterOccupied(): boolean {
    const rowArr = this.grid[CENTER.row];
    return rowArr ? rowArr[CENTER.col] !== null : false;
  }

  hasTiles(): boolean {
    return this.grid.some((r) => r !== undefined && r.some((cell) => cell !== null));
  }

  isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  isPremiumUsed(row: number, col: number): boolean {
    return this.premiumUsed[row]![col]!;
  }

  markPremiumUsed(row: number, col: number): void {
    this.premiumUsed[row]![col] = true;
  }

  getAllPlacedTiles(): PlacedTile[] {
    const tiles: PlacedTile[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = this.grid[r]![c];
        if (tile) {
          tiles.push({ ...tile, row: r, col: c });
        }
      }
    }
    return tiles;
  }

  /**
   * Given newly placed tiles, find all words formed.
   */
  findWords(placed: PlacedTile[]): WordResult[] {
    if (placed.length === 0) return [];
    const words: WordResult[] = [];

    const rows = new Set(placed.map((t) => t.row));
    const cols = new Set(placed.map((t) => t.col));

    // Determine primary direction by looking at tile layout
    // If all tiles share same row => horizontal play
    // If all tiles share same col => vertical play
    // For a single tile play, check both directions for cross-words only
    const isHorizontal = rows.size === 1;

    // Main word(s): if horizontal, extract words per unique row
    if (isHorizontal) {
      for (const row of rows) {
        const rowTiles = placed.filter((t) => t.row === row);
        const minCol = Math.min(...rowTiles.map((t) => t.col));
        const maxCol = Math.max(...rowTiles.map((t) => t.col));
        const word = this.extractWordAcross(row, minCol, maxCol);
        if (word && word.tiles.length >= 2) {
          words.push(word);
        }
      }
    } else {
      for (const col of cols) {
        const colTiles = placed.filter((t) => t.col === col);
        const minRow = Math.min(...colTiles.map((t) => t.row));
        const maxRow = Math.max(...colTiles.map((t) => t.row));
        const word = this.extractWordDown(col, minRow, maxRow);
        if (word && word.tiles.length >= 2) {
          words.push(word);
        }
      }
    }

    // Cross-words at each placed tile
    for (const tile of placed) {
      if (isHorizontal) {
        const crosses = this.extractCrossWordsDown(tile.row, tile.col);
        for (const w of crosses) {
          if (w.tiles.length >= 2 && !this.isDuplicateWord(words, w)) {
            words.push(w);
          }
        }
      } else {
        const crosses = this.extractCrossWordsAcross(tile.row, tile.col);
        for (const w of crosses) {
          if (w.tiles.length >= 2 && !this.isDuplicateWord(words, w)) {
            words.push(w);
          }
        }
      }
    }

    return words;
  }

  /** Extract a horizontal word expanding from a placed region */
  private extractWordAcross(row: number, minCol: number, maxCol: number): WordResult | null {
    let start = minCol;
    let end = maxCol;
    while (start - 1 >= 0 && this.grid[row]![start - 1]) start--;
    while (end + 1 < BOARD_SIZE && this.grid[row]![end + 1]) end++;
    return this.readWordAcross(row, start, end);
  }

  /** Extract a vertical word expanding from a placed region */
  private extractWordDown(col: number, minRow: number, maxRow: number): WordResult | null {
    let start = minRow;
    let end = maxRow;
    while (start - 1 >= 0 && this.grid[start - 1]![col]) start--;
    while (end + 1 < BOARD_SIZE && this.grid[end + 1]![col]) end++;
    return this.readWordDown(col, start, end);
  }

  /** Read a horizontal word between two columns */
  private readWordAcross(row: number, startCol: number, endCol: number): WordResult | null {
    const tiles: PlacedTile[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const t = this.grid[row]![c];
      if (t) tiles.push({ ...t, row, col: c });
    }
    if (tiles.length < 2) return null;
    return this.tilesToWord(tiles);
  }

  /** Read a vertical word between two rows */
  private readWordDown(col: number, startRow: number, endRow: number): WordResult | null {
    const tiles: PlacedTile[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const t = this.grid[r]![col];
      if (t) tiles.push({ ...t, row: r, col });
    }
    if (tiles.length < 2) return null;
    return this.tilesToWord(tiles);
  }

  /** Find cross-words going vertically from a new tile placed at (row, col) */
  private extractCrossWordsDown(row: number, col: number): WordResult[] {
    const results: WordResult[] = [];
    // Check if there are adjacent tiles vertically
    const hasUp = row - 1 >= 0 && this.grid[row - 1]![col];
    const hasDown = row + 1 < BOARD_SIZE && this.grid[row + 1]![col];
    if (!hasUp && !hasDown) return results;

    let start = row;
    let end = row;
    while (start - 1 >= 0 && this.grid[start - 1]![col]) start--;
    while (end + 1 < BOARD_SIZE && this.grid[end + 1]![col]) end++;
    const word = this.readWordDown(col, start, end);
    if (word) results.push(word);
    return results;
  }

  /** Find cross-words going horizontally from a new tile placed at (row, col) */
  private extractCrossWordsAcross(row: number, col: number): WordResult[] {
    const results: WordResult[] = [];
    const hasLeft = col - 1 >= 0 && this.grid[row]![col - 1];
    const hasRight = col + 1 < BOARD_SIZE && this.grid[row]![col + 1];
    if (!hasLeft && !hasRight) return results;

    let start = col;
    let end = col;
    while (start - 1 >= 0 && this.grid[row]![start - 1]) start--;
    while (end + 1 < BOARD_SIZE && this.grid[row]![end + 1]) end++;
    const word = this.readWordAcross(row, start, end);
    if (word) results.push(word);
    return results;
  }

  private tilesToWord(tiles: PlacedTile[]): WordResult {
    tiles.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    const word = tiles.map((t) => t.playedAs ?? t.letter).join('');
    return { tiles, score: 0, word };
  }

  private isDuplicateWord(words: WordResult[], candidate: WordResult): boolean {
    return words.some(
      (w) => w.word === candidate.word &&
        w.tiles.length === candidate.tiles.length &&
        w.tiles.every((t, i) => t.row === candidate.tiles[i]!.row && t.col === candidate.tiles[i]!.col)
    );
  }

  getGrid(): (Tile | null)[][] {
    return this.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  loadGrid(grid: (Tile | null)[][]): void {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.grid[r]![c] = grid[r]![c] ? { ...grid[r]![c]! } : null;
      }
    }
  }

  /** Reset all premium-used flags (for undo) */
  clearPremiumUsed(): void {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.premiumUsed[r]![c] = false;
      }
    }
  }
}

export { BOARD_SIZE };
