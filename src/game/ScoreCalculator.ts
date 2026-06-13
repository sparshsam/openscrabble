import type { PlacedTile, WordResult, PremiumType } from '../types.js';
import { getPremiumType } from './Board.js';

/**
 * Calculates Scrabble scores following official rules.
 * - Letter premium squares multiply individual letter values (before word mult)
 * - Word premium squares multiply the total word value
 * - Premium squares only count on the first use
 * - Bingo bonus: +50 points if all 7 tiles are placed in one turn
 */
export class ScoreCalculator {
  /**
   * Calculate the score for a set of formed words.
   * Only the first word is checked for letter/word premium multipliers
   * for the newly placed tiles. Cross-words use only letter premiums
   * (word premiums only apply to the main word direction).
   *
   * Actually, in official Scrabble rules:
   * - Each word formed gets scored separately
   * - Premium squares apply to each word they're in
   * - Letter premium counts once (first use)
   * - Word premium counts once per word
   * - All word premiums stack multiplicatively
   */
  static calculate(words: WordResult[], totalTilesPlaced: number, premiumUsed: (row: number, col: number) => boolean): number {
    let totalScore = 0;

    for (const word of words) {
      totalScore += this.scoreWord(word, premiumUsed);
    }

    // Bingo bonus
    if (totalTilesPlaced >= 7) {
      totalScore += 50;
    }

    return totalScore;
  }

  private static scoreWord(word: WordResult, premiumUsed: (row: number, col: number) => boolean): number {
    let letterSum = 0;
    let wordMultiplier = 1;

    for (const tile of word.tiles) {
      const premium = getPremiumType(tile.row, tile.col);
      let letterValue = tile.points;

      // Apply letter premium only if not already used
      if (premium && !premiumUsed(tile.row, tile.col)) {
        if (premium === 'dl') {
          letterValue = tile.points * 2;
        } else if (premium === 'tl') {
          letterValue = tile.points * 3;
        } else if (premium === 'dw' || premium === 'tw') {
          // Word premium handled below
        }
      }

      letterSum += letterValue;

      // Track word-level multipliers separately
      if (premium && !premiumUsed(tile.row, tile.col)) {
        if (premium === 'dw') {
          wordMultiplier *= 2;
        } else if (premium === 'tw') {
          wordMultiplier *= 3;
        }
      }
    }

    return letterSum * wordMultiplier;
  }

  /**
   * Validate a placement against official rules:
   * - Must be in a straight line (all same row or all same column)
   * - Tiles must be contiguous
   * - At least one tile must be adjacent to an existing tile (or cover center for first move)
   * - All placed tiles must be in the same continuous line
   */
  static validatePlacement(
    tiles: PlacedTile[],
    hasExistingTiles: boolean,
    centerOccupied: boolean,
    isInBounds: (r: number, c: number) => boolean,
    isOccupied: (r: number, c: number) => boolean
  ): string | null {
    if (tiles.length === 0) return 'No tiles placed';

    // Must be in a straight line
    const rows = new Set(tiles.map((t) => t.row));
    const cols = new Set(tiles.map((t) => t.col));

    if (rows.size > 1 && cols.size > 1) {
      return 'Tiles must be placed in a straight line';
    }

    // Check bounds
    for (const t of tiles) {
      if (!isInBounds(t.row, t.col)) {
        return 'Tile placed out of bounds';
      }
    }

    // First move must cover center (7,7)
    if (!hasExistingTiles) {
      if (!tiles.some((t) => t.row === 7 && t.col === 7)) {
        return 'First word must cover the center square (7,7)';
      }
    }

    // New tiles must be contiguous (no gaps)
    if (rows.size === 1) {
      const row = tiles[0]!.row;
      const sorted = [...new Set(tiles.map((t) => t.col))].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1]! - sorted[i]! - 1;
        // Gaps filled by existing tiles are OK
        for (let c = sorted[i]! + 1; c < sorted[i + 1]!; c++) {
          if (!isOccupied(row, c)) {
            return 'Tiles must be placed contiguously';
          }
        }
      }
    } else {
      const col = tiles[0]!.col;
      const sorted = [...new Set(tiles.map((t) => t.row))].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        for (let r = sorted[i]! + 1; r < sorted[i + 1]!; r++) {
          if (!isOccupied(r, col)) {
            return 'Tiles must be placed contiguously';
          }
        }
      }
    }

    // Tiles must connect to existing tiles (or be the first move)
    if (hasExistingTiles) {
      const connects = tiles.some((t) => {
        // Check adjacent cells
        return (
          isOccupied(t.row - 1, t.col) ||
          isOccupied(t.row + 1, t.col) ||
          isOccupied(t.row, t.col - 1) ||
          isOccupied(t.row, t.col + 1)
        );
      });
      if (!connects) {
        return 'Word must connect to existing tiles on the board';
      }
    }

    return null; // valid
  }
}
