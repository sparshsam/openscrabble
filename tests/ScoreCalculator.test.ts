import { describe, it, expect } from 'vitest';
import { ScoreCalculator } from '../src/game/ScoreCalculator.js';
import type { WordResult, PlacedTile } from '../src/types.js';

function makePlacedTile(letter: string, points: number, id: string, row: number, col: number): PlacedTile {
  return { letter, points, id, row, col };
}

describe('ScoreCalculator', () => {
  const noPremiumUsed = () => false;
  const allPremiumUsed = () => true;

  describe('calculate', () => {
    it('scores a simple word with no premiums', () => {
      const tiles = [
        makePlacedTile('C', 3, 't1', 5, 5),
        makePlacedTile('A', 1, 't2', 5, 6),
        makePlacedTile('T', 1, 't3', 5, 7),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'CAT' }];
      const score = ScoreCalculator.calculate(words, 3, noPremiumUsed);
      expect(score).toBe(11); // (5,5)=TL → C=3*3=9, A=1, T=1
    });

    it('scores with double letter premium', () => {
      // DLS at (7,3) 
      const tiles = [
        makePlacedTile('C', 3, 't1', 7, 2),
        makePlacedTile('A', 1, 't2', 7, 3), // DL at (7,3) -> 1*2=2
        makePlacedTile('T', 1, 't3', 7, 4),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'CAT' }];
      const score = ScoreCalculator.calculate(words, 3, noPremiumUsed);
      expect(score).toBe(6); // 3 + 2 + 1
    });

    it('scores with triple letter premium', () => {
      // TLS at (1,5)
      const tiles = [
        makePlacedTile('J', 8, 't1', 1, 5), // TL -> 8*3=24
        makePlacedTile('A', 1, 't2', 1, 6),
        makePlacedTile('M', 3, 't3', 1, 7),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'JAM' }];
      const score = ScoreCalculator.calculate(words, 3, noPremiumUsed);
      expect(score).toBe(28); // 24 + 1 + 3
    });

    it('scores with double word premium', () => {
      // DWS at (1,1) 
      const tiles = [
        makePlacedTile('H', 4, 't1', 1, 1), // DW at (1,1)
        makePlacedTile('I', 1, 't2', 1, 2),
        makePlacedTile('T', 1, 't3', 1, 3),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'HIT' }];
      const score = ScoreCalculator.calculate(words, 3, noPremiumUsed);
      expect(score).toBe(12); // (4+1+1)*2
    });

    it('scores with triple word premium', () => {
      // TWS at (0,0)
      const tiles = [
        makePlacedTile('A', 1, 't1', 0, 0), // TW
        makePlacedTile('X', 8, 't2', 0, 1),
        makePlacedTile('E', 1, 't3', 0, 2),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'AXE' }];
      const score = ScoreCalculator.calculate(words, 3, noPremiumUsed);
      expect(score).toBe(30); // (1+8+1)*3
    });

    it('adds bingo bonus for 7 tiles', () => {
      // Use non-premium positions: row 5, cols 3-9
      const tiles = Array.from({ length: 7 }, (_, i) =>
        makePlacedTile(String.fromCharCode(65 + i), 1, `t${i}`, 5, 3 + i)
      );
      const words: WordResult[] = [{ tiles, score: 0, word: 'ABCDEFG' }];
      const score = ScoreCalculator.calculate(words, 7, noPremiumUsed);
      expect(score).toBe(61); // (5,5) TL & (5,9) TL → 11 letter sum + 50 bingo
    });

    it('does not reuse premium squares', () => {
      const tiles = [
        makePlacedTile('A', 1, 't1', 7, 7), // DW at center
        makePlacedTile('T', 1, 't2', 7, 8),
      ];
      const words: WordResult[] = [{ tiles, score: 0, word: 'AT' }];
      // Premium already used - no multiplier
      const score = ScoreCalculator.calculate(words, 2, allPremiumUsed);
      expect(score).toBe(2); // 1+1, no DW
    });

    it('scores multiple words', () => {
      const word1: WordResult = {
        tiles: [
          makePlacedTile('A', 1, 't1', 5, 5),
          makePlacedTile('T', 1, 't2', 5, 6),
        ],
        score: 0,
        word: 'AT',
      };
      const word2: WordResult = {
        tiles: [
          makePlacedTile('A', 1, 't1', 5, 5),
          makePlacedTile('R', 1, 't3', 6, 5),
          makePlacedTile('E', 1, 't4', 7, 5),
        ],
        score: 0,
        word: 'ARE',
      };
      const score = ScoreCalculator.calculate([word1, word2], 4, noPremiumUsed);
      expect(score).toBe(9); // A in both words at (5,5)=TL
    });
  });

  describe('validatePlacement', () => {
    it('rejects empty placement', () => {
      const result = ScoreCalculator.validatePlacement([], true, true, () => true, () => false);
      expect(result).toBe('No tiles placed');
    });

    it('rejects non-linear placement', () => {
      const tiles = [
        makePlacedTile('A', 1, 't1', 7, 7),
        makePlacedTile('B', 3, 't2', 8, 8),
      ];
      const result = ScoreCalculator.validatePlacement(tiles, false, false, () => true, () => false);
      expect(result).toBe('Tiles must be placed in a straight line');
    });

    it('requires center on first move', () => {
      const tiles = [
        makePlacedTile('A', 1, 't1', 0, 0),
        makePlacedTile('B', 3, 't2', 0, 1),
      ];
      const result = ScoreCalculator.validatePlacement(tiles, false, false, () => true, () => false);
      expect(result).toBe('First word must cover the center square (7,7)');
    });

    it('accepts valid first move across center', () => {
      const tiles = [
        makePlacedTile('C', 3, 't1', 7, 6),
        makePlacedTile('A', 1, 't2', 7, 7),
        makePlacedTile('T', 1, 't3', 7, 8),
      ];
      const result = ScoreCalculator.validatePlacement(tiles, false, false, () => true, () => false);
      expect(result).toBeNull();
    });

    it('rejects tiles not connecting to existing tiles', () => {
      const tiles = [
        makePlacedTile('D', 2, 't1', 0, 0),
        makePlacedTile('O', 1, 't2', 0, 1),
        makePlacedTile('G', 2, 't3', 0, 2),
      ];
      // Board has tiles elsewhere but this placement doesn't connect
      const occupied = (r: number, c: number) => r === 7 && c === 7;
      const result = ScoreCalculator.validatePlacement(tiles, true, true, () => true, occupied);
      expect(result).toBe('Word must connect to existing tiles on the board');
    });

    it('accepts valid connecting placement', () => {
      const tiles = [
        makePlacedTile('D', 2, 't1', 7, 8),
        makePlacedTile('O', 1, 't2', 7, 9),
        makePlacedTile('G', 2, 't3', 7, 10),
      ];
      // Existing tile at (7,7) - connects via adjacency
      const occupied = (r: number, c: number) => r === 7 && c === 7;
      const result = ScoreCalculator.validatePlacement(tiles, true, true, () => true, occupied);
      expect(result).toBeNull();
    });

    it('rejects non-contiguous placement in a line', () => {
      const tiles = [
        makePlacedTile('C', 3, 't1', 7, 7),
        makePlacedTile('T', 1, 't2', 7, 9), // gap at 7,8
      ];
      const occupied = (r: number, c: number) => false;
      const result = ScoreCalculator.validatePlacement(tiles, false, false, () => true, occupied);
      expect(result).toBe('Tiles must be placed contiguously');
    });

    it('allows gaps filled by existing tiles', () => {
      const tiles = [
        makePlacedTile('C', 3, 't1', 7, 7),
        makePlacedTile('T', 1, 't2', 7, 9), // gap at 7,8 but filled
      ];
      const occupied = (r: number, c: number) => r === 7 && c === 8;
      const result = ScoreCalculator.validatePlacement(tiles, true, true, () => true, occupied);
      expect(result).toBeNull();
    });
  });
});
